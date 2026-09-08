const DAY_NAMES = [
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
    "Chủ Nhật"
];

const DISPLAY_TIMEZONE_STORAGE_KEY =
    "fubaoDisplayTimezone";

const VIETNAM_TIMEZONE =
    "Asia/Ho_Chi_Minh";

const JAPAN_TIMEZONE =
    "Asia/Tokyo";

let weekOffset = 0;

let scheduleTemplates = [];

const PERSONAL_PRESET_TITLES = {
    church: "Đi lễ",
    running: "Chạy bộ",
    shopping: "Đi mua đồ",
    friends: "Hẹn bạn bè",
    other: "Việc cá nhân khác"
};

const POMODORO_STUDY_MINUTES = 25;
const POMODORO_SHORT_BREAK_MINUTES = 5;


document.addEventListener(
    "DOMContentLoaded",
    function () {
        capNhatNhanMuiGio();

        setInterval(
            capNhatNhanMuiGio,
            30000
        );

        ganSuKienChuyenTuan();
        ganSuKienKeHoachTuan();
        ganSuKienLichCoDinh();
        ganSuKienSuaLichRiengNgay();
        hienThiLichTuan();
    }
);

function layMuiGioHienThi() {
    const savedTimezone =
        localStorage.getItem(
            DISPLAY_TIMEZONE_STORAGE_KEY
        );

    return savedTimezone === JAPAN_TIMEZONE
        ? JAPAN_TIMEZONE
        : VIETNAM_TIMEZONE;
}


function layDoLechHienThiPhut() {
    return layMuiGioHienThi() ===
        JAPAN_TIMEZONE
        ? 120
        : 0;
}


function capNhatNhanMuiGio() {
    const noteElement =
        document.getElementById(
            "weekTimezoneNote"
        );

    const helpElement =
        document.getElementById(
            "studyTimezoneHelp"
        );

    const timezone =
        layMuiGioHienThi();

    const now = new Date();

    const dateText =
        new Intl.DateTimeFormat(
            "vi-VN",
            {
                timeZone: timezone,
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        ).format(now);

    const timeText =
        new Intl.DateTimeFormat(
            "vi-VN",
            {
                timeZone: timezone,
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23"
            }
        ).format(now);

    const formattedDate =
        dateText.charAt(0).toUpperCase() +
        dateText.slice(1);

    if (noteElement) {
        noteElement.textContent =
            `${formattedDate} · ${timeText}`;
    }

    if (helpElement) {
        helpElement.textContent =
            timezone === JAPAN_TIMEZONE
                ? "Nhập theo giờ Việt Nam. App sẽ tự hiển thị theo giờ Nhật Bản."
                : "Nhập và lưu theo giờ Việt Nam.";
    }
}


function layCacPhanNgayTheoMuiGio(
    date,
    timezone
) {
    const formatter =
        new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone: timezone,
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }
        );

    const parts = {};

    formatter
        .formatToParts(date)
        .forEach(function (part) {
            if (part.type !== "literal") {
                parts[part.type] =
                    part.value;
            }
        });

    return parts;
}


function layNgayLichGocHienTai() {
    const parts =
        layCacPhanNgayTheoMuiGio(
            new Date(),
            VIETNAM_TIMEZONE
        );

    return new Date(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        12,
        0,
        0
    );
}


function chuyenMotMocGioHienThi(timeText) {
    const match =
        /^(\d{1,2}):(\d{2})$/.exec(
            String(timeText).trim()
        );

    if (!match) {
        return null;
    }

    const totalMinutes =
        Number(match[1]) * 60 +
        Number(match[2]) +
        layDoLechHienThiPhut();

    const dayOffset =
        Math.floor(totalMinutes / 1440);

    const minutesInDay =
        totalMinutes % 1440;

    const hours = String(
        Math.floor(minutesInDay / 60)
    ).padStart(2, "0");

    const minutes = String(
        minutesInDay % 60
    ).padStart(2, "0");

    return {
        text: `${hours}:${minutes}`,
        dayOffset: dayOffset
    };
}


function chuyenKhoangGioHienThi(timeRange) {
    const match =
        /^(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})$/.exec(
            String(timeRange).trim()
        );

    if (!match) {
        return timeRange;
    }

    const start =
        chuyenMotMocGioHienThi(
            match[1]
        );

    const end =
        chuyenMotMocGioHienThi(
            match[2]
        );

    if (!start || !end) {
        return timeRange;
    }

    let note = "";

    if (
        start.dayOffset !==
        end.dayOffset
    ) {
        note = " (sang ngày sau)";
    } else if (start.dayOffset === 1) {
        note = " (+1 ngày)";
    }

    return (
        `${start.text}–${end.text}${note}`
    );
}


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
    const today =
        layNgayLichGocHienTai();

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
        chuyenKhoangGioHienThi(
            "07:00–16:00"
        ),
        selectedShift
    )}

            ${taoOptionCaLam(
        "normal",
        chuyenKhoangGioHienThi(
            "09:00–18:00"
        ),
        selectedShift
    )}

            ${taoOptionCaLam(
        "afternoon",
        chuyenKhoangGioHienThi(
            "13:00–21:00"
        ),
        selectedShift
    )}
        </select>
    `;
}


function taoMucGioHocMacDinh(
    task,
    planDate
) {
    const displayTime =
        chuyenKhoangGioHienThi(
            task.time
        );


    return `
        <div class="week-study-item default editable">
            <span>
                ${baoVeNoiDungHTML(
        displayTime
    )}
            </span>

            <strong>
                ${baoVeNoiDungHTML(
        task.title
    )}
            </strong>

            <button
                class="edit-fixed-day-button"
                type="button"
                data-plan-date="${baoVeNoiDungHTML(
        planDate
    )}"
                data-template-id="${baoVeNoiDungHTML(
        task.templateId
    )}"
                aria-label="Sửa riêng ngày này"
            >
                ✎
            </button>

            <button
                class="delete-fixed-day-button"
                type="button"
                data-plan-date="${baoVeNoiDungHTML(
        planDate
    )}"
                data-template-id="${baoVeNoiDungHTML(
        task.templateId
    )}"
                aria-label="Xóa riêng ngày này"
            >
                ×
            </button>
        </div>
    `;
}


function layLoaiMucLich(slot) {
    return slot && slot.kind === "personal"
        ? "personal"
        : "study";
}


function taoMucLichTuThem(
    slot,
    planDate
) {
    const slotType =
        layLoaiMucLich(slot);

    let displayTime =
        chuyenKhoangGioHienThi(
            `${slot.start_time}–${slot.end_time}`
        );

    if (
        Number(slot.end_day_offset) > 0 &&
        !String(displayTime).includes("ngày")
    ) {
        displayTime += " (+1 ngày)";
    }

    const typeClass =
        slotType === "personal"
            ? "week-personal-item"
            : "";

    const detailText =
        slot.note ||
        (
            slotType === "study" &&
                Number(slot.pomodoro_sessions) > 0
                ? `${Number(
                    slot.pomodoro_sessions
                )} ca Pomodoro · 25 phút học/ca`
                : ""
        );

    const detailHTML =
        detailText
            ? `<small>${baoVeNoiDungHTML(
                detailText
            )}</small>`
            : "";

    return `
        <div class="week-study-item custom ${typeClass}">
            <span>
                ${baoVeNoiDungHTML(
        displayTime
    )}
            </span>

            <strong>
                ${baoVeNoiDungHTML(
        slot.title
    )}
            </strong>

            ${detailHTML}

            <button
                class="edit-study-slot-button"
                type="button"
                data-plan-date="${planDate}"
                data-slot-id="${baoVeNoiDungHTML(
        slot.id
    )}"
                aria-label="Chỉnh sửa kế hoạch"
            >
                ✎
            </button>

            <button
                class="delete-study-slot-button"
                type="button"
                data-plan-date="${planDate}"
                data-slot-id="${baoVeNoiDungHTML(
        slot.id
    )}"
                aria-label="Xóa kế hoạch"
            >
                ×
            </button>
        </div>
    `;
}

function laySoPhutBatDauTrongTuan(timeValue) {
    const match =
        String(timeValue || "")
            .match(/(\d{1,2}):(\d{2})/);

    if (!match) {
        return 9999;
    }

    return (
        Number(match[1]) * 60 +
        Number(match[2])
    );
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

    const customSlots =
        dailyPlan &&
            Array.isArray(
                dailyPlan.study_slots
            )
            ? dailyPlan.study_slots
            : [];

    const hiddenTemplateIds =
        new Set(
            customSlots
                .filter(
                    function (slot) {
                        return (
                            slot.kind ===
                            "template_hidden" ||
                            slot.source ===
                            "template_override"
                        );
                    }
                )
                .map(
                    function (slot) {
                        return String(
                            slot.template_id
                        );
                    }
                )
        );


    const visibleDefaultStudyTasks =
        defaultStudyTasks.filter(
            function (task) {
                return !hiddenTemplateIds.has(
                    String(task.templateId)
                );
            }
        );


    const customStudySlots =
        customSlots.filter(
            function (slot) {
                return (
                    slot.kind !==
                    "template_hidden" &&
                    layLoaiMucLich(slot) ===
                    "study"
                );
            }
        );

    const personalSlots =
        customSlots.filter(
            function (slot) {
                return (
                    layLoaiMucLich(slot) ===
                    "personal"
                );
            }
        );

    const allStudyItems = [
        ...visibleDefaultStudyTasks.map(
            function (task) {
                return {
                    startTime: task.time,
                    html:
                        taoMucGioHocMacDinh(
                            task,
                            planDate
                        )
                };
            }
        ),

        ...customStudySlots.map(
            function (slot) {
                return {
                    startTime:
                        slot.start_time,
                    html:
                        taoMucLichTuThem(
                            slot,
                            planDate
                        )
                };
            }
        )
    ];

    allStudyItems.sort(
        function (itemA, itemB) {
            return (
                laySoPhutBatDauTrongTuan(
                    itemA.startTime
                ) -
                laySoPhutBatDauTrongTuan(
                    itemB.startTime
                )
            );
        }
    );

    let studyHTML =
        allStudyItems
            .map(function (item) {
                return item.html;
            })
            .join("");

    if (!studyHTML) {
        studyHTML = `
            <small class="week-no-study">
                Chưa có giờ học
            </small>
        `;
    }

    const sortedPersonalSlots =
        [...personalSlots].sort(
            function (slotA, slotB) {
                return (
                    laySoPhutBatDauTrongTuan(
                        slotA.start_time
                    ) -
                    laySoPhutBatDauTrongTuan(
                        slotB.start_time
                    )
                );
            }
        );

    let personalHTML =
        sortedPersonalSlots
            .map(
                function (slot) {
                    return taoMucLichTuThem(
                        slot,
                        planDate
                    );
                }
            )
            .join("");

    if (!personalHTML) {
        personalHTML = `
            <small class="week-no-study">
                Chưa có việc riêng
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
                <section class="week-plan-group">
                    <p class="week-plan-group-title">
                        HỌC TẬP
                    </p>

                    <div class="week-study-list">
                        ${studyHTML}
                    </div>

                    <button
                        class="add-study-slot-button"
                        type="button"
                        data-plan-date="${planDate}"
                        data-day-name="${dayName}"
                        data-slot-type="study"
                    >
                        ＋ Thêm giờ học
                    </button>
                </section>

                <section class="week-plan-group">
                    <p class="week-plan-group-title">
                        VIỆC RIÊNG
                    </p>

                    <div class="week-study-list">
                        ${personalHTML}
                    </div>

                    <button
                        class="add-study-slot-button"
                        type="button"
                        data-plan-date="${planDate}"
                        data-day-name="${dayName}"
                        data-slot-type="personal"
                    >
                        ＋ Thêm việc riêng
                    </button>
                </section>
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
   CỬA SỔ THÊM / SỬA KẾ HOẠCH
========================= */

function congPhutVaoGio(
    timeText,
    addedMinutes
) {
    const match =
        /^(\d{2}):(\d{2})$/.exec(
            String(timeText || "")
        );

    if (!match) {
        return null;
    }

    const totalMinutes =
        Number(match[1]) * 60 +
        Number(match[2]) +
        Number(addedMinutes || 0);

    const minutesInDay =
        ((totalMinutes % 1440) + 1440) %
        1440;

    return {
        time:
            `${String(
                Math.floor(minutesInDay / 60)
            ).padStart(2, "0")}:${String(
                minutesInDay % 60
            ).padStart(2, "0")}`,
        dayOffset:
            Math.floor(totalMinutes / 1440)
    };
}


function tinhGioKetThucPomodoro() {
    const startInput =
        document.getElementById(
            "studyStartTime"
        );

    const sessionsInput =
        document.getElementById(
            "pomodoroSessions"
        );

    const endOutput =
        document.getElementById(
            "studyEndTimeText"
        );

    const summary =
        document.getElementById(
            "pomodoroSummary"
        );

    if (
        !startInput ||
        !sessionsInput ||
        !endOutput
    ) {
        return null;
    }

    const sessions =
        Number(sessionsInput.value || 2);

    /* Theo yêu cầu: mỗi ca chiếm 30 phút,
       gồm 25 phút học và 5 phút nghỉ. */
    const totalMinutes =
        sessions *
        (
            POMODORO_STUDY_MINUTES +
            POMODORO_SHORT_BREAK_MINUTES
        );

    const result =
        congPhutVaoGio(
            startInput.value,
            totalMinutes
        );

    if (!result) {
        endOutput.value = "--:--";
        endOutput.textContent = "--:--";
        return null;
    }

    const endText =
        result.dayOffset > 0
            ? `${result.time} (+1 ngày)`
            : result.time;

    endOutput.value = endText;
    endOutput.textContent = endText;

    if (summary) {
        summary.textContent =
            `${sessions} ca: ` +
            `${sessions * POMODORO_STUDY_MINUTES} phút học, ` +
            `${sessions * POMODORO_SHORT_BREAK_MINUTES} phút nghỉ ` +
            `· Kết thúc ${endText}. ` +
            "Sau 4 ca liên tục sẽ nghỉ dài 30 phút.";
    }

    return result;
}


function capNhatLoaiBieuMau() {
    const typeInput =
        document.getElementById(
            "scheduleItemType"
        );

    const studyFields =
        document.getElementById(
            "studyScheduleFields"
        );

    const personalFields =
        document.getElementById(
            "personalScheduleFields"
        );

    const modalTitle =
        document.getElementById(
            "studySlotModalTitle"
        );

    if (
        !typeInput ||
        !studyFields ||
        !personalFields
    ) {
        return;
    }

    const isPersonal =
        typeInput.value === "personal";

    studyFields.classList.toggle(
        "is-hidden",
        isPersonal
    );

    personalFields.classList.toggle(
        "is-hidden",
        !isPersonal
    );

    if (modalTitle) {
        const isEditing =
            Boolean(
                document.getElementById(
                    "studySlotId"
                ).value
            );

        modalTitle.textContent =
            `${isEditing ? "Sửa" : "Thêm"} ` +
            `${isPersonal ? "việc riêng" : "giờ học"}`;
    }

    if (!isPersonal) {
        tinhGioKetThucPomodoro();
    }
}


function capNhatOTheoCongViecRieng() {
    const presetInput =
        document.getElementById(
            "personalPreset"
        );

    const customGroup =
        document.getElementById(
            "personalCustomTitleGroup"
        );

    if (!presetInput || !customGroup) {
        return;
    }

    customGroup.classList.toggle(
        "is-hidden",
        presetInput.value !== "other"
    );
}


function hienThiCuaSoKeHoach(
    planDate,
    dayName,
    slotType,
    slot
) {
    const modal =
        document.getElementById(
            "studySlotModal"
        );

    const form =
        document.getElementById(
            "studySlotForm"
        );

    if (!modal || !form) {
        return;
    }

    form.reset();

    const dateParts =
        planDate.split("-");

    const displayDate =
        `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

    document.getElementById(
        "studySlotDate"
    ).value = planDate;

    document.getElementById(
        "studySlotId"
    ).value = slot ? slot.id : "";

    document.getElementById(
        "studySlotDateLabel"
    ).textContent =
        `${dayName || "Kế hoạch"} · ${displayDate}`;

    const selectedType =
        slot
            ? layLoaiMucLich(slot)
            : slotType || "study";

    document.getElementById(
        "scheduleItemType"
    ).value = selectedType;

    const saveButton =
        document.getElementById(
            "saveStudySlotButton"
        );

    if (saveButton) {
        saveButton.textContent = slot
            ? "Lưu thay đổi"
            : "＋ Thêm vào lịch";
    }

    if (slot && selectedType === "study") {
        document.getElementById(
            "studyStartTime"
        ).value = slot.start_time || "";

        document.getElementById(
            "pomodoroSessions"
        ).value = String(
            slot.pomodoro_sessions || 2
        );

        document.getElementById(
            "studyTitle"
        ).value = slot.title || "Tự học N5";
    }

    if (slot && selectedType === "personal") {
        const preset =
            Object.entries(
                PERSONAL_PRESET_TITLES
            ).find(
                function (entry) {
                    return (
                        entry[0] !== "other" &&
                        entry[1] === slot.title
                    );
                }
            );

        document.getElementById(
            "personalPreset"
        ).value = preset
                ? preset[0]
                : "other";

        document.getElementById(
            "personalCustomTitle"
        ).value = preset
                ? ""
                : slot.title || "";

        document.getElementById(
            "personalStartTime"
        ).value = slot.start_time || "";

        document.getElementById(
            "personalEndTime"
        ).value = slot.end_time || "";

        document.getElementById(
            "personalNote"
        ).value = slot.note || "";
    }

    capNhatLoaiBieuMau();
    capNhatOTheoCongViecRieng();

    modal.classList.add("open");
    document.body.classList.add(
        "modal-open"
    );
}


function moCuaSoThemGioHoc(button) {
    hienThiCuaSoKeHoach(
        button.dataset.planDate,
        button.dataset.dayName,
        button.dataset.slotType,
        null
    );
}


async function moCuaSoChinhSuaKeHoach(
    button
) {
    try {
        const dailyPlan =
            await layKeHoachMotNgay(
                button.dataset.planDate
            );

        const slots =
            dailyPlan &&
                Array.isArray(
                    dailyPlan.study_slots
                )
                ? dailyPlan.study_slots
                : [];

        const slot =
            slots.find(
                function (item) {
                    return (
                        String(item.id) ===
                        String(
                            button.dataset.slotId
                        )
                    );
                }
            );

        if (!slot) {
            alert(
                "Không tìm thấy kế hoạch cần sửa."
            );
            return;
        }

        hienThiCuaSoKeHoach(
            button.dataset.planDate,
            "Chỉnh sửa",
            layLoaiMucLich(slot),
            slot
        );
    } catch (error) {
        console.error(
            "Không thể mở kế hoạch:",
            error
        );

        alert(
            "Chưa mở được kế hoạch để chỉnh sửa."
        );
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
   XỬ LÝ LƯU GIỜ HỌC / VIỆC RIÊNG
========================= */

async function xuLyThemGioHoc(event) {
    event.preventDefault();

    const planDate =
        document.getElementById(
            "studySlotDate"
        ).value;

    const slotId =
        document.getElementById(
            "studySlotId"
        ).value;

    const slotType =
        document.getElementById(
            "scheduleItemType"
        ).value;

    const saveButton =
        document.getElementById(
            "saveStudySlotButton"
        );

    let slotData = null;

    if (slotType === "study") {
        const startTime =
            document.getElementById(
                "studyStartTime"
            ).value;

        const title =
            document.getElementById(
                "studyTitle"
            ).value.trim();

        const sessions =
            Number(
                document.getElementById(
                    "pomodoroSessions"
                ).value
            );

        const endResult =
            tinhGioKetThucPomodoro();

        if (
            !planDate ||
            !startTime ||
            !title ||
            ![2, 3].includes(sessions) ||
            !endResult
        ) {
            alert(
                "Hãy chọn giờ bắt đầu, số ca và nội dung học."
            );
            return;
        }

        slotData = {
            id:
                slotId ||
                `${Date.now()}-${Math.random()
                    .toString(16)
                    .slice(2)}`,
            kind: "study",
            start_time: startTime,
            end_time: endResult.time,
            end_day_offset:
                endResult.dayOffset,
            title: title,
            pomodoro_sessions: sessions,
            session_minutes:
                POMODORO_STUDY_MINUTES,
            short_break_minutes:
                POMODORO_SHORT_BREAK_MINUTES
        };
    } else {
        const preset =
            document.getElementById(
                "personalPreset"
            ).value;

        const customTitle =
            document.getElementById(
                "personalCustomTitle"
            ).value.trim();

        const startTime =
            document.getElementById(
                "personalStartTime"
            ).value;

        const endTime =
            document.getElementById(
                "personalEndTime"
            ).value;

        const note =
            document.getElementById(
                "personalNote"
            ).value.trim();

        const title =
            preset === "other"
                ? customTitle
                : PERSONAL_PRESET_TITLES[
                preset
                ];

        if (
            !planDate ||
            !startTime ||
            !endTime ||
            !title
        ) {
            alert(
                "Hãy nhập đầy đủ công việc và thời gian."
            );
            return;
        }

        if (endTime <= startTime) {
            alert(
                "Giờ kết thúc phải sau giờ bắt đầu."
            );
            return;
        }

        slotData = {
            id:
                slotId ||
                `${Date.now()}-${Math.random()
                    .toString(16)
                    .slice(2)}`,
            kind: "personal",
            preset: preset,
            start_time: startTime,
            end_time: endTime,
            title: title,
            note: note
        };
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
                ? [...dailyPlan.study_slots]
                : [];

        const existingIndex =
            studySlots.findIndex(
                function (slot) {
                    return (
                        String(slot.id) ===
                        String(slotId)
                    );
                }
            );

        if (existingIndex >= 0) {
            studySlots[existingIndex] =
                slotData;
        } else {
            studySlots.push(slotData);
        }

        studySlots.sort(
            function (firstSlot, secondSlot) {
                return String(
                    firstSlot.start_time || ""
                ).localeCompare(
                    String(
                        secondSlot.start_time || ""
                    )
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
            "Không thể lưu kế hoạch:",
            error
        );

        alert(
            "Chưa lưu được kế hoạch. Hãy kiểm tra mạng rồi thử lại."
        );
    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent =
                slotId
                    ? "Lưu thay đổi"
                    : "＋ Thêm vào lịch";
        }
    }
}


/* =========================
   XỬ LÝ XÓA KẾ HOẠCH
========================= */

async function xuLyXoaGioHoc(button) {
    const planDate =
        button.dataset.planDate;

    const slotId =
        button.dataset.slotId;

    const confirmed =
        window.confirm(
            "Xóa kế hoạch này?"
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
            "Không thể xóa kế hoạch:",
            error
        );

        alert(
            "Chưa xóa được kế hoạch. Hãy thử lại."
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

    const typeInput =
        document.getElementById(
            "scheduleItemType"
        );

    const startInput =
        document.getElementById(
            "studyStartTime"
        );

    const sessionsInput =
        document.getElementById(
            "pomodoroSessions"
        );

    const presetInput =
        document.getElementById(
            "personalPreset"
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
                const editFixedButton =
                    event.target.closest(
                        ".edit-fixed-day-button"
                    );

                if (editFixedButton) {
                    moFormSuaLichRiengNgay(
                        editFixedButton
                    );

                    return;
                }


                const deleteFixedButton =
                    event.target.closest(
                        ".delete-fixed-day-button"
                    );

                if (deleteFixedButton) {
                    xuLyXoaLichCoDinhTrongNgay(
                        deleteFixedButton
                    );

                    return;
                }

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

                const editButton =
                    event.target.closest(
                        ".edit-study-slot-button"
                    );

                if (editButton) {
                    moCuaSoChinhSuaKeHoach(
                        editButton
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

    if (typeInput) {
        typeInput.addEventListener(
            "change",
            capNhatLoaiBieuMau
        );
    }

    if (startInput) {
        startInput.addEventListener(
            "input",
            tinhGioKetThucPomodoro
        );
    }

    if (sessionsInput) {
        sessionsInput.addEventListener(
            "change",
            tinhGioKetThucPomodoro
        );
    }

    if (presetInput) {
        presetInput.addEventListener(
            "change",
            capNhatOTheoCongViecRieng
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
        document.getElementById(
            "weekSchedule"
        );

    const rangeElement =
        document.getElementById(
            "weekRange"
        );

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
        layNgayThuHai(
            layNgayLichGocHienTai()
        );

    const selectedMonday =
        themNgay(
            currentMonday,
            weekOffset * 7
        );

    const selectedSunday =
        themNgay(
            selectedMonday,
            6
        );

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
            dailyPlans,
            weeklyTemplates
        ] = await Promise.all([
            layTatCaCauHinhCaLam(),

            layKeHoachNgayTrongKhoang(
                selectedMonday,
                selectedSunday
            ),

            layLichCoDinhTrongKhoang(
                selectedMonday,
                selectedSunday
            )
        ]);

        const dailyPlanMap =
            taoBanDoKeHoachNgay(
                dailyPlans
            );

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
                dailyPlanMap.get(
                    planDate
                ) || null;

            const selectedShift =
                dailyPlan
                    ? dailyPlan.work_shift
                    : layCaMacDinhChoNgay(
                        date,
                        settings
                    );

            /*
 * Chỉ giữ phần ca làm từ lịch cũ.
 * Phần học tập sẽ lấy từ Supabase.
 */
            const workTasks =
                taoLichHocTheoCaDaChon(
                    date,
                    selectedShift
                ).filter(
                    function (task) {
                        return (
                            task.type ===
                            "work"
                        );
                    }
                );


            const fixedStudyTasks =
                layLichCoDinhChoNgay(
                    date,
                    selectedShift,
                    weeklyTemplates
                );


            const tasks = [
                ...workTasks,
                ...fixedStudyTasks
            ];

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

/* =========================
   CỬA SỔ QUẢN LÝ LỊCH CỐ ĐỊNH
========================= */

function ganSuKienLichCoDinh() {
    const openButton =
        document.getElementById(
            "openScheduleTemplateButton"
        );

    const closeButton =
        document.getElementById(
            "closeScheduleTemplateButton"
        );

    const addButton =
        document.getElementById(
            "addScheduleTemplateButton"
        );

    const cancelButton =
        document.getElementById(
            "cancelScheduleTemplateButton"
        );

    const modal =
        document.getElementById(
            "scheduleTemplateModal"
        );

    const form =
        document.getElementById(
            "scheduleTemplateForm"
        );

    const listElement =
        document.getElementById(
            "scheduleTemplateList"
        );


    if (openButton) {
        openButton.addEventListener(
            "click",
            moCuaSoLichCoDinh
        );
    }


    if (closeButton) {
        closeButton.addEventListener(
            "click",
            dongCuaSoLichCoDinh
        );
    }


    if (addButton) {
        addButton.addEventListener(
            "click",
            moFormThemLichCoDinh
        );
    }


    if (cancelButton) {
        cancelButton.addEventListener(
            "click",
            quayLaiDanhSachLichCoDinh
        );
    }


    if (modal) {
        modal.addEventListener(
            "click",
            function (event) {
                if (event.target === modal) {
                    dongCuaSoLichCoDinh();
                }
            }
        );
    }

    if (form) {
        form.addEventListener(
            "submit",
            xuLyLuuLichCoDinh
        );
    }


    if (listElement) {
        listElement.addEventListener(
            "click",
            function (event) {
                const editButton =
                    event.target.closest(
                        ".edit-template-button"
                    );

                if (editButton) {
                    moFormSuaLichCoDinh(
                        editButton.dataset
                            .templateId
                    );

                    return;
                }


                const deleteButton =
                    event.target.closest(
                        ".delete-template-button"
                    );

                if (deleteButton) {
                    xuLyXoaLichCoDinh(
                        deleteButton.dataset
                            .templateId
                    );
                }
            }
        );
    }
}


async function moCuaSoLichCoDinh() {
    const modal =
        document.getElementById(
            "scheduleTemplateModal"
        );

    if (!modal) {
        return;
    }


    quayLaiDanhSachLichCoDinh();

    modal.classList.add("open");

    document.body.classList.add(
        "modal-open"
    );

    await taiDanhSachLichCoDinh();
}


function dongCuaSoLichCoDinh() {
    const modal =
        document.getElementById(
            "scheduleTemplateModal"
        );

    if (!modal) {
        return;
    }


    modal.classList.remove("open");

    document.body.classList.remove(
        "modal-open"
    );
}


function moFormThemLichCoDinh() {
    const listSection =
        document.getElementById(
            "scheduleTemplateListSection"
        );

    const form =
        document.getElementById(
            "scheduleTemplateForm"
        );

    const idInput =
        document.getElementById(
            "scheduleTemplateId"
        );

    const iconInput =
        document.getElementById(
            "scheduleTemplateIcon"
        );

    const fromInput =
        document.getElementById(
            "scheduleTemplateFrom"
        );

    const toInput =
        document.getElementById(
            "scheduleTemplateTo"
        );

    const messageElement =
        document.getElementById(
            "scheduleTemplateMessage"
        );


    if (!listSection || !form) {
        return;
    }


    form.reset();

    if (idInput) {
        idInput.value = "";
    }

    if (iconInput) {
        iconInput.value = "📖";
    }

    if (fromInput) {
        fromInput.value =
            dinhDangNgayISO(
                new Date()
            );
    }

    if (toInput) {
        toInput.value = "";
    }

    if (messageElement) {
        messageElement.textContent = "";
    }


    listSection.classList.add(
        "is-hidden"
    );

    form.classList.remove(
        "is-hidden"
    );
}


function quayLaiDanhSachLichCoDinh() {
    const listSection =
        document.getElementById(
            "scheduleTemplateListSection"
        );

    const form =
        document.getElementById(
            "scheduleTemplateForm"
        );


    if (listSection) {
        listSection.classList.remove(
            "is-hidden"
        );
    }

    if (form) {
        form.classList.add(
            "is-hidden"
        );
    }
}

/* =========================
   TẢI DANH SÁCH LỊCH CỐ ĐỊNH
========================= */

async function taiDanhSachLichCoDinh() {
    const listElement =
        document.getElementById(
            "scheduleTemplateList"
        );


    if (!listElement) {
        return;
    }


    listElement.innerHTML = `
        <p class="schedule-template-empty">
            Đang tải lịch cố định...
        </p>
    `;


    const {
        data,
        error
    } = await supabaseClient
        .from(
            "diquy_schedule_templates"
        )
        .select(`
            id,
            weekday,
            shift_type,
            icon,
            start_time,
            end_time,
            title,
            description,
            item_type,
            effective_from,
            effective_to,
            sort_order
        `)
        .order(
            "effective_from",
            {
                ascending: true
            }
        )
        .order(
            "weekday",
            {
                ascending: true
            }
        )
        .order(
            "start_time",
            {
                ascending: true
            }
        );


    if (error) {
        console.error(
            "Không tải được lịch cố định:",
            error
        );

        listElement.innerHTML = `
            <p class="schedule-template-empty">
                Không tải được lịch cố định.
            </p>
        `;

        return;
    }


    scheduleTemplates =
        Array.isArray(data)
            ? data
            : [];


    hienThiDanhSachLichCoDinh();
}


function hienThiDanhSachLichCoDinh() {
    const listElement =
        document.getElementById(
            "scheduleTemplateList"
        );


    if (!listElement) {
        return;
    }


    if (scheduleTemplates.length === 0) {
        listElement.innerHTML = `
            <p class="schedule-template-empty">
                Chưa có lịch cố định.
            </p>
        `;

        return;
    }


    listElement.innerHTML =
        scheduleTemplates
            .map(
                taoTheLichCoDinhHTML
            )
            .join("");
}


function taoTheLichCoDinhHTML(template) {
    const weekdayText =
        layTenThuTheoGiaTri(
            template.weekday
        );

    const shiftText =
        layTenCaLichCoDinh(
            template.shift_type
        );

    const startTime =
        String(
            template.start_time || ""
        ).slice(0, 5);

    const endTime =
        String(
            template.end_time || ""
        ).slice(0, 5);

    const effectiveTo =
        template.effective_to ||
        "Không giới hạn";


    return `
        <article class="schedule-template-card">
            <div class="schedule-template-card-content">
                <h3>
                    ${baoVeNoiDungHTML(
        template.icon || "📖"
    )}
                    ${baoVeNoiDungHTML(
        template.title
    )}
                </h3>

                <p>
                    ${baoVeNoiDungHTML(
        weekdayText
    )}
                    ·
                    ${baoVeNoiDungHTML(
        startTime
    )}–${baoVeNoiDungHTML(
        endTime
    )}
                </p>

                <p>
                    ${baoVeNoiDungHTML(
        shiftText
    )}
                </p>

                <p>
                    ${baoVeNoiDungHTML(
        template.effective_from
    )}
                    →
                    ${baoVeNoiDungHTML(
        effectiveTo
    )}
                </p>
            </div>

            <div class="schedule-template-card-actions">
                <button
                    class="edit-template-button"
                    type="button"
                    data-template-id="${baoVeNoiDungHTML(
        template.id
    )}"
                    aria-label="Sửa lịch"
                >
                    ✎
                </button>

                <button
                    class="delete-template-button"
                    type="button"
                    data-template-id="${baoVeNoiDungHTML(
        template.id
    )}"
                    aria-label="Xóa lịch"
                >
                    ×
                </button>
            </div>
        </article>
    `;
}


function layTenThuTheoGiaTri(weekday) {
    const names = {
        0: "Chủ Nhật",
        1: "Thứ Hai",
        2: "Thứ Ba",
        3: "Thứ Tư",
        4: "Thứ Năm",
        5: "Thứ Sáu",
        6: "Thứ Bảy"
    };

    return names[
        Number(weekday)
    ] || "Không rõ";
}


function layTenCaLichCoDinh(shiftType) {
    const names = {
        any: "Mọi ca",
        riki: "Ngày học Riki",
        morning: "Ca sáng",
        normal: "Ca thường",
        afternoon: "Ca chiều",
        off: "Ngày nghỉ"
    };

    return names[shiftType] ||
        "Mọi ca";
}

/* =========================
   LƯU LỊCH CỐ ĐỊNH
========================= */

async function xuLyLuuLichCoDinh(event) {
    event.preventDefault();


    const id =
        document.getElementById(
            "scheduleTemplateId"
        ).value;

    const title =
        document.getElementById(
            "scheduleTemplateTitle"
        ).value.trim();

    const startTime =
        document.getElementById(
            "scheduleTemplateStartTime"
        ).value;

    const endTime =
        document.getElementById(
            "scheduleTemplateEndTime"
        ).value;

    const weekday =
        Number(
            document.getElementById(
                "scheduleTemplateWeekday"
            ).value
        );

    const shiftType =
        document.getElementById(
            "scheduleTemplateShift"
        ).value;

    const effectiveFrom =
        document.getElementById(
            "scheduleTemplateFrom"
        ).value;

    const effectiveTo =
        document.getElementById(
            "scheduleTemplateTo"
        ).value;

    const icon =
        document.getElementById(
            "scheduleTemplateIcon"
        ).value.trim() || "📖";

    const description =
        document.getElementById(
            "scheduleTemplateDescription"
        ).value.trim();

    const messageElement =
        document.getElementById(
            "scheduleTemplateMessage"
        );

    const submitButton =
        event.submitter;


    if (
        !title ||
        !startTime ||
        !endTime ||
        !effectiveFrom
    ) {
        messageElement.textContent =
            "Hãy nhập đầy đủ nội dung, giờ và ngày bắt đầu.";

        return;
    }


    if (endTime <= startTime) {
        messageElement.textContent =
            "Giờ kết thúc phải sau giờ bắt đầu.";

        return;
    }


    if (
        effectiveTo &&
        effectiveTo < effectiveFrom
    ) {
        messageElement.textContent =
            "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.";

        return;
    }


    const payload = {
        weekday,
        shift_type: shiftType,
        icon,
        start_time: startTime,
        end_time: endTime,
        title,
        description:
            description || null,
        item_type: "study",
        effective_from:
            effectiveFrom,
        effective_to:
            effectiveTo || null
    };


    messageElement.textContent =
        "Đang lưu...";

    if (submitButton) {
        submitButton.disabled = true;
    }


    let error;

    if (id) {
        const result =
            await supabaseClient
                .from(
                    "diquy_schedule_templates"
                )
                .update({
                    ...payload,
                    updated_at:
                        new Date()
                            .toISOString()
                })
                .eq(
                    "id",
                    id
                );

        error = result.error;
    } else {
        const result =
            await supabaseClient
                .from(
                    "diquy_schedule_templates"
                )
                .insert(payload);

        error = result.error;
    }


    if (submitButton) {
        submitButton.disabled = false;
    }


    if (error) {
        console.error(
            "Không lưu được lịch cố định:",
            error
        );

        messageElement.textContent =
            error.message ||
            "Không lưu được lịch cố định.";

        return;
    }


    await taiDanhSachLichCoDinh();

    quayLaiDanhSachLichCoDinh();

    await hienThiLichTuan();
}


/* =========================
   SỬA LỊCH CỐ ĐỊNH
========================= */

function moFormSuaLichCoDinh(
    templateId
) {
    const template =
        scheduleTemplates.find(
            function (item) {
                return (
                    item.id ===
                    templateId
                );
            }
        );


    if (!template) {
        return;
    }


    const listSection =
        document.getElementById(
            "scheduleTemplateListSection"
        );

    const form =
        document.getElementById(
            "scheduleTemplateForm"
        );


    document.getElementById(
        "scheduleTemplateId"
    ).value = template.id;

    document.getElementById(
        "scheduleTemplateTitle"
    ).value = template.title || "";

    document.getElementById(
        "scheduleTemplateStartTime"
    ).value =
        String(
            template.start_time || ""
        ).slice(0, 5);

    document.getElementById(
        "scheduleTemplateEndTime"
    ).value =
        String(
            template.end_time || ""
        ).slice(0, 5);

    document.getElementById(
        "scheduleTemplateWeekday"
    ).value =
        String(template.weekday);

    document.getElementById(
        "scheduleTemplateShift"
    ).value =
        template.shift_type || "any";

    document.getElementById(
        "scheduleTemplateFrom"
    ).value =
        template.effective_from || "";

    document.getElementById(
        "scheduleTemplateTo"
    ).value =
        template.effective_to || "";

    document.getElementById(
        "scheduleTemplateIcon"
    ).value =
        template.icon || "📖";

    document.getElementById(
        "scheduleTemplateDescription"
    ).value =
        template.description || "";

    document.getElementById(
        "scheduleTemplateMessage"
    ).textContent = "";


    listSection.classList.add(
        "is-hidden"
    );

    form.classList.remove(
        "is-hidden"
    );
}


/* =========================
   XÓA LỊCH CỐ ĐỊNH
========================= */

async function xuLyXoaLichCoDinh(
    templateId
) {
    const template =
        scheduleTemplates.find(
            function (item) {
                return (
                    item.id ===
                    templateId
                );
            }
        );


    if (!template) {
        return;
    }


    const confirmed =
        window.confirm(
            `Xóa lịch "${template.title}"?`
        );


    if (!confirmed) {
        return;
    }


    const {
        error
    } = await supabaseClient
        .from(
            "diquy_schedule_templates"
        )
        .delete()
        .eq(
            "id",
            templateId
        );


    if (error) {
        console.error(
            "Không xóa được lịch cố định:",
            error
        );

        alert(
            error.message ||
            "Không xóa được lịch cố định."
        );

        return;
    }


    await taiDanhSachLichCoDinh();

    await hienThiLichTuan();
}

/* =========================
   LỊCH CỐ ĐỊNH TRONG TUẦN
========================= */

async function layLichCoDinhTrongKhoang(
    startDate,
    endDate
) {
    const startText =
        dinhDangNgayISO(startDate);

    const endText =
        dinhDangNgayISO(endDate);


    const {
        data,
        error
    } = await supabaseClient
        .from(
            "diquy_schedule_templates"
        )
        .select(`
            id,
            weekday,
            shift_type,
            icon,
            start_time,
            end_time,
            title,
            description,
            item_type,
            effective_from,
            effective_to,
            sort_order
        `)
        .lte(
            "effective_from",
            endText
        )
        .or(
            `effective_to.is.null,effective_to.gte.${startText}`
        )
        .order(
            "sort_order",
            {
                ascending: true
            }
        )
        .order(
            "start_time",
            {
                ascending: true
            }
        );


    if (error) {
        throw error;
    }


    return Array.isArray(data)
        ? data
        : [];
}


function layLichCoDinhChoNgay(
    date,
    selectedShift,
    templates
) {
    const planDate =
        dinhDangNgayISO(date);

    const weekday =
        date.getDay();

    const isRikiDay =
        weekday === 1 ||
        weekday === 3 ||
        weekday === 5;


    return templates
        .filter(
            function (template) {
                const correctWeekday =
                    Number(
                        template.weekday
                    ) === weekday;

                const afterStart =
                    planDate >=
                    template.effective_from;

                const beforeEnd =
                    !template.effective_to ||
                    planDate <=
                    template.effective_to;

                const correctShift =
                    template.shift_type ===
                    "any" ||
                    template.shift_type ===
                    selectedShift ||
                    (
                        template.shift_type ===
                        "riki" &&
                        isRikiDay
                    );


                return (
                    correctWeekday &&
                    afterStart &&
                    beforeEnd &&
                    correctShift
                );
            }
        )
        .map(
            function (template) {
                const startTime =
                    String(
                        template.start_time ||
                        ""
                    ).slice(0, 5);

                const endTime =
                    String(
                        template.end_time ||
                        ""
                    ).slice(0, 5);


                const task =
                    taoCongViec(
                        template.icon || "📖",
                        `${startTime}–${endTime}`,
                        template.title,
                        template.description || "",
                        template.item_type ||
                        "study"
                    );


                task.templateId =
                    template.id;


                return task;
            }
        );
}

/* =========================
   SỬA LỊCH CỐ ĐỊNH RIÊNG MỘT NGÀY
========================= */

function ganSuKienSuaLichRiengNgay() {
    const modal =
        document.getElementById(
            "dailyTemplateOverrideModal"
        );

    const closeButton =
        document.getElementById(
            "closeDailyTemplateOverrideButton"
        );

    const cancelButton =
        document.getElementById(
            "cancelDailyTemplateOverrideButton"
        );

    const form =
        document.getElementById(
            "dailyTemplateOverrideForm"
        );


    if (closeButton) {
        closeButton.addEventListener(
            "click",
            dongFormSuaLichRiengNgay
        );
    }


    if (cancelButton) {
        cancelButton.addEventListener(
            "click",
            dongFormSuaLichRiengNgay
        );
    }


    if (form) {
        form.addEventListener(
            "submit",
            xuLyLuuLichRiengNgay
        );
    }


    if (modal) {
        modal.addEventListener(
            "click",
            function (event) {
                if (event.target === modal) {
                    dongFormSuaLichRiengNgay();
                }
            }
        );
    }
}


async function moFormSuaLichRiengNgay(
    button
) {
    const planDate =
        button.dataset.planDate;

    const templateId =
        button.dataset.templateId;

    const modal =
        document.getElementById(
            "dailyTemplateOverrideModal"
        );

    const messageElement =
        document.getElementById(
            "dailyOverrideMessage"
        );


    if (
        !planDate ||
        !templateId ||
        !modal
    ) {
        return;
    }


    button.disabled = true;


    const {
        data,
        error
    } = await supabaseClient
        .from(
            "diquy_schedule_templates"
        )
        .select(`
            id,
            icon,
            start_time,
            end_time,
            title,
            description
        `)
        .eq(
            "id",
            templateId
        )
        .single();


    button.disabled = false;


    if (error || !data) {
        console.error(
            "Không tải được lịch cần sửa:",
            error
        );

        alert(
            "Không tải được lịch cần sửa."
        );

        return;
    }


    document.getElementById(
        "dailyOverridePlanDate"
    ).value = planDate;

    document.getElementById(
        "dailyOverrideTemplateId"
    ).value = templateId;

    document.getElementById(
        "dailyOverrideTitle"
    ).value = data.title || "";

    document.getElementById(
        "dailyOverrideStartTime"
    ).value =
        String(
            data.start_time || ""
        ).slice(0, 5);

    document.getElementById(
        "dailyOverrideEndTime"
    ).value =
        String(
            data.end_time || ""
        ).slice(0, 5);

    document.getElementById(
        "dailyOverrideNote"
    ).value =
        data.description || "";

    document.getElementById(
        "dailyTemplateOverrideDate"
    ).textContent =
        `Ngày ${planDate}`;

    if (messageElement) {
        messageElement.textContent = "";
    }


    modal.dataset.icon =
        data.icon || "📖";

    modal.classList.add("open");

    document.body.classList.add(
        "modal-open"
    );
}


function dongFormSuaLichRiengNgay() {
    const modal =
        document.getElementById(
            "dailyTemplateOverrideModal"
        );

    if (!modal) {
        return;
    }


    modal.classList.remove("open");

    document.body.classList.remove(
        "modal-open"
    );
}


async function xuLyLuuLichRiengNgay(
    event
) {
    event.preventDefault();


    const planDate =
        document.getElementById(
            "dailyOverridePlanDate"
        ).value;

    const templateId =
        document.getElementById(
            "dailyOverrideTemplateId"
        ).value;

    const title =
        document.getElementById(
            "dailyOverrideTitle"
        ).value.trim();

    const startTime =
        document.getElementById(
            "dailyOverrideStartTime"
        ).value;

    const endTime =
        document.getElementById(
            "dailyOverrideEndTime"
        ).value;

    const note =
        document.getElementById(
            "dailyOverrideNote"
        ).value.trim();

    const messageElement =
        document.getElementById(
            "dailyOverrideMessage"
        );

    const submitButton =
        event.submitter;

    const modal =
        document.getElementById(
            "dailyTemplateOverrideModal"
        );


    if (
        !planDate ||
        !templateId ||
        !title ||
        !startTime ||
        !endTime
    ) {
        messageElement.textContent =
            "Hãy nhập đầy đủ nội dung và thời gian.";

        return;
    }


    if (endTime <= startTime) {
        messageElement.textContent =
            "Giờ kết thúc phải sau giờ bắt đầu.";

        return;
    }


    if (submitButton) {
        submitButton.disabled = true;
    }

    messageElement.textContent =
        "Đang lưu...";


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

        let studySlots =
            dailyPlan &&
                Array.isArray(
                    dailyPlan.study_slots
                )
                ? [...dailyPlan.study_slots]
                : [];


        /*
         * Xóa trạng thái cũ của cùng lịch:
         * bản sửa cũ hoặc trạng thái đã ẩn.
         */
        studySlots =
            studySlots.filter(
                function (slot) {
                    return (
                        String(
                            slot.template_id ||
                            ""
                        ) !==
                        String(templateId)
                    );
                }
            );


        studySlots.push({
            id:
                `override-${templateId}`,
            kind: "study",
            source:
                "template_override",
            template_id:
                templateId,
            icon:
                modal.dataset.icon ||
                "📖",
            start_time:
                startTime,
            end_time:
                endTime,
            end_day_offset: 0,
            title: title,
            note: note,
            pomodoro_sessions: 0
        });


        studySlots.sort(
            function (
                firstSlot,
                secondSlot
            ) {
                return String(
                    firstSlot.start_time ||
                    ""
                ).localeCompare(
                    String(
                        secondSlot.start_time ||
                        ""
                    )
                );
            }
        );


        await luuKeHoachNgay(
            planDate,
            workShift,
            studySlots
        );


        dongFormSuaLichRiengNgay();

        await hienThiLichTuan();
    } catch (error) {
        console.error(
            "Không lưu được lịch riêng:",
            error
        );

        messageElement.textContent =
            error.message ||
            "Không lưu được lịch riêng.";
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
        }
    }
}