(() => {
  "use strict";

  const database =
    typeof supabaseClient !== "undefined"
      ? supabaseClient
      : window.supabaseClient;

  const TIMEZONE_KEY = "fubaoDisplayTimezone";
  const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";

  const CATEGORY_NAMES = {
    study: "Học tập",
    work: "Công việc",
    personal: "Cá nhân",
    event: "Sự kiện",
  };

  const state = {
    userId: null,
    view: "month",
    selectedDate: getTodayKey(),
    currentMonth: null,
    currentWeekStart: null,
    events: [],
  };

  const elements = {};

  document.addEventListener("DOMContentLoaded", initializeCalendar);

  async function initializeCalendar() {
    collectElements();
    bindEvents();

    const selectedDate = dateFromKey(state.selectedDate);

    state.currentMonth = makeDate(
      selectedDate.getUTCFullYear(),
      selectedDate.getUTCMonth(),
      1
    );

    state.currentWeekStart = startOfWeek(selectedDate);

    if (!database) {
      showPageError("Không tìm thấy kết nối Supabase.");
      return;
    }

    const { data, error } = await database.auth.getUser();

    if (error || !data?.user) {
      showPageError("Bạn cần đăng nhập để xem thời gian biểu.");
      return;
    }

    state.userId = data.user.id;
    await refreshCalendar();
  }

  function collectElements() {
    const ids = [
      "calendarPreviousButton",
      "calendarNextButton",
      "calendarPeriodLabel",
      "calendarTodayButton",
      "calendarMonthView",
      "calendarMonthGrid",
      "calendarWeekView",
      "calendarWeekList",
      "calendarSelectedDateLabel",
      "calendarSelectedDayEvents",
      "calendarEmptyState",
      "calendarAddEventButton",
      "calendarEventModal",
      "calendarEventModalTitle",
      "calendarEventForm",
      "calendarEventId",
      "calendarEventTitle",
      "calendarEventDate",
      "calendarEventAllDay",
      "calendarEventTimeFields",
      "calendarEventStartTime",
      "calendarEventEndTime",
      "calendarEventCategory",
      "calendarEventReminder",
      "calendarEventNote",
      "calendarEventFormMessage",
      "calendarDeleteEventButton",
      "calendarSaveEventButton",
    ];

    ids.forEach((id) => {
      elements[id] = document.getElementById(id);
    });

    elements.viewButtons = document.querySelectorAll(
      "[data-calendar-view]"
    );

    elements.closeModalButtons = document.querySelectorAll(
      "[data-calendar-close-modal]"
    );
  }

  function bindEvents() {
    elements.calendarPreviousButton.addEventListener("click", () => {
      if (state.view === "month") {
        state.currentMonth = makeDate(
          state.currentMonth.getUTCFullYear(),
          state.currentMonth.getUTCMonth() - 1,
          1
        );

        state.selectedDate = keyFromDate(state.currentMonth);
      } else {
        state.currentWeekStart = addDays(
          state.currentWeekStart,
          -7
        );

        state.selectedDate = keyFromDate(state.currentWeekStart);
      }

      refreshCalendar();
    });

    elements.calendarNextButton.addEventListener("click", () => {
      if (state.view === "month") {
        state.currentMonth = makeDate(
          state.currentMonth.getUTCFullYear(),
          state.currentMonth.getUTCMonth() + 1,
          1
        );

        state.selectedDate = keyFromDate(state.currentMonth);
      } else {
        state.currentWeekStart = addDays(
          state.currentWeekStart,
          7
        );

        state.selectedDate = keyFromDate(state.currentWeekStart);
      }

      refreshCalendar();
    });

    elements.calendarTodayButton.addEventListener("click", () => {
      state.selectedDate = getTodayKey();

      const today = dateFromKey(state.selectedDate);

      state.currentMonth = makeDate(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        1
      );

      state.currentWeekStart = startOfWeek(today);

      refreshCalendar();
    });

    elements.viewButtons.forEach((button) => {
      button.addEventListener("click", () => {
        state.view = button.dataset.calendarView;

        const selectedDate = dateFromKey(state.selectedDate);

        if (state.view === "week") {
          state.currentWeekStart = startOfWeek(selectedDate);
        } else {
          state.currentMonth = makeDate(
            selectedDate.getUTCFullYear(),
            selectedDate.getUTCMonth(),
            1
          );
        }

        updateViewButtons();
        refreshCalendar();
      });
    });

    elements.calendarAddEventButton.addEventListener("click", () => {
      openEventModal();
    });

    elements.calendarEventAllDay.addEventListener(
      "change",
      updateTimeFields
    );

    elements.calendarEventForm.addEventListener(
      "submit",
      saveEvent
    );

    elements.calendarDeleteEventButton.addEventListener(
      "click",
      deleteEvent
    );

    elements.closeModalButtons.forEach((button) => {
      button.addEventListener("click", closeEventModal);
    });

    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        !elements.calendarEventModal.hidden
      ) {
        closeEventModal();
      }
    });
  }

  async function refreshCalendar() {
    if (!state.userId) {
      return;
    }

    setCalendarLoading(true);

    const { startKey, endKey } = getVisibleRange();

    const { data, error } = await database
      .from("tioong_events")
      .select("*")
      .eq("user_id", state.userId)
      .gte("event_date", startKey)
      .lte("event_date", endKey)
      .order("event_date", { ascending: true })
      .order("start_time", {
        ascending: true,
        nullsFirst: true,
      });

    setCalendarLoading(false);

    if (error) {
      console.error(error);
      showPageError(
        error.message || "Không thể tải thời gian biểu."
      );
      return;
    }

    state.events = data || [];
    renderCalendar();
  }

  function getVisibleRange() {
    if (state.view === "week") {
      return {
        startKey: keyFromDate(state.currentWeekStart),
        endKey: keyFromDate(
          addDays(state.currentWeekStart, 6)
        ),
      };
    }

    const firstCell = startOfWeek(state.currentMonth);

    return {
      startKey: keyFromDate(firstCell),
      endKey: keyFromDate(addDays(firstCell, 41)),
    };
  }

  function renderCalendar() {
    updatePeriodLabel();

    if (state.view === "month") {
      renderMonthView();
    } else {
      renderWeekView();
    }

    renderSelectedDay();
  }

  function updateViewButtons() {
    elements.viewButtons.forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.calendarView === state.view
      );
    });

    elements.calendarMonthView.hidden =
      state.view !== "month";

    elements.calendarWeekView.hidden =
      state.view !== "week";
  }

  function updatePeriodLabel() {
    if (state.view === "month") {
      const month = state.currentMonth.getUTCMonth() + 1;
      const year = state.currentMonth.getUTCFullYear();

      elements.calendarPeriodLabel.textContent =
        `Tháng ${month}/${year}`;

      return;
    }

    const endDate = addDays(state.currentWeekStart, 6);

    elements.calendarPeriodLabel.textContent =
      `${formatShortDate(state.currentWeekStart)} – ` +
      `${formatShortDate(endDate, true)}`;
  }

  function renderMonthView() {
    elements.calendarMonthGrid.replaceChildren();

    const firstCell = startOfWeek(state.currentMonth);
    const visibleMonth = state.currentMonth.getUTCMonth();
    const todayKey = getTodayKey();

    for (let index = 0; index < 42; index += 1) {
      const date = addDays(firstCell, index);
      const dateKey = keyFromDate(date);
      const dayEvents = eventsForDate(dateKey);

      const button = document.createElement("button");

      button.type = "button";
      button.className = "calendar-day-button";
      button.dataset.date = dateKey;

      button.classList.toggle(
        "outside-month",
        date.getUTCMonth() !== visibleMonth
      );

      button.classList.toggle(
        "today",
        dateKey === todayKey
      );

      button.classList.toggle(
        "selected",
        dateKey === state.selectedDate
      );

      const number = document.createElement("span");
      number.className = "calendar-day-number";
      number.textContent = String(date.getUTCDate());

      button.appendChild(number);

      if (dayEvents.length > 0) {
        const indicators = document.createElement("span");
        indicators.className = "calendar-day-indicators";

        dayEvents.slice(0, 3).forEach((eventItem) => {
          const dot = document.createElement("span");

          dot.className =
            `calendar-event-dot category-${eventItem.category}`;

          indicators.appendChild(dot);
        });

        button.appendChild(indicators);
      }

      button.addEventListener("click", () => {
        selectDate(dateKey);
      });

      elements.calendarMonthGrid.appendChild(button);
    }
  }

  function renderWeekView() {
    elements.calendarWeekList.replaceChildren();

    const todayKey = getTodayKey();

    for (let index = 0; index < 7; index += 1) {
      const date = addDays(state.currentWeekStart, index);
      const dateKey = keyFromDate(date);
      const dayEvents = eventsForDate(dateKey);

      const day = document.createElement("article");
      day.className = "calendar-week-day";

      day.classList.toggle(
        "today",
        dateKey === todayKey
      );

      day.classList.toggle(
        "selected",
        dateKey === state.selectedDate
      );

      const heading = document.createElement("button");

      heading.type = "button";
      heading.className = "calendar-week-day-heading";
      heading.textContent = formatWeekDay(date);

      heading.addEventListener("click", () => {
        selectDate(dateKey);
      });

      day.appendChild(heading);

      const eventContainer = document.createElement("div");
      eventContainer.className = "calendar-week-day-events";

      if (dayEvents.length === 0) {
        const emptyText = document.createElement("p");

        emptyText.className = "calendar-week-empty-text";
        emptyText.textContent = "Chưa có lịch";

        eventContainer.appendChild(emptyText);
      } else {
        dayEvents.forEach((eventItem) => {
          eventContainer.appendChild(
            createEventCard(eventItem, true)
          );
        });
      }

      day.appendChild(eventContainer);
      elements.calendarWeekList.appendChild(day);
    }
  }

  function selectDate(dateKey) {
    state.selectedDate = dateKey;

    const selectedDate = dateFromKey(dateKey);

    if (state.view === "month") {
      const selectedMonth =
        selectedDate.getUTCMonth();

      const selectedYear =
        selectedDate.getUTCFullYear();

      const isDifferentMonth =
        selectedMonth !==
          state.currentMonth.getUTCMonth() ||
        selectedYear !==
          state.currentMonth.getUTCFullYear();

      if (isDifferentMonth) {
        state.currentMonth = makeDate(
          selectedYear,
          selectedMonth,
          1
        );

        refreshCalendar();
        return;
      }
    }

    renderCalendar();
  }

  function renderSelectedDay() {
    const selectedDate =
      dateFromKey(state.selectedDate);

    const dayEvents =
      eventsForDate(state.selectedDate);

    elements.calendarSelectedDateLabel.textContent =
      formatFullDate(selectedDate);

    elements.calendarSelectedDayEvents.replaceChildren();

    elements.calendarEmptyState.hidden =
      dayEvents.length > 0;

    dayEvents.forEach((eventItem) => {
      elements.calendarSelectedDayEvents.appendChild(
        createEventCard(eventItem, false)
      );
    });
  }

  function createEventCard(eventItem, compact) {
    const button = document.createElement("button");

    button.type = "button";

    button.className =
      `calendar-event-card category-${eventItem.category}`;

    button.classList.toggle("compact", compact);

    const time = document.createElement("span");
    time.className = "calendar-event-time";

    time.textContent = eventItem.all_day
      ? "Cả ngày"
      : formatEventTime(eventItem);

    const title = document.createElement("strong");
    title.className = "calendar-event-title";
    title.textContent = eventItem.title;

    const category = document.createElement("span");
    category.className = "calendar-event-category";

    category.textContent =
      CATEGORY_NAMES[eventItem.category] || "Sự kiện";

    button.append(time, title, category);

    button.addEventListener("click", () => {
      openEventModal(eventItem);
    });

    return button;
  }

  function openEventModal(eventItem = null) {
    elements.calendarEventForm.reset();
    setFormMessage("");

    if (eventItem) {
      elements.calendarEventModalTitle.textContent =
        "Sửa lịch";

      elements.calendarEventId.value =
        eventItem.id;

      elements.calendarEventTitle.value =
        eventItem.title || "";

      elements.calendarEventDate.value =
        eventItem.event_date;

      elements.calendarEventAllDay.checked =
        Boolean(eventItem.all_day);

      elements.calendarEventStartTime.value =
        shortTime(eventItem.start_time);

      elements.calendarEventEndTime.value =
        shortTime(eventItem.end_time);

      elements.calendarEventCategory.value =
        eventItem.category || "event";

      elements.calendarEventReminder.value =
        eventItem.reminder_minutes == null
          ? ""
          : String(eventItem.reminder_minutes);

      elements.calendarEventNote.value =
        eventItem.note || "";

      elements.calendarDeleteEventButton.hidden = false;
    } else {
      elements.calendarEventModalTitle.textContent =
        "Thêm lịch";

      elements.calendarEventId.value = "";

      elements.calendarEventDate.value =
        state.selectedDate;

      elements.calendarEventStartTime.value =
        "09:00";

      elements.calendarEventEndTime.value =
        "10:00";

      elements.calendarEventCategory.value =
        "study";

      elements.calendarDeleteEventButton.hidden = true;
    }

    updateTimeFields();

    elements.calendarEventModal.hidden = false;

    document.body.classList.add(
      "calendar-modal-open"
    );

    window.setTimeout(() => {
      elements.calendarEventTitle.focus();
    }, 50);
  }

  function closeEventModal() {
    elements.calendarEventModal.hidden = true;

    document.body.classList.remove(
      "calendar-modal-open"
    );

    setFormMessage("");
  }

  function updateTimeFields() {
    const allDay =
      elements.calendarEventAllDay.checked;

    elements.calendarEventTimeFields.classList.toggle(
      "disabled",
      allDay
    );

    elements.calendarEventStartTime.disabled = allDay;
    elements.calendarEventEndTime.disabled = allDay;
  }

  async function saveEvent(event) {
    event.preventDefault();

    const title =
      elements.calendarEventTitle.value.trim();

    const eventDate =
      elements.calendarEventDate.value;

    const allDay =
      elements.calendarEventAllDay.checked;

    const startTime =
      elements.calendarEventStartTime.value;

    const endTime =
      elements.calendarEventEndTime.value;

    if (!title || !eventDate) {
      setFormMessage(
        "Bạn hãy nhập tên lịch và ngày.",
        true
      );
      return;
    }

    if (!allDay && !startTime) {
      setFormMessage(
        "Bạn hãy chọn giờ bắt đầu.",
        true
      );
      return;
    }

    if (
      !allDay &&
      endTime &&
      endTime <= startTime
    ) {
      setFormMessage(
        "Giờ kết thúc phải sau giờ bắt đầu.",
        true
      );
      return;
    }

    const reminderValue =
      elements.calendarEventReminder.value;

    const payload = {
      user_id: state.userId,
      event_date: eventDate,
      all_day: allDay,
      start_time: allDay ? null : startTime,
      end_time:
        allDay || !endTime ? null : endTime,
      timezone: getDisplayTimezone(),
      title,
      note:
        elements.calendarEventNote.value.trim() ||
        null,
      category:
        elements.calendarEventCategory.value,
      reminder_minutes: reminderValue
        ? Number(reminderValue)
        : null,
    };

    setSaving(true);

    const eventId =
      elements.calendarEventId.value;

    let result;

    if (eventId) {
      result = await database
        .from("tioong_events")
        .update(payload)
        .eq("id", eventId)
        .eq("user_id", state.userId);
    } else {
      result = await database
        .from("tioong_events")
        .insert(payload);
    }

    setSaving(false);

    if (result.error) {
      console.error(result.error);

      setFormMessage(
        result.error.message ||
          "Không thể lưu lịch.",
        true
      );

      return;
    }

    state.selectedDate = eventDate;

    const savedDate = dateFromKey(eventDate);

    state.currentMonth = makeDate(
      savedDate.getUTCFullYear(),
      savedDate.getUTCMonth(),
      1
    );

    state.currentWeekStart =
      startOfWeek(savedDate);

    closeEventModal();
    await refreshCalendar();
  }

  async function deleteEvent() {
    const eventId =
      elements.calendarEventId.value;

    if (!eventId) {
      return;
    }

    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa lịch này không?"
    );

    if (!confirmed) {
      return;
    }

    elements.calendarDeleteEventButton.disabled = true;

    const { error } = await database
      .from("tioong_events")
      .delete()
      .eq("id", eventId)
      .eq("user_id", state.userId);

    elements.calendarDeleteEventButton.disabled = false;

    if (error) {
      console.error(error);

      setFormMessage(
        error.message ||
          "Không thể xóa lịch.",
        true
      );

      return;
    }

    closeEventModal();
    await refreshCalendar();
  }

  function eventsForDate(dateKey) {
    return state.events.filter(
      (item) => item.event_date === dateKey
    );
  }

  function setSaving(saving) {
    elements.calendarSaveEventButton.disabled =
      saving;

    elements.calendarSaveEventButton.textContent =
      saving ? "Đang lưu..." : "Lưu lịch";
  }

  function setCalendarLoading(loading) {
    elements.calendarPeriodLabel.classList.toggle(
      "loading",
      loading
    );
  }

  function setFormMessage(message, isError = false) {
    elements.calendarEventFormMessage.textContent =
      message;

    elements.calendarEventFormMessage.classList.toggle(
      "error",
      isError
    );
  }

  function showPageError(message) {
    elements.calendarSelectedDayEvents.replaceChildren();
    elements.calendarEmptyState.hidden = false;

    elements.calendarEmptyState
      .querySelector("h3")
      .textContent = "Không thể tải lịch";

    elements.calendarEmptyState
      .querySelector("p")
      .textContent = message;
  }

  function formatEventTime(eventItem) {
    const start = shortTime(eventItem.start_time);
    const end = shortTime(eventItem.end_time);

    return end ? `${start}–${end}` : start;
  }

  function shortTime(value) {
    return value
      ? String(value).slice(0, 5)
      : "";
  }

  function formatFullDate(date) {
    const text = new Intl.DateTimeFormat(
      "vi-VN",
      {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      }
    ).format(date);

    return text.charAt(0).toUpperCase() +
      text.slice(1);
  }

  function formatWeekDay(date) {
    const text = new Intl.DateTimeFormat(
      "vi-VN",
      {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        timeZone: "UTC",
      }
    ).format(date);

    return text.charAt(0).toUpperCase() +
      text.slice(1);
  }

  function formatShortDate(
    date,
    includeYear = false
  ) {
    return new Intl.DateTimeFormat(
      "vi-VN",
      {
        day: "2-digit",
        month: "2-digit",
        ...(includeYear
          ? { year: "numeric" }
          : {}),
        timeZone: "UTC",
      }
    ).format(date);
  }

  function getDisplayTimezone() {
    const saved =
      localStorage.getItem(TIMEZONE_KEY);

    return saved === "Asia/Tokyo"
      ? saved
      : DEFAULT_TIMEZONE;
  }

  function getTodayKey() {
    const parts = new Intl.DateTimeFormat(
      "en-CA",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: getDisplayTimezone(),
      }
    ).formatToParts(new Date());

    const values = Object.fromEntries(
      parts
        .filter((part) => part.type !== "literal")
        .map((part) => [
          part.type,
          part.value,
        ])
    );

    return `${values.year}-${values.month}-${values.day}`;
  }

  function makeDate(year, monthIndex, day) {
    return new Date(
      Date.UTC(year, monthIndex, day)
    );
  }

  function dateFromKey(dateKey) {
    const [year, month, day] =
      dateKey.split("-").map(Number);

    return makeDate(year, month - 1, day);
  }

  function keyFromDate(date) {
    const year = date.getUTCFullYear();

    const month = String(
      date.getUTCMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getUTCDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function addDays(date, numberOfDays) {
    return makeDate(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + numberOfDays
    );
  }

  function startOfWeek(date) {
    const currentDay = date.getUTCDay();

    const mondayOffset =
      currentDay === 0
        ? -6
        : 1 - currentDay;

    return addDays(date, mondayOffset);
  }
})();