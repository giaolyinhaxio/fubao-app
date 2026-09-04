(() => {
  "use strict";

  const database =
    typeof supabaseClient !== "undefined"
      ? supabaseClient
      : window.supabaseClient;

  const TIMEZONE_KEY = "fubaoDisplayTimezone";
  const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";

  const state = {
    tasks: [],
    filter: "all",
  };

  const elements = {};

  document.addEventListener(
    "DOMContentLoaded",
    initializeTasksPage
  );

  async function initializeTasksPage() {
    collectElements();
    bindEvents();

    if (!database) {
      showPageMessage(
        "Không tìm thấy kết nối Supabase.",
        true
      );
      return;
    }

    const { data, error } =
      await database.auth.getUser();

    if (error || !data?.user) {
      showPageMessage(
        "Bạn cần đăng nhập để xem công việc.",
        true
      );
      return;
    }

    await loadTasks();
  }

  function collectElements() {
    const ids = [
      "tasksActiveCount",
      "tasksOverdueCount",
      "tasksCompletedCount",
      "taskQuadrant1Count",
      "taskQuadrant2Count",
      "taskQuadrant3Count",
      "taskQuadrant4Count",
      "taskQuadrant1List",
      "taskQuadrant2List",
      "taskQuadrant3List",
      "taskQuadrant4List",
      "taskQuadrant1Empty",
      "taskQuadrant2Empty",
      "taskQuadrant3Empty",
      "taskQuadrant4Empty",
      "tasksPageMessage",
      "tasksGlobalAddButton",
      "taskModal",
      "taskModalTitle",
      "taskForm",
      "taskId",
      "taskTitle",
      "taskQuadrant",
      "taskDueDate",
      "taskDueTime",
      "taskReminder",
      "taskNote",
      "taskFormMessage",
      "taskDeleteButton",
      "taskSaveButton",
    ];

    ids.forEach((id) => {
      elements[id] = document.getElementById(id);
    });

    elements.filterButtons =
      document.querySelectorAll(
        "[data-task-filter]"
      );

    elements.addButtons =
      document.querySelectorAll(
        "[data-add-task]"
      );

    elements.closeModalButtons =
      document.querySelectorAll(
        "[data-close-task-modal]"
      );
  }

  function bindEvents() {
    elements.filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setFilter(button.dataset.taskFilter);
      });
    });

    elements.addButtons.forEach((button) => {
      button.addEventListener("click", () => {
        openTaskModal(
          null,
          Number(button.dataset.addTask)
        );
      });
    });

    elements.tasksGlobalAddButton.addEventListener(
      "click",
      () => {
        openTaskModal(null, 2);
      }
    );

    elements.closeModalButtons.forEach((button) => {
      button.addEventListener(
        "click",
        closeTaskModal
      );
    });

    elements.taskForm.addEventListener(
      "submit",
      saveTask
    );

    elements.taskDeleteButton.addEventListener(
      "click",
      deleteTask
    );

    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        !elements.taskModal.hidden
      ) {
        closeTaskModal();
      }
    });
  }

  async function loadTasks() {
    showPageMessage("Đang tải công việc...");

    const { data, error } = await database
      .from("tioong_tasks")
      .select("*")
      .order("is_completed", {
        ascending: true,
      })
      .order("due_date", {
        ascending: true,
        nullsFirst: false,
      })
      .order("due_time", {
        ascending: true,
        nullsFirst: false,
      })
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);

      showPageMessage(
        error.message ||
          "Không thể tải công việc.",
        true
      );

      return;
    }

    state.tasks = data || [];

    showPageMessage("");
    renderTasks();
  }

  function renderTasks() {
    renderSummary();

    for (
      let quadrant = 1;
      quadrant <= 4;
      quadrant += 1
    ) {
      renderQuadrant(quadrant);
    }
  }

  function renderSummary() {
    const activeTasks = state.tasks.filter(
      (task) => !task.is_completed
    );

    const completedTasks = state.tasks.filter(
      (task) => task.is_completed
    );

    const overdueTasks = activeTasks.filter(
      isTaskOverdue
    );

    elements.tasksActiveCount.textContent =
      String(activeTasks.length);

    elements.tasksOverdueCount.textContent =
      String(overdueTasks.length);

    elements.tasksCompletedCount.textContent =
      String(completedTasks.length);
  }

  function renderQuadrant(quadrant) {
    const list =
      elements[`taskQuadrant${quadrant}List`];

    const empty =
      elements[`taskQuadrant${quadrant}Empty`];

    const count =
      elements[`taskQuadrant${quadrant}Count`];

    const visibleTasks = state.tasks
      .filter(
        (task) =>
          Number(task.quadrant) === quadrant
      )
      .filter(taskMatchesCurrentFilter)
      .sort(compareTasks);

    list.replaceChildren();

    count.textContent =
      String(visibleTasks.length);

    empty.hidden =
      visibleTasks.length > 0;

    if (state.filter === "today") {
      empty.textContent =
        "Hôm nay chưa có công việc";
    } else if (state.filter === "overdue") {
      empty.textContent =
        "Không có công việc quá hạn";
    } else if (
      state.filter === "completed"
    ) {
      empty.textContent =
        "Chưa có công việc hoàn thành";
    } else {
      empty.textContent =
        "Chưa có công việc";
    }

    visibleTasks.forEach((task) => {
      list.appendChild(createTaskCard(task));
    });
  }

  function createTaskCard(task) {
    const card =
      document.createElement("article");

    card.className = "task-card";

    card.classList.toggle(
      "completed",
      Boolean(task.is_completed)
    );

    card.classList.toggle(
      "overdue",
      isTaskOverdue(task)
    );

    const completeButton =
      document.createElement("button");

    completeButton.type = "button";
    completeButton.className =
      "task-complete-button";

    completeButton.setAttribute(
      "aria-label",
      task.is_completed
        ? "Đánh dấu chưa hoàn thành"
        : "Đánh dấu hoàn thành"
    );

    completeButton.textContent =
      task.is_completed ? "✓" : "";

    completeButton.addEventListener(
      "click",
      () => toggleTaskCompleted(task)
    );

    const contentButton =
      document.createElement("button");

    contentButton.type = "button";
    contentButton.className =
      "task-card-content";

    contentButton.addEventListener(
      "click",
      () => openTaskModal(task)
    );

    const title =
      document.createElement("strong");

    title.className = "task-card-title";
    title.textContent = task.title;

    contentButton.appendChild(title);

    const deadline =
      document.createElement("span");

    deadline.className =
      "task-card-deadline";

    deadline.textContent =
      formatDeadline(task);

    contentButton.appendChild(deadline);

    if (task.note) {
      const note =
        document.createElement("span");

      note.className = "task-card-note";
      note.textContent = task.note;

      contentButton.appendChild(note);
    }

    const arrow =
      document.createElement("span");

    arrow.className = "task-card-arrow";
    arrow.textContent = "›";

    card.append(
      completeButton,
      contentButton,
      arrow
    );

    return card;
  }

  function taskMatchesCurrentFilter(task) {
    if (state.filter === "completed") {
      return Boolean(task.is_completed);
    }

    if (task.is_completed) {
      return false;
    }

    if (state.filter === "today") {
      return (
        task.due_date ===
        getNowParts().dateKey
      );
    }

    if (state.filter === "overdue") {
      return isTaskOverdue(task);
    }

    return true;
  }

  function compareTasks(firstTask, secondTask) {
    if (
      !firstTask.due_date &&
      !secondTask.due_date
    ) {
      return (
        new Date(secondTask.created_at) -
        new Date(firstTask.created_at)
      );
    }

    if (!firstTask.due_date) {
      return 1;
    }

    if (!secondTask.due_date) {
      return -1;
    }

    const firstDeadline =
      `${firstTask.due_date} ` +
      `${shortTime(firstTask.due_time) || "23:59"}`;

    const secondDeadline =
      `${secondTask.due_date} ` +
      `${shortTime(secondTask.due_time) || "23:59"}`;

    return firstDeadline.localeCompare(
      secondDeadline
    );
  }

  function setFilter(filter) {
    state.filter = filter;

    elements.filterButtons.forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.taskFilter === filter
      );
    });

    renderTasks();
  }

  function openTaskModal(
    task = null,
    defaultQuadrant = 2
  ) {
    elements.taskForm.reset();

    setFormMessage("");

    if (task) {
      elements.taskModalTitle.textContent =
        "Sửa công việc";

      elements.taskId.value =
        task.id;

      elements.taskTitle.value =
        task.title || "";

      elements.taskQuadrant.value =
        String(task.quadrant || 2);

      elements.taskDueDate.value =
        task.due_date || "";

      elements.taskDueTime.value =
        shortTime(task.due_time);

      elements.taskReminder.value =
        task.reminder_minutes == null
          ? ""
          : String(task.reminder_minutes);

      elements.taskNote.value =
        task.note || "";

      elements.taskDeleteButton.hidden =
        false;
    } else {
      elements.taskModalTitle.textContent =
        "Thêm công việc";

      elements.taskId.value = "";

      elements.taskQuadrant.value =
        String(defaultQuadrant);

      elements.taskDeleteButton.hidden =
        true;

      if (state.filter === "today") {
        elements.taskDueDate.value =
          getNowParts().dateKey;
      }
    }

    elements.taskModal.hidden = false;

    document.body.classList.add(
      "task-modal-open"
    );

    window.setTimeout(() => {
      elements.taskTitle.focus();
    }, 50);
  }

  function closeTaskModal() {
    elements.taskModal.hidden = true;

    document.body.classList.remove(
      "task-modal-open"
    );

    setFormMessage("");
  }

  async function saveTask(event) {
    event.preventDefault();

    const title =
      elements.taskTitle.value.trim();

    const dueDate =
      elements.taskDueDate.value;

    const dueTime =
      elements.taskDueTime.value;

    const reminderValue =
      elements.taskReminder.value;

    if (!title) {
      setFormMessage(
        "Bạn hãy nhập tên công việc.",
        true
      );
      return;
    }

    if (dueTime && !dueDate) {
      setFormMessage(
        "Bạn hãy chọn ngày hết hạn trước.",
        true
      );
      return;
    }

    if (
      reminderValue &&
      (!dueDate || !dueTime)
    ) {
      setFormMessage(
        "Muốn nhận thông báo, bạn cần chọn cả ngày và giờ hết hạn.",
        true
      );
      return;
    }

    const payload = {
      title,
      note:
        elements.taskNote.value.trim() ||
        null,

      quadrant: Number(
        elements.taskQuadrant.value
      ),

      due_date:
        dueDate || null,

      due_time:
        dueDate && dueTime
          ? dueTime
          : null,

      timezone:
        getDisplayTimezone(),

      reminder_minutes:
        reminderValue
          ? Number(reminderValue)
          : null,
    };

    setSaving(true);

    const taskId =
      elements.taskId.value;

    let result;

    if (taskId) {
      result = await database
        .from("tioong_tasks")
        .update(payload)
        .eq("id", taskId);
    } else {
      result = await database
        .from("tioong_tasks")
        .insert(payload);
    }

    setSaving(false);

    if (result.error) {
      console.error(result.error);

      setFormMessage(
        result.error.message ||
          "Không thể lưu công việc.",
        true
      );

      return;
    }

    closeTaskModal();

    setFilter("all");

    await loadTasks();
  }

  async function toggleTaskCompleted(task) {
    const nextCompletedState =
      !task.is_completed;

    const { error } = await database
      .from("tioong_tasks")
      .update({
        is_completed:
          nextCompletedState,

        completed_at:
          nextCompletedState
            ? new Date().toISOString()
            : null,
      })
      .eq("id", task.id);

    if (error) {
      console.error(error);

      showPageMessage(
        error.message ||
          "Không thể cập nhật công việc.",
        true
      );

      return;
    }

    task.is_completed =
      nextCompletedState;

    task.completed_at =
      nextCompletedState
        ? new Date().toISOString()
        : null;

    renderTasks();
  }

  async function deleteTask() {
    const taskId =
      elements.taskId.value;

    if (!taskId) {
      return;
    }

    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa công việc này không?"
    );

    if (!confirmed) {
      return;
    }

    elements.taskDeleteButton.disabled =
      true;

    const { error } = await database
      .from("tioong_tasks")
      .delete()
      .eq("id", taskId);

    elements.taskDeleteButton.disabled =
      false;

    if (error) {
      console.error(error);

      setFormMessage(
        error.message ||
          "Không thể xóa công việc.",
        true
      );

      return;
    }

    closeTaskModal();

    await loadTasks();
  }

  function isTaskOverdue(task) {
    if (
      task.is_completed ||
      !task.due_date
    ) {
      return false;
    }

    const now = getNowParts();

    if (task.due_date < now.dateKey) {
      return true;
    }

    if (task.due_date > now.dateKey) {
      return false;
    }

    const taskTime =
      shortTime(task.due_time);

    return Boolean(
      taskTime &&
      taskTime < now.timeKey
    );
  }

  function formatDeadline(task) {
    if (!task.due_date) {
      return "Không thời hạn";
    }

    const todayKey =
      getNowParts().dateKey;

    let dateText;

    if (task.due_date === todayKey) {
      dateText = "Hôm nay";
    } else {
      dateText =
        new Intl.DateTimeFormat(
          "vi-VN",
          {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            timeZone: "UTC",
          }
        ).format(
          dateFromKey(task.due_date)
        );
    }

    const time =
      shortTime(task.due_time);

    const deadline = time
      ? `${dateText} · ${time}`
      : dateText;

    return isTaskOverdue(task)
      ? `Quá hạn · ${deadline}`
      : deadline;
  }

  function getDisplayTimezone() {
    const savedTimezone =
      localStorage.getItem(TIMEZONE_KEY);

    return savedTimezone === "Asia/Tokyo"
      ? savedTimezone
      : DEFAULT_TIMEZONE;
  }

  function getNowParts() {
    const parts =
      new Intl.DateTimeFormat(
        "en-US",
        {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
          timeZone:
            getDisplayTimezone(),
        }
      ).formatToParts(new Date());

    const values = Object.fromEntries(
      parts
        .filter(
          (part) =>
            part.type !== "literal"
        )
        .map((part) => [
          part.type,
          part.value,
        ])
    );

    return {
      dateKey:
        `${values.year}-` +
        `${values.month}-` +
        `${values.day}`,

      timeKey:
        `${values.hour}:` +
        `${values.minute}`,
    };
  }

  function dateFromKey(dateKey) {
    const [year, month, day] =
      dateKey.split("-").map(Number);

    return new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );
  }

  function shortTime(value) {
    return value
      ? String(value).slice(0, 5)
      : "";
  }

  function setSaving(saving) {
    elements.taskSaveButton.disabled =
      saving;

    elements.taskSaveButton.textContent =
      saving
        ? "Đang lưu..."
        : "Lưu công việc";
  }

  function setFormMessage(
    message,
    isError = false
  ) {
    elements.taskFormMessage.textContent =
      message;

    elements.taskFormMessage.classList.toggle(
      "error",
      isError
    );
  }

  function showPageMessage(
    message,
    isError = false
  ) {
    elements.tasksPageMessage.textContent =
      message;

    elements.tasksPageMessage.classList.toggle(
      "error",
      isError
    );
  }
})();