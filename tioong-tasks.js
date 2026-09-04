(() => {
  "use strict";

  const database =
    typeof supabaseClient !== "undefined"
      ? supabaseClient
      : window.supabaseClient;

  const TIMEZONE_KEY = "fubaoDisplayTimezone";
  const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";

  const PRESETS = {
    english_vocabulary: {
      title: "Học từ vựng tiếng Anh",
      quadrant: 2,
      defaultType: "daily",
      targetValue: 10,
      targetUnit: "từ",
    },

    reading: {
      title: "Đọc sách",
      quadrant: 2,
      defaultType: "daily",
      targetValue: 15,
      targetUnit: "phút",
    },

    sap: {
      title: "Học SAP",
      quadrant: 2,
      defaultType: "once",
    },

    japanese: {
      title: "Học tiếng Nhật",
      quadrant: 2,
      defaultType: "once",
    },

    catechism: {
      title: "Làm việc Ban Giáo lý",
      quadrant: 2,
      defaultType: "once",
    },

    gym: {
      title: "Tập gym",
      quadrant: 2,
      defaultType: "once",
    },

    housework: {
      title: "Việc nhà",
      quadrant: 3,
      defaultType: "once",
    },
  };

  const state = {
    tasks: [],
    routines: [],
    routineLogs: [],
    filter: "all",
  };

  const elements = {};

  document.addEventListener(
    "DOMContentLoaded",
    initializePage
  );

  async function initializePage() {
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

    await loadAllData();
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

      "dailyRoutinesSection",
      "dailyRoutinesDateLabel",
      "dailyRoutineAddButton",
      "dailyRoutineList",
      "dailyRoutineEmpty",

      "taskModal",
      "taskModalTitle",
      "taskForm",
      "taskId",
      "taskRecordType",

      "taskPreset",
      "taskCustomTitleField",
      "taskTitle",
      "taskType",
      "taskQuadrant",

      "taskTargetFields",
      "taskTargetValue",
      "taskTargetUnit",

      "taskDueDate",
      "taskDueTime",
      "taskDateFieldLabel",
      "taskTimeFieldLabel",
      "taskTypeHelp",

      "taskReminder",
      "taskEditScopeField",
      "taskEditScope",
      "taskNote",

      "taskFormMessage",
      "taskDeleteButton",
      "taskSaveButton",
    ];

    ids.forEach((id) => {
      elements[id] =
        document.getElementById(id);
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
    elements.filterButtons.forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            setFilter(
              button.dataset.taskFilter
            );
          }
        );
      }
    );

    elements.addButtons.forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            openTaskModal(
              null,
              Number(
                button.dataset.addTask
              ),
              "once"
            );
          }
        );
      }
    );

    elements.tasksGlobalAddButton
      .addEventListener(
        "click",
        () => {
          openTaskModal(null, 2, "once");
        }
      );

    elements.dailyRoutineAddButton
      .addEventListener(
        "click",
        () => {
          openTaskModal(null, 2, "daily");
        }
      );

    elements.taskPreset.addEventListener(
      "change",
      applyPresetSelection
    );

    elements.taskType.addEventListener(
      "change",
      updateTaskTypeFields
    );

    elements.taskForm.addEventListener(
      "submit",
      saveRecord
    );

    elements.taskDeleteButton
      .addEventListener(
        "click",
        deleteRecord
      );

    elements.closeModalButtons.forEach(
      (button) => {
        button.addEventListener(
          "click",
          closeTaskModal
        );
      }
    );

    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Escape" &&
          !elements.taskModal.hidden
        ) {
          closeTaskModal();
        }
      }
    );
  }

  async function loadAllData() {
    showPageMessage(
      "Đang tải công việc..."
    );

    const todayKey =
      getNowParts().dateKey;

    const [
      tasksResult,
      routinesResult,
      logsResult,
    ] = await Promise.all([
      database
        .from("tioong_tasks")
        .select("*")
        .order("created_at", {
          ascending: false,
        }),

      database
        .from("tioong_routines")
        .select("*")
        .eq("is_active", true)
        .order("created_at", {
          ascending: true,
        }),

      database
        .from("tioong_routine_logs")
        .select("*")
        .eq("log_date", todayKey),
    ]);

    const firstError =
      tasksResult.error ||
      routinesResult.error ||
      logsResult.error;

    if (firstError) {
      console.error(firstError);

      showPageMessage(
        firstError.message ||
          "Không thể tải công việc.",
        true
      );

      return;
    }

    state.tasks =
      tasksResult.data || [];

    state.routines =
      (routinesResult.data || [])
        .filter(routineAppliesToday);

    state.routineLogs =
      logsResult.data || [];

    showPageMessage("");
    renderAll();
  }

  function renderAll() {
    renderSummary();
    renderDailyRoutines();

    for (
      let quadrant = 1;
      quadrant <= 4;
      quadrant += 1
    ) {
      renderQuadrant(quadrant);
    }
  }

  function renderSummary() {
    const routineDisplays =
      getRoutineDisplays();

    const activeTasks =
      state.tasks.filter(
        (task) => !task.is_completed
      );

    const completedTasks =
      state.tasks.filter(
        (task) => task.is_completed
      );

    const activeRoutines =
      routineDisplays.filter(
        (item) => !item.is_completed
      );

    const completedRoutines =
      routineDisplays.filter(
        (item) => item.is_completed
      );

    const overdueCount =
      activeTasks.filter(
        isTaskOverdue
      ).length +
      activeRoutines.filter(
        isRoutineOverdue
      ).length;

    elements.tasksActiveCount.textContent =
      String(
        activeTasks.length +
        activeRoutines.length
      );

    elements.tasksOverdueCount.textContent =
      String(overdueCount);

    elements.tasksCompletedCount.textContent =
      String(
        completedTasks.length +
        completedRoutines.length
      );
  }

  function renderDailyRoutines() {
    const today =
      dateFromKey(
        getNowParts().dateKey
      );

    elements.dailyRoutinesDateLabel
      .textContent =
        formatFullDate(today);

    elements.dailyRoutineList
      .replaceChildren();

    const displays =
      getRoutineDisplays()
        .filter(
          routineMatchesCurrentFilter
        )
        .sort(
          (first, second) =>
            Number(first.quadrant) -
            Number(second.quadrant)
        );

    elements.dailyRoutineEmpty.hidden =
      displays.length > 0;

    displays.forEach((display) => {
      elements.dailyRoutineList
        .appendChild(
          createRoutineCard(display)
        );
    });
  }

  function createRoutineCard(display) {
    const card =
      document.createElement("article");

    card.className =
      `daily-routine-card ` +
      `routine-quadrant-${display.quadrant}`;

    card.classList.toggle(
      "completed",
      display.is_completed
    );

    card.classList.toggle(
      "overdue",
      isRoutineOverdue(display)
    );

    const completeButton =
      document.createElement("button");

    completeButton.type = "button";

    completeButton.className =
      "daily-routine-complete";

    completeButton.textContent =
      display.is_completed ? "✓" : "";

    completeButton.setAttribute(
      "aria-label",
      display.is_completed
        ? "Đánh dấu chưa hoàn thành"
        : "Đánh dấu hoàn thành"
    );

    completeButton.addEventListener(
      "click",
      () => {
        toggleRoutineCompleted(display);
      }
    );

    const contentButton =
      document.createElement("button");

    contentButton.type = "button";

    contentButton.className =
      "daily-routine-content";

    contentButton.addEventListener(
      "click",
      () => {
        openTaskModal(
          display.routine,
          display.quadrant,
          "daily",
          display.log
        );
      }
    );

    const title =
      document.createElement("strong");

    title.textContent =
      display.title;

    const detail =
      document.createElement("span");

    detail.textContent =
      formatRoutineDetail(display);

    contentButton.append(
      title,
      detail
    );

    const badge =
      document.createElement("span");

    badge.className =
      "daily-routine-badge";

    badge.textContent =
      `Nhóm ${toRoman(display.quadrant)}`;

    card.append(
      completeButton,
      contentButton,
      badge
    );

    return card;
  }

  function renderQuadrant(quadrant) {
    const list =
      elements[
        `taskQuadrant${quadrant}List`
      ];

    const empty =
      elements[
        `taskQuadrant${quadrant}Empty`
      ];

    const count =
      elements[
        `taskQuadrant${quadrant}Count`
      ];

    const visibleTasks =
      state.tasks
        .filter(
          (task) =>
            Number(task.quadrant) ===
            quadrant
        )
        .filter(
          taskMatchesCurrentFilter
        )
        .sort(compareTasks);

    list.replaceChildren();

    count.textContent =
      String(visibleTasks.length);

    empty.hidden =
      visibleTasks.length > 0;

    empty.textContent =
      getEmptyText();

    visibleTasks.forEach((task) => {
      list.appendChild(
        createTaskCard(task)
      );
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

    completeButton.textContent =
      task.is_completed ? "✓" : "";

    completeButton.setAttribute(
      "aria-label",
      task.is_completed
        ? "Đánh dấu chưa hoàn thành"
        : "Đánh dấu hoàn thành"
    );

    completeButton.addEventListener(
      "click",
      () => {
        toggleTaskCompleted(task);
      }
    );

    const contentButton =
      document.createElement("button");

    contentButton.type = "button";

    contentButton.className =
      "task-card-content";

    contentButton.addEventListener(
      "click",
      () => {
        openTaskModal(task);
      }
    );

    const title =
      document.createElement("strong");

    title.className =
      "task-card-title";

    title.textContent =
      task.title;

    const deadline =
      document.createElement("span");

    deadline.className =
      "task-card-deadline";

    deadline.textContent =
      formatTaskDeadline(task);

    contentButton.append(
      title,
      deadline
    );

    if (task.note) {
      const note =
        document.createElement("span");

      note.className =
        "task-card-note";

      note.textContent =
        task.note;

      contentButton.appendChild(note);
    }

    const arrow =
      document.createElement("span");

    arrow.className =
      "task-card-arrow";

    arrow.textContent = "›";

    card.append(
      completeButton,
      contentButton,
      arrow
    );

    return card;
  }

  function getRoutineDisplays() {
    return state.routines.map(
      (routine) => {
        const log =
          getRoutineLog(routine.id);

        return {
          routine,
          log,
          id: routine.id,

          title:
            log?.override_title ||
            routine.title,

          quadrant:
            log?.override_quadrant ??
            routine.quadrant,

          target_value:
            log?.override_target_value ??
            routine.target_value,

          target_unit:
            log?.override_target_unit ||
            routine.target_unit,

          due_time:
            log?.override_due_time ||
            routine.due_time,

          reminder_minutes:
            log?.override_reminder_minutes ??
            routine.reminder_minutes,

          note:
            log?.note ||
            routine.note,

          is_completed:
            Boolean(
              log?.is_completed
            ),
        };
      }
    );
  }

  function getRoutineLog(routineId) {
    return (
      state.routineLogs.find(
        (log) =>
          log.routine_id === routineId
      ) || null
    );
  }

  function routineAppliesToday(routine) {
    const todayKey =
      getNowParts().dateKey;

    return (
      routine.start_date <= todayKey &&
      (
        !routine.end_date ||
        routine.end_date >= todayKey
      )
    );
  }

  function taskMatchesCurrentFilter(task) {
    if (
      state.filter === "completed"
    ) {
      return Boolean(
        task.is_completed
      );
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

  function routineMatchesCurrentFilter(
    display
  ) {
    if (
      state.filter === "completed"
    ) {
      return display.is_completed;
    }

    if (display.is_completed) {
      return false;
    }

    if (state.filter === "overdue") {
      return isRoutineOverdue(display);
    }

    return true;
  }

  function setFilter(filter) {
    state.filter = filter;

    elements.filterButtons.forEach(
      (button) => {
        button.classList.toggle(
          "active",
          button.dataset.taskFilter ===
            filter
        );
      }
    );

    renderAll();
  }

  function openTaskModal(
    record = null,
    defaultQuadrant = 2,
    defaultType = "once",
    routineLog = null
  ) {
    elements.taskForm.reset();

    setFormMessage("");

    elements.taskDeleteButton.hidden =
      !record;

    elements.taskEditScopeField.hidden =
      true;

    if (!record) {
      elements.taskModalTitle.textContent =
        "Thêm công việc";

      elements.taskId.value = "";

      elements.taskRecordType.value =
        defaultType === "daily"
          ? "routine"
          : "task";

      elements.taskPreset.value = "";

      elements.taskType.value =
        defaultType;

      elements.taskQuadrant.value =
        String(defaultQuadrant);

      elements.taskDueDate.value =
        defaultType === "daily"
          ? getNowParts().dateKey
          : "";

      updatePresetFieldVisibility();
      updateTaskTypeFields();
    } else if (
      Object.prototype.hasOwnProperty.call(
        record,
        "repeat_type"
      )
    ) {
      const display = {
        title:
          routineLog?.override_title ||
          record.title,

        quadrant:
          routineLog?.override_quadrant ??
          record.quadrant,

        target_value:
          routineLog
            ?.override_target_value ??
          record.target_value,

        target_unit:
          routineLog
            ?.override_target_unit ||
          record.target_unit,

        due_time:
          routineLog?.override_due_time ||
          record.due_time,

        reminder_minutes:
          routineLog
            ?.override_reminder_minutes ??
          record.reminder_minutes,

        note:
          routineLog?.note ||
          record.note,
      };

      elements.taskModalTitle.textContent =
        "Sửa việc hằng ngày";

      elements.taskId.value =
        record.id;

      elements.taskRecordType.value =
        "routine";

      elements.taskPreset.value =
        record.preset_key ||
        inferPresetKey(record.title);

      elements.taskTitle.value =
        display.title || "";

      elements.taskType.value =
        "daily";

      elements.taskQuadrant.value =
        String(
          display.quadrant || 2
        );

      elements.taskTargetValue.value =
        display.target_value ?? "";

      elements.taskTargetUnit.value =
        display.target_unit || "việc";

      elements.taskDueDate.value =
        record.start_date ||
        getNowParts().dateKey;

      elements.taskDueTime.value =
        shortTime(display.due_time);

      elements.taskReminder.value =
        display.reminder_minutes == null
          ? ""
          : String(
              display.reminder_minutes
            );

      elements.taskNote.value =
        display.note || "";

      elements.taskEditScopeField.hidden =
        false;

      elements.taskEditScope.value =
        "future";

      updatePresetFieldVisibility();
      updateTaskTypeFields();
    } else {
      const presetKey =
        inferPresetKey(record.title);

      elements.taskModalTitle.textContent =
        "Sửa công việc";

      elements.taskId.value =
        record.id;

      elements.taskRecordType.value =
        "task";

      elements.taskPreset.value =
        presetKey;

      elements.taskTitle.value =
        record.title || "";

      elements.taskType.value =
        "once";

      elements.taskQuadrant.value =
        String(record.quadrant || 2);

      elements.taskDueDate.value =
        record.due_date || "";

      elements.taskDueTime.value =
        shortTime(record.due_time);

      elements.taskReminder.value =
        record.reminder_minutes == null
          ? ""
          : String(
              record.reminder_minutes
            );

      elements.taskNote.value =
        record.note || "";

      updatePresetFieldVisibility();
      updateTaskTypeFields();
    }

    elements.taskModal.hidden = false;

    document.body.classList.add(
      "task-modal-open"
    );

    window.setTimeout(() => {
      if (
        elements.taskPreset.value ===
        "custom"
      ) {
        elements.taskTitle.focus();
      } else {
        elements.taskPreset.focus();
      }
    }, 50);
  }

  function applyPresetSelection() {
    const presetKey =
      elements.taskPreset.value;

    const preset =
      PRESETS[presetKey];

    if (preset) {
      elements.taskTitle.value =
        preset.title;

      elements.taskQuadrant.value =
        String(preset.quadrant);

      elements.taskType.value =
        preset.defaultType;

      elements.taskTargetValue.value =
        preset.targetValue ?? "";

      elements.taskTargetUnit.value =
        preset.targetUnit || "việc";
    } else if (
      presetKey === "custom"
    ) {
      elements.taskTitle.value = "";
    }

    updatePresetFieldVisibility();
    updateTaskTypeFields();
  }

  function updatePresetFieldVisibility() {
    const isCustom =
      elements.taskPreset.value ===
      "custom";

    elements.taskCustomTitleField.hidden =
      !isCustom;

    elements.taskTitle.required =
      isCustom;
  }

  function updateTaskTypeFields() {
    const isDaily =
      elements.taskType.value ===
      "daily";

    elements.taskTargetFields.hidden =
      !isDaily;

    elements.taskDateFieldLabel
      .textContent =
        isDaily
          ? "Ngày bắt đầu"
          : "Ngày hết hạn";

    elements.taskTimeFieldLabel
      .textContent =
        isDaily
          ? "Giờ thực hiện mỗi ngày"
          : "Giờ hết hạn";

    elements.taskTypeHelp.textContent =
      isDaily
        ? "Công việc sẽ tự xuất hiện lại mỗi ngày."
        : "Công việc sẽ chỉ xuất hiện một lần.";

    if (
      isDaily &&
      !elements.taskDueDate.value
    ) {
      elements.taskDueDate.value =
        getNowParts().dateKey;
    }

    if (
      elements.taskRecordType.value ===
      "routine"
    ) {
      elements.taskEditScopeField.hidden =
        !isDaily;
    }
  }

  function closeTaskModal() {
    elements.taskModal.hidden = true;

    document.body.classList.remove(
      "task-modal-open"
    );

    setFormMessage("");
  }

  async function saveRecord(event) {
    event.preventDefault();

    const presetKey =
      elements.taskPreset.value;

    const preset =
      PRESETS[presetKey];

    const title = preset
      ? preset.title
      : elements.taskTitle.value.trim();

    const taskType =
      elements.taskType.value;

    const recordId =
      elements.taskId.value;

    const recordType =
      elements.taskRecordType.value;

    const dueDate =
      elements.taskDueDate.value;

    const dueTime =
      elements.taskDueTime.value;

    const reminderValue =
      elements.taskReminder.value;

    if (!presetKey) {
      setFormMessage(
        "Bạn hãy chọn một công việc.",
        true
      );
      return;
    }

    if (!title) {
      setFormMessage(
        "Bạn hãy nhập tên công việc.",
        true
      );
      return;
    }

    if (dueTime && !dueDate) {
      setFormMessage(
        "Bạn hãy chọn ngày trước.",
        true
      );
      return;
    }

    if (
      reminderValue &&
      !dueTime
    ) {
      setFormMessage(
        "Muốn nhận thông báo, bạn cần chọn giờ.",
        true
      );
      return;
    }

    setSaving(true);

    let error = null;

    if (taskType === "daily") {
      const routinePayload = {
        preset_key: presetKey,
        title,

        quadrant: Number(
          elements.taskQuadrant.value
        ),

        target_value:
          elements.taskTargetValue.value
            ? Number(
                elements
                  .taskTargetValue
                  .value
              )
            : null,

        target_unit:
          elements.taskTargetValue.value
            ? elements
                .taskTargetUnit
                .value
            : null,

        repeat_type: "daily",

        start_date:
          dueDate ||
          getNowParts().dateKey,

        due_time:
          dueTime || null,

        timezone:
          getDisplayTimezone(),

        reminder_minutes:
          reminderValue
            ? Number(reminderValue)
            : null,

        note:
          elements.taskNote
            .value
            .trim() || null,

        is_active: true,
      };

      if (
        recordType === "routine" &&
        recordId &&
        elements.taskEditScope.value ===
          "today"
      ) {
        const { error: logError } =
          await database
            .from(
              "tioong_routine_logs"
            )
            .upsert(
              {
                routine_id: recordId,

                log_date:
                  getNowParts()
                    .dateKey,

                override_title:
                  routinePayload.title,

                override_quadrant:
                  routinePayload.quadrant,

                override_target_value:
                  routinePayload
                    .target_value,

                override_target_unit:
                  routinePayload
                    .target_unit,

                override_due_time:
                  routinePayload
                    .due_time,

                override_reminder_minutes:
                  routinePayload
                    .reminder_minutes,

                note:
                  routinePayload.note,
              },
              {
                onConflict:
                  "routine_id,log_date",
              }
            );

        error = logError;
      } else if (
        recordType === "routine" &&
        recordId
      ) {
        const { error: updateError } =
          await database
            .from("tioong_routines")
            .update(routinePayload)
            .eq("id", recordId);

        error = updateError;
      } else {
        const { error: insertError } =
          await database
            .from("tioong_routines")
            .insert(routinePayload);

        error = insertError;

        if (
          !error &&
          recordType === "task" &&
          recordId
        ) {
          const { error: deleteError } =
            await database
              .from("tioong_tasks")
              .delete()
              .eq("id", recordId);

          error = deleteError;
        }
      }
    } else {
      const taskPayload = {
        title,

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

        note:
          elements.taskNote
            .value
            .trim() || null,
      };

      if (
        recordType === "task" &&
        recordId
      ) {
        const { error: updateError } =
          await database
            .from("tioong_tasks")
            .update(taskPayload)
            .eq("id", recordId);

        error = updateError;
      } else {
        const { error: insertError } =
          await database
            .from("tioong_tasks")
            .insert(taskPayload);

        error = insertError;

        if (
          !error &&
          recordType === "routine" &&
          recordId
        ) {
          const { error: deleteError } =
            await database
              .from("tioong_routines")
              .delete()
              .eq("id", recordId);

          error = deleteError;
        }
      }
    }

    setSaving(false);

    if (error) {
      console.error(error);

      setFormMessage(
        error.message ||
          "Không thể lưu công việc.",
        true
      );

      return;
    }

    closeTaskModal();
    setFilter("all");

    await loadAllData();
  }

  async function toggleTaskCompleted(task) {
    const nextState =
      !task.is_completed;

    const { error } = await database
      .from("tioong_tasks")
      .update({
        is_completed: nextState,

        completed_at:
          nextState
            ? new Date().toISOString()
            : null,
      })
      .eq("id", task.id);

    if (error) {
      showPageMessage(
        error.message ||
          "Không thể cập nhật công việc.",
        true
      );
      return;
    }

    await loadAllData();
  }

  async function toggleRoutineCompleted(
    display
  ) {
    const nextState =
      !display.is_completed;

    const { error } = await database
      .from("tioong_routine_logs")
      .upsert(
        {
          routine_id: display.id,

          log_date:
            getNowParts().dateKey,

          is_completed: nextState,

          completed_at:
            nextState
              ? new Date().toISOString()
              : null,
        },
        {
          onConflict:
            "routine_id,log_date",
        }
      );

    if (error) {
      showPageMessage(
        error.message ||
          "Không thể cập nhật việc hằng ngày.",
        true
      );
      return;
    }

    await loadAllData();
  }

  async function deleteRecord() {
    const recordId =
      elements.taskId.value;

    const recordType =
      elements.taskRecordType.value;

    if (!recordId) {
      return;
    }

    const message =
      recordType === "routine"
        ? "Xóa việc hằng ngày này và toàn bộ lịch sử của nó?"
        : "Bạn có chắc muốn xóa công việc này không?";

    if (!window.confirm(message)) {
      return;
    }

    elements.taskDeleteButton.disabled =
      true;

    const table =
      recordType === "routine"
        ? "tioong_routines"
        : "tioong_tasks";

    const { error } = await database
      .from(table)
      .delete()
      .eq("id", recordId);

    elements.taskDeleteButton.disabled =
      false;

    if (error) {
      setFormMessage(
        error.message ||
          "Không thể xóa công việc.",
        true
      );
      return;
    }

    closeTaskModal();
    await loadAllData();
  }

  function isTaskOverdue(task) {
    if (
      task.is_completed ||
      !task.due_date
    ) {
      return false;
    }

    const now = getNowParts();

    if (
      task.due_date < now.dateKey
    ) {
      return true;
    }

    if (
      task.due_date > now.dateKey
    ) {
      return false;
    }

    const taskTime =
      shortTime(task.due_time);

    return Boolean(
      taskTime &&
      taskTime < now.timeKey
    );
  }

  function isRoutineOverdue(display) {
    if (display.is_completed) {
      return false;
    }

    const dueTime =
      shortTime(display.due_time);

    return Boolean(
      dueTime &&
      dueTime < getNowParts().timeKey
    );
  }

  function formatTaskDeadline(task) {
    if (!task.due_date) {
      return "Không thời hạn";
    }

    const todayKey =
      getNowParts().dateKey;

    const dateText =
      task.due_date === todayKey
        ? "Hôm nay"
        : new Intl.DateTimeFormat(
            "vi-VN",
            {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              timeZone: "UTC",
            }
          ).format(
            dateFromKey(
              task.due_date
            )
          );

    const time =
      shortTime(task.due_time);

    const deadline = time
      ? `${dateText} · ${time}`
      : dateText;

    return isTaskOverdue(task)
      ? `Quá hạn · ${deadline}`
      : deadline;
  }

  function formatRoutineDetail(display) {
    const parts = [];

    if (
      display.target_value &&
      display.target_unit
    ) {
      parts.push(
        `Mục tiêu ` +
        `${display.target_value} ` +
        `${display.target_unit}`
      );
    }

    if (display.due_time) {
      parts.push(
        `Mỗi ngày lúc ` +
        `${shortTime(
          display.due_time
        )}`
      );
    }

    if (display.is_completed) {
      parts.push(
        "Đã hoàn thành hôm nay"
      );
    } else if (
      isRoutineOverdue(display)
    ) {
      parts.push("Đã quá giờ");
    }

    return parts.length > 0
      ? parts.join(" · ")
      : "Lặp lại mỗi ngày";
  }

  function compareTasks(
    firstTask,
    secondTask
  ) {
    if (
      !firstTask.due_date &&
      !secondTask.due_date
    ) {
      return (
        new Date(
          secondTask.created_at
        ) -
        new Date(
          firstTask.created_at
        )
      );
    }

    if (!firstTask.due_date) {
      return 1;
    }

    if (!secondTask.due_date) {
      return -1;
    }

    const first =
      `${firstTask.due_date} ` +
      `${
        shortTime(
          firstTask.due_time
        ) || "23:59"
      }`;

    const second =
      `${secondTask.due_date} ` +
      `${
        shortTime(
          secondTask.due_time
        ) || "23:59"
      }`;

    return first.localeCompare(second);
  }

  function inferPresetKey(title) {
    const match =
      Object.entries(PRESETS)
        .find(
          ([, preset]) =>
            preset.title === title
        );

    return match
      ? match[0]
      : "custom";
  }

  function getEmptyText() {
    if (state.filter === "today") {
      return "Hôm nay chưa có công việc";
    }

    if (state.filter === "overdue") {
      return "Không có công việc quá hạn";
    }

    if (
      state.filter === "completed"
    ) {
      return "Chưa có công việc hoàn thành";
    }

    return "Chưa có công việc";
  }

  function toRoman(number) {
    return [
      "I",
      "II",
      "III",
      "IV",
    ][Number(number) - 1] || "II";
  }

  function getDisplayTimezone() {
    const saved =
      localStorage.getItem(
        TIMEZONE_KEY
      );

    return saved === "Asia/Tokyo"
      ? saved
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

    const values =
      Object.fromEntries(
        parts
          .filter(
            (part) =>
              part.type !== "literal"
          )
          .map(
            (part) => [
              part.type,
              part.value,
            ]
          )
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
      dateKey
        .split("-")
        .map(Number);

    return new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );
  }

  function formatFullDate(date) {
    const text =
      new Intl.DateTimeFormat(
        "vi-VN",
        {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          timeZone: "UTC",
        }
      ).format(date);

    return (
      text.charAt(0).toUpperCase() +
      text.slice(1)
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
    elements.taskFormMessage
      .textContent = message;

    elements.taskFormMessage
      .classList.toggle(
        "error",
        isError
      );
  }

  function showPageMessage(
    message,
    isError = false
  ) {
    elements.tasksPageMessage
      .textContent = message;

    elements.tasksPageMessage
      .classList.toggle(
        "error",
        isError
      );
  }
})();