const DAY_NAMES = [
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
    "Chủ Nhật"
];

let weekOffset = 0;


document.addEventListener(
    "DOMContentLoaded",
    function () {
        ganSuKienChuyenTuan();
        ganSuKienKeHoachTuan();
        hienThiLichTuan();
    }
);


/* =========================
   ĐIỀU HƯỚNG TUẦN
========================= */

function ganSuKienChuyenTuan() {
    const previousButton =
        document.getElementById(
            "previousWeekButton"
        );

    const currentButton =
        document.getElementById(
            "currentWeekButton"
        );

    const nextButton =
        document.getElementById(
            "nextWeekButton"
        );

    if (previousButton) {
        previousButton.addEventListener(
            "click",
            function () {
                weekOffset -= 1;
                hienThiLichTuan();
            }
        );
    }

    if (currentButton) {
        currentButton.addEventListener(
            "click",
            function () {
                weekOffset = 0;
                hienThiLichTuan();
            }
        );
    }

    if (nextButton) {
        nextButton.addEventListener(
            "click",
            function () {
                weekOffset += 1;
                hienThiLichTuan();
            }
        );
    }
}


/* =========================
   TÍNH NGÀY TRONG TUẦN
========================= */

function layNgayThuHai(date) {
    const result = new Date(date);

    const day = result.getDay();

    const difference =
        day === 0
            ? -6
            : 1 - day;

    result.setDate(
        result.getDate() + difference
    );

    result.setHours(0, 0, 0, 0);

    return result;
}


function themNgay(date, numberOfDays) {
    const result = new Date(date);

    result.setDate(
        result.getDate() + numberOfDays
    );

    return result;
}


function dinhDangNgayNgan(date) {
    return new Intl.DateTimeFormat(
        "vi-VN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    ).format(date);
}


function dinhDangKhoangTuan(
    monday,
    sunday
) {
    return (
        `${dinhDangNgayNgan(monday)} – ` +
        `${dinhDangNgayNgan(sunday)}`
    );
}


function laySoNgayUTC(date) {
    return Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    );
}


function laySoNgayTuChuoiISO(dateText) {
    const parts = dateText
        .split("-")
        .map(Number);

    return Date.UTC(
        parts[0],
        parts[1] - 1,
        parts[2]
    );
}


/* =========================
   LẤY CA LÀM TỪ SUPABASE
========================= */

async function layTatCaCauHinhCaLam() {
    const {
        data,
        error
    } = await supabaseClient
        .from("shift_settings")
        .select(
            `
            id,
            cycle_start_date,
            work_shift,
            weekend_work_day,
            created_at
            `
        )
        .order(
            "created_at",
            {
                ascending: false
            }
        );

    if (error) {
        throw error;
    }

    return data || [];
}


function timCaLamChoNgay(
    settingsList,
    date
) {
    const currentDay =
        laySoNgayUTC(date);

    const millisecondsPerDay =
        24 * 60 * 60 * 1000;

    return settingsList.find(
        function (settings) {
            const startDay =
                laySoNgayTuChuoiISO(
                    settings.cycle_start_date
                );

            const difference =
                (
                    currentDay -
                    startDay
                ) / millisecondsPerDay;

            return (
                difference >= 0 &&
                difference < 14
            );
        }
    ) || null;
}

/* =========================
   KẾ HOẠCH RIÊNG TỪNG NGÀY
========================= */

function dinhDangNgayISO(date) {
    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


async function layKeHoachNgayTrongKhoang(
    startDate,
    endDate
) {
    const {
        data,
        error
    } = await supabaseClient
        .from("daily_plans")
        .select(
            `
            id,
            plan_date,
            work_shift,
            study_slots,
            updated_at
            `
        )
        .gte(
            "plan_date",
            dinhDangNgayISO(startDate)
        )
        .lte(
            "plan_date",
            dinhDangNgayISO(endDate)
        );

    if (error) {
        throw error;
    }

    return data || [];
}


function taoBanDoKeHoachNgay(
    dailyPlans
) {
    const planMap = new Map();

    dailyPlans.forEach(
        function (plan) {
            planMap.set(
                plan.plan_date,
                plan
            );
        }
    );

    return planMap;
}


/* Chọn ca mặc định nếu ngày đó chưa chỉnh riêng */

function layCaMacDinhChoNgay(
    date,
    settings
) {
    const dayOfWeek =
        date.getDay();

    const isRikiDay =
        dayOfWeek === 1 ||
        dayOfWeek === 3 ||
        dayOfWeek === 5;

    if (isRikiDay) {
        return "afternoon";
    }

    const isNormalWeekday =
        dayOfWeek === 2 ||
        dayOfWeek === 4;

    if (isNormalWeekday) {
        return settings
            ? settings.work_shift
            : "off";
    }

    if (!settings) {
        return "off";
    }

    const weekendDay =
        dayOfWeek === 6
            ? "saturday"
            : "sunday";

    const isWorkDay =
        settings.weekend_work_day ===
        weekendDay;

    return isWorkDay
        ? settings.work_shift
        : "off";
}

/* =========================
   TẠO NỘI DUNG MỖI NGÀY
========================= */

function taoCongViec(
    icon,
    time,
    title,
    description,
    type
) {
    return {
        icon,
        time,
        title,
        description,
        type
    };
}


function taoLichRiki() {
    return [
        taoCongViec(
            "📚",
            "09:00–11:30",
            "Học tiếng Nhật N5",
            "Lớp học tại Riki",
            "study"
        ),

        taoCongViec(
            "💼",
            "13:00–21:00",
            "Lab Helpdesk",
            "Ca chiều vì buổi sáng có lớp",
            "work"
        ),

        taoCongViec(
            "📝",
            "22:00–22:20",
            "Ôn nhẹ bài học",
            "Từ vựng hoặc Kanji",
            "review"
        )
    ];
}


function taoLichTheoCa(workShift) {
    if (workShift === "morning") {
        return [
            taoCongViec(
                "💼",
                "07:00–16:00",
                "Lab Helpdesk",
                "Ca sáng",
                "work"
            ),

            taoCongViec(
                "📖",
                "19:00–20:00",
                "Tự học N5",
                "Từ vựng, Kanji hoặc ngữ pháp",
                "study"
            )
        ];
    }

    if (workShift === "normal") {
        return [
            taoCongViec(
                "💼",
                "09:00–18:00",
                "Lab Helpdesk",
                "Ca thường",
                "work"
            ),

            taoCongViec(
                "📖",
                "20:00–21:00",
                "Tự học N5",
                "Ôn nội dung tại Riki",
                "study"
            )
        ];
    }

    return [
        taoCongViec(
            "📖",
            "10:00–11:30",
            "Tự học N5",
            "Học trước khi đi làm",
            "study"
        ),

        taoCongViec(
            "💼",
            "13:00–21:00",
            "Lab Helpdesk",
            "Ca chiều",
            "work"
        )
    ];
}


function taoLichNgayNghi() {
    return [
        taoCongViec(
            "🔤",
            "10:00–11:00",
            "Từ vựng và Kanji",
            "Ôn nội dung trong tuần",
            "study"
        ),

        taoCongViec(
            "📖",
            "11:10–12:00",
            "Ngữ pháp N5",
            "Học và làm bài tập",
            "review"
        ),

        taoCongViec(
            "🎧",
            "15:00–16:00",
            "Nghe tiếng Nhật",
            "Luyện nghe và shadowing",
            "listening"
        )
    ];
}


function taoLichChoNgay(
    date,
    settings
) {
    const dayOfWeek = date.getDay();

    const isRikiDay =
        dayOfWeek === 1 ||
        dayOfWeek === 3 ||
        dayOfWeek === 5;

    if (isRikiDay) {
        return taoLichRiki();
    }

    const isNormalWeekday =
        dayOfWeek === 2 ||
        dayOfWeek === 4;

    if (isNormalWeekday) {
        if (!settings) {
            return [];
        }

        return taoLichTheoCa(
            settings.work_shift
        );
    }

    if (!settings) {
        return [];
    }

    const currentWeekendDay =
        dayOfWeek === 6
            ? "saturday"
            : "sunday";

    const isWeekendWorkDay =
        settings.weekend_work_day ===
        currentWeekendDay;

    if (isWeekendWorkDay) {
        return taoLichTheoCa(
            settings.work_shift
        );
    }

    return taoLichNgayNghi();
}

function taoLichHocTheoCaDaChon(
    date,
    selectedShift
) {
    const dayOfWeek = date.getDay();

    const isRikiDay =
        dayOfWeek === 1 ||
        dayOfWeek === 3 ||
        dayOfWeek === 5;

    // Thứ 2, 4, 6 vẫn giữ lịch học tại Riki
    if (isRikiDay) {
        return taoLichRiki();
    }

    // Nghỉ làm thì chưa tạo giờ học mặc định
    if (selectedShift === "off") {
        return [];
    }

    return taoLichTheoCa(selectedShift);
}

function baoVeNoiDungHTML(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function kiemTraHomNay(date) {
    const today = new Date();

    return (
        date.getFullYear() ===
        today.getFullYear() &&
        date.getMonth() ===
        today.getMonth() &&
        date.getDate() ===
        today.getDate()
    );
}


function taoOptionCaLam(
    value,
    label,
    selectedShift
) {
    const selected =
        value === selectedShift
            ? "selected"
            : "";

    return `
        <option
            value="${value}"
            ${selected}
        >
            ${label}
        </option>
    `;
}


function taoBoChonCaLam(
    planDate,
    selectedShift
) {
    return `
        <select
            class="daily-shift-select"
            data-plan-date="${planDate}"
            aria-label="Chọn ca làm"
        >
            ${taoOptionCaLam(
        "off",
        "Nghỉ làm",
        selectedShift
    )}

            ${taoOptionCaLam(
        "morning",
        "07:00–16:00",
        selectedShift
    )}

            ${taoOptionCaLam(
        "normal",
        "09:00–18:00",
        selectedShift
    )}

            ${taoOptionCaLam(
        "afternoon",
        "13:00–21:00",
        selectedShift
    )}
        </select>
    `;
}


function taoMucGioHocMacDinh(task) {
    return `
        <div class="week-study-item default">
            <span>${baoVeNoiDungHTML(
        task.time
    )}</span>

            <strong>${baoVeNoiDungHTML(
        task.title
    )}</strong>
        </div>
    `;
}


function taoMucGioHocTuThem(
    slot,
    planDate
) {
    return `
        <div class="week-study-item custom">
            <span>
                ${baoVeNoiDungHTML(
        slot.start_time
    )}–${baoVeNoiDungHTML(
        slot.end_time
    )}
            </span>

            <strong>
                ${baoVeNoiDungHTML(
        slot.title
    )}
            </strong>

            <button
                class="delete-study-slot-button"
                type="button"
                data-plan-date="${planDate}"
                data-slot-id="${baoVeNoiDungHTML(
        slot.id
    )}"
                aria-label="Xóa giờ học"
            >
                ×
            </button>
        </div>
    `;
}


function taoNgayHTML(
    date,
    dayName,
    tasks,
    dailyPlan,
    selectedShift
) {
    const planDate =
        dinhDangNgayISO(date);

    const todayClass =
        kiemTraHomNay(date)
            ? "today"
            : "";

    const defaultStudyTasks =
        tasks.filter(
            function (task) {
                return task.type !== "work";
            }
        );

    const customStudySlots =
        dailyPlan &&
            Array.isArray(
                dailyPlan.study_slots
            )
            ? dailyPlan.study_slots
            : [];

    let studyHTML = "";

    studyHTML +=
        defaultStudyTasks
            .map(taoMucGioHocMacDinh)
            .join("");

    studyHTML +=
        customStudySlots
            .map(
                function (slot) {
                    return taoMucGioHocTuThem(
                        slot,
                        planDate
                    );
                }
            )
            .join("");

    if (!studyHTML) {
        studyHTML = `
            <small class="week-no-study">
                Chưa có giờ học
            </small>
        `;
    }

    return `
        <tr class="week-plan-row ${todayClass}">
            <td class="week-date-cell">
                <strong>${dayName}</strong>

                <span>
                    ${dinhDangNgayNgan(date)}
                </span>

                ${todayClass
            ? `<small>Hôm nay</small>`
            : ""
        }
            </td>

            <td class="week-shift-cell">
                ${taoBoChonCaLam(
            planDate,
            selectedShift
        )}
            </td>

            <td class="week-study-cell">
                <div class="week-study-list">
                    ${studyHTML}
                </div>

                <button
                    class="add-study-slot-button"
                    type="button"
                    data-plan-date="${planDate}"
                    data-day-name="${dayName}"
                >
                    ＋ Thêm
                </button>
            </td>
        </tr>
    `;
}

/* =========================
   LƯU KẾ HOẠCH TỪNG NGÀY
========================= */

async function layKeHoachMotNgay(planDate) {
    const {
        data,
        error
    } = await supabaseClient
        .from("daily_plans")
        .select(`
            id,
            plan_date,
            work_shift,
            study_slots
        `)
        .eq("plan_date", planDate)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data || null;
}


async function luuKeHoachNgay(
    planDate,
    workShift,
    studySlots
) {
    const {
        error
    } = await supabaseClient
        .from("daily_plans")
        .upsert(
            {
                plan_date: planDate,
                work_shift: workShift,
                study_slots: studySlots,
                updated_at:
                    new Date().toISOString()
            },
            {
                onConflict: "plan_date"
            }
        );

    if (error) {
        throw error;
    }
}


function layCaDangChonTrongBang(planDate) {
    const selectElements =
        document.querySelectorAll(
            ".daily-shift-select"
        );

    const selectedElement =
        Array.from(selectElements).find(
            function (element) {
                return (
                    element.dataset.planDate ===
                    planDate
                );
            }
        );

    return selectedElement
        ? selectedElement.value
        : "off";
}


/* =========================
   CỬA SỔ THÊM GIỜ HỌC
========================= */

function moCuaSoThemGioHoc(button) {
    const modal =
        document.getElementById(
            "studySlotModal"
        );

    const dateInput =
        document.getElementById(
            "studySlotDate"
        );

    const dateLabel =
        document.getElementById(
            "studySlotDateLabel"
        );

    const form =
        document.getElementById(
            "studySlotForm"
        );

    if (
        !modal ||
        !dateInput ||
        !dateLabel ||
        !form
    ) {
        return;
    }

    const planDate =
        button.dataset.planDate;

    const dayName =
        button.dataset.dayName;

    const dateParts =
        planDate.split("-");

    const displayDate =
        `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

    form.reset();

    dateInput.value = planDate;

    dateLabel.textContent =
        `${dayName} · ${displayDate}`;

    modal.classList.add("open");
    document.body.classList.add(
        "modal-open"
    );

    const startTimeInput =
        document.getElementById(
            "studyStartTime"
        );

    if (startTimeInput) {
        startTimeInput.focus();
    }
}


function dongCuaSoThemGioHoc() {
    const modal =
        document.getElementById(
            "studySlotModal"
        );

    if (!modal) {
        return;
    }

    modal.classList.remove("open");

    document.body.classList.remove(
        "modal-open"
    );
}


/* =========================
   XỬ LÝ ĐỔI CA LÀM
========================= */

async function xuLyDoiCaLam(selectElement) {
    const planDate =
        selectElement.dataset.planDate;

    const selectedShift =
        selectElement.value;

    selectElement.disabled = true;

    try {
        const dailyPlan =
            await layKeHoachMotNgay(
                planDate
            );

        const studySlots =
            dailyPlan &&
                Array.isArray(
                    dailyPlan.study_slots
                )
                ? dailyPlan.study_slots
                : [];

        await luuKeHoachNgay(
            planDate,
            selectedShift,
            studySlots
        );

        await hienThiLichTuan();
    } catch (error) {
        console.error(
            "Không thể lưu ca làm:",
            error
        );

        alert(
            "Chưa lưu được ca làm. Hãy kiểm tra mạng rồi thử lại."
        );

        selectElement.disabled = false;
    }
}


/* =========================
   XỬ LÝ THÊM GIỜ HỌC
========================= */

async function xuLyThemGioHoc(event) {
    event.preventDefault();

    const planDate =
        document.getElementById(
            "studySlotDate"
        ).value;

    const startTime =
        document.getElementById(
            "studyStartTime"
        ).value;

    const endTime =
        document.getElementById(
            "studyEndTime"
        ).value;

    const title =
        document.getElementById(
            "studyTitle"
        ).value.trim();

    const saveButton =
        document.getElementById(
            "saveStudySlotButton"
        );

    if (
        !planDate ||
        !startTime ||
        !endTime ||
        !title
    ) {
        alert("Hãy nhập đầy đủ thông tin.");
        return;
    }

    if (endTime <= startTime) {
        alert(
            "Giờ kết thúc phải sau giờ bắt đầu."
        );

        return;
    }

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent =
            "Đang lưu...";
    }

    try {
        const dailyPlan =
            await layKeHoachMotNgay(
                planDate
            );

        const workShift =
            dailyPlan
                ? dailyPlan.work_shift
                : layCaDangChonTrongBang(
                    planDate
                );

        const studySlots =
            dailyPlan &&
                Array.isArray(
                    dailyPlan.study_slots
                )
                ? [
                    ...dailyPlan.study_slots
                ]
                : [];

        studySlots.push({
            id:
                `${Date.now()}-${Math.random()
                    .toString(16)
                    .slice(2)}`,

            start_time: startTime,
            end_time: endTime,
            title: title
        });

        studySlots.sort(
            function (firstSlot, secondSlot) {
                return firstSlot.start_time
                    .localeCompare(
                        secondSlot.start_time
                    );
            }
        );

        await luuKeHoachNgay(
            planDate,
            workShift,
            studySlots
        );

        dongCuaSoThemGioHoc();

        await hienThiLichTuan();
    } catch (error) {
        console.error(
            "Không thể thêm giờ học:",
            error
        );

        alert(
            "Chưa thêm được giờ học. Hãy kiểm tra mạng rồi thử lại."
        );
    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent =
                "＋ Thêm vào lịch";
        }
    }
}


/* =========================
   XỬ LÝ XÓA GIỜ HỌC
========================= */

async function xuLyXoaGioHoc(button) {
    const planDate =
        button.dataset.planDate;

    const slotId =
        button.dataset.slotId;

    const confirmed =
        window.confirm(
            "Xóa khoảng giờ học này?"
        );

    if (!confirmed) {
        return;
    }

    button.disabled = true;

    try {
        const dailyPlan =
            await layKeHoachMotNgay(
                planDate
            );

        if (!dailyPlan) {
            return;
        }

        const studySlots =
            Array.isArray(
                dailyPlan.study_slots
            )
                ? dailyPlan.study_slots.filter(
                    function (slot) {
                        return (
                            String(slot.id) !==
                            String(slotId)
                        );
                    }
                )
                : [];

        await luuKeHoachNgay(
            planDate,
            dailyPlan.work_shift,
            studySlots
        );

        await hienThiLichTuan();
    } catch (error) {
        console.error(
            "Không thể xóa giờ học:",
            error
        );

        alert(
            "Chưa xóa được giờ học. Hãy thử lại."
        );

        button.disabled = false;
    }
}


/* =========================
   SỰ KIỆN BẢNG LỊCH TUẦN
========================= */

function ganSuKienKeHoachTuan() {
    const scheduleElement =
        document.getElementById(
            "weekSchedule"
        );

    const modal =
        document.getElementById(
            "studySlotModal"
        );

    const closeButton =
        document.getElementById(
            "closeStudySlotModalButton"
        );

    const form =
        document.getElementById(
            "studySlotForm"
        );

    if (scheduleElement) {
        scheduleElement.addEventListener(
            "change",
            function (event) {
                const selectElement =
                    event.target.closest(
                        ".daily-shift-select"
                    );

                if (selectElement) {
                    xuLyDoiCaLam(
                        selectElement
                    );
                }
            }
        );

        scheduleElement.addEventListener(
            "click",
            function (event) {
                const addButton =
                    event.target.closest(
                        ".add-study-slot-button"
                    );

                if (addButton) {
                    moCuaSoThemGioHoc(
                        addButton
                    );

                    return;
                }

                const deleteButton =
                    event.target.closest(
                        ".delete-study-slot-button"
                    );

                if (deleteButton) {
                    xuLyXoaGioHoc(
                        deleteButton
                    );
                }
            }
        );
    }

    if (closeButton) {
        closeButton.addEventListener(
            "click",
            dongCuaSoThemGioHoc
        );
    }

    if (modal) {
        modal.addEventListener(
            "click",
            function (event) {
                if (event.target === modal) {
                    dongCuaSoThemGioHoc();
                }
            }
        );
    }

    if (form) {
        form.addEventListener(
            "submit",
            xuLyThemGioHoc
        );
    }

    document.addEventListener(
        "keydown",
        function (event) {
            if (event.key === "Escape") {
                dongCuaSoThemGioHoc();
            }
        }
    );
}

/* =========================
   HIỂN THỊ LỊCH TUẦN
========================= */
async function hienThiLichTuan() {
    const scheduleElement =
        document.getElementById("weekSchedule");

    const rangeElement =
        document.getElementById("weekRange");

    if (!scheduleElement || !rangeElement) {
        return;
    }

    scheduleElement.innerHTML = `
        <tr class="week-loading-row">
            <td colspan="3">
                Đang tải lịch tuần...
            </td>
        </tr>
    `;

    const currentMonday =
        layNgayThuHai(new Date());

    const selectedMonday =
        themNgay(
            currentMonday,
            weekOffset * 7
        );

    const selectedSunday =
        themNgay(selectedMonday, 6);

    const weekRangeText =
        dinhDangKhoangTuan(
            selectedMonday,
            selectedSunday
        );

    rangeElement.innerHTML =
    weekOffset === 0
        ? `${weekRangeText}
           <span class="current-week-label">
               (Tuần này)
           </span>`
        : weekRangeText;

    try {
        const [
            settingsList,
            dailyPlans
        ] = await Promise.all([
            layTatCaCauHinhCaLam(),
            layKeHoachNgayTrongKhoang(
                selectedMonday,
                selectedSunday
            )
        ]);

        const dailyPlanMap =
            taoBanDoKeHoachNgay(dailyPlans);

        let weekHTML = "";

        for (
            let index = 0;
            index < 7;
            index += 1
        ) {
            const date =
                themNgay(
                    selectedMonday,
                    index
                );

            const planDate =
                dinhDangNgayISO(date);

            const settings =
                timCaLamChoNgay(
                    settingsList,
                    date
                );

            const dailyPlan =
                dailyPlanMap.get(planDate) || null;

            const selectedShift =
                dailyPlan
                    ? dailyPlan.work_shift
                    : layCaMacDinhChoNgay(
                        date,
                        settings
                    );

            const tasks =
                taoLichHocTheoCaDaChon(
                    date,
                    selectedShift
                );

            weekHTML += taoNgayHTML(
                date,
                DAY_NAMES[index],
                tasks,
                dailyPlan,
                selectedShift
            );
        }

        scheduleElement.innerHTML =
            weekHTML;
    } catch (error) {
        console.error(
            "Không thể tải lịch tuần:",
            error
        );

        scheduleElement.innerHTML = `
            <tr class="week-loading-row error">
                <td colspan="3">
                    Không thể tải lịch. Hãy kiểm tra mạng rồi thử lại.
                </td>
            </tr>
        `;
    }
}