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
            month: "2-digit"
        }
    ).format(date);
}


function dinhDangKhoangTuan(
    monday,
    sunday
) {
    const year = sunday.getFullYear();

    return (
        `${dinhDangNgayNgan(monday)} – ` +
        `${dinhDangNgayNgan(sunday)}/${year}`
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


/* =========================
   TẠO HTML LỊCH TUẦN
========================= */

function taoCongViecHTML(task) {
    return `
        <article class="week-task ${task.type}">
            <div class="week-task-icon">
                ${task.icon}
            </div>

            <div class="week-task-content">
                <p>${task.time}</p>
                <h3>${task.title}</h3>
                <small>${task.description}</small>
            </div>
        </article>
    `;
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


function taoNgayHTML(
    date,
    dayName,
    tasks,
    hasSettings
) {
    const todayClass =
        kiemTraHomNay(date)
            ? "today"
            : "";

    let tasksHTML = "";

    if (tasks.length > 0) {
        tasksHTML =
            tasks
                .map(taoCongViecHTML)
                .join("");
    } else {
        tasksHTML = `
            <article class="week-empty">
                <span>⚙️</span>
                <p>
                    ${hasSettings
                        ? "Hôm nay chưa có lịch."
                        : "Chưa xếp ca cho ngày này."}
                </p>
            </article>
        `;
    }

    return `
        <section class="week-day ${todayClass}">
            <header class="week-day-header">
                <div>
                    <p>${dayName}</p>
                    <h2>${dinhDangNgayNgan(date)}</h2>
                </div>

                ${
                    todayClass
                        ? `<span class="today-label">
                               Hôm nay
                           </span>`
                        : ""
                }
            </header>

            <div class="week-task-list">
                ${tasksHTML}
            </div>
        </section>
    `;
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
        <article class="schedule-notice">
            <span>⏳</span>

            <div>
                <h3>Đang tải lịch tuần</h3>
                <p>
                    App đang lấy dữ liệu từ Supabase.
                </p>
            </div>
        </article>
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

    rangeElement.textContent =
        dinhDangKhoangTuan(
            selectedMonday,
            selectedSunday
        );

    try {
        const settingsList =
            await layTatCaCauHinhCaLam();

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

            const settings =
                timCaLamChoNgay(
                    settingsList,
                    date
                );

            const tasks =
                taoLichChoNgay(
                    date,
                    settings
                );

            weekHTML += taoNgayHTML(
                date,
                DAY_NAMES[index],
                tasks,
                Boolean(settings)
            );
        }

        scheduleElement.innerHTML =
            weekHTML;
    } catch (error) {
        console.error(
            "Không thể tải lịch tuần:",
            error.message
        );

        scheduleElement.innerHTML = `
            <article class="schedule-notice">
                <span>⚠️</span>

                <div>
                    <h3>Không thể tải lịch</h3>
                    <p>
                        Hãy kiểm tra mạng rồi thử lại.
                    </p>
                </div>
            </article>
        `;
    }
}