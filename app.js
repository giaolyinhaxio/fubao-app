const SHIFT_STORAGE_KEY = "diquyShiftSettings";

const DISPLAY_TIMEZONE_STORAGE_KEY =
    "fubaoDisplayTimezone";

const VIETNAM_TIMEZONE =
    "Asia/Ho_Chi_Minh";

const JAPAN_TIMEZONE =
    "Asia/Tokyo";

let timezoneClockTimer = null;


document.addEventListener("DOMContentLoaded", function () {
    ganSuKienCaiDatTrangChu();
    hienThiNgayTrangChu();
    hienThiNgayTrangDiquy();
    taoLichDiquyHomNay();
    ganSuKienTrangDiquy();
    batDauDongHoMuiGio();
});

window.addEventListener(
    "pageshow",
    function (event) {
        if (event.persisted) {
            taoLichDiquyHomNay();
        }
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


function layTenMuiGio() {
    return layMuiGioHienThi() ===
        JAPAN_TIMEZONE
        ? "Giờ Nhật Bản"
        : "Giờ Việt Nam";
}


function layKyHieuMuiGio() {
    return layMuiGioHienThi() ===
        JAPAN_TIMEZONE
        ? "🇯🇵"
        : "🇻🇳";
}


function layDoLechHienThiPhut() {
    return layMuiGioHienThi() ===
        JAPAN_TIMEZONE
        ? 120
        : 0;
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
   HIỂN THỊ NGÀY
========================= */

function dinhDangNgay(date) {
    const formatter = new Intl.DateTimeFormat("vi-VN", {
        timeZone: layMuiGioHienThi(),
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });

    const formattedDate = formatter.format(date);

    return (
        formattedDate.charAt(0).toUpperCase() +
        formattedDate.slice(1)
    );
}


function hienThiNgayTrangChu() {
    const dateElement =
        document.getElementById(
            "currentDate"
        );

    const timeElement =
        document.getElementById(
            "currentTime"
        );

    const now = new Date();

    if (dateElement) {
        dateElement.textContent =
            dinhDangNgay(now);
    }

    if (timeElement) {
        const timeText =
            new Intl.DateTimeFormat(
                "vi-VN",
                {
                    timeZone:
                        layMuiGioHienThi(),
                    hour: "2-digit",
                    minute: "2-digit",
                    hourCycle: "h23"
                }
            ).format(now);

        timeElement.textContent =
            `${timeText} ${layKyHieuMuiGio()}`;
    }
}


function hienThiNgayTrangDiquy() {
    const elements =
        document.querySelectorAll(
            ".profile-current-date"
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

    elements.forEach(
        function (element) {
            element.textContent =
                `${formattedDate} · ${timeText}`;
        }
    );
}


function batDauDongHoMuiGio() {
    if (timezoneClockTimer) {
        clearInterval(
            timezoneClockTimer
        );
    }

    timezoneClockTimer =
        setInterval(
            function () {
                hienThiNgayTrangChu();
                hienThiNgayTrangDiquy();
            },
            30000
        );
}

function ganSuKienCaiDatTrangChu() {
    const modal =
        document.getElementById(
            "homeSettingsModal"
        );

    const openButton =
        document.getElementById(
            "openHomeSettingsButton"
        );

    const closeButton =
        document.getElementById(
            "closeHomeSettingsButton"
        );

    const timezoneSelect =
        document.getElementById(
            "displayTimezoneSelect"
        );

    if (!modal || !openButton) {
        return;
    }

    if (timezoneSelect) {
        timezoneSelect.value =
            layMuiGioHienThi();

        timezoneSelect.addEventListener(
            "change",
            function () {
                const timezone =
                    timezoneSelect.value ===
                        JAPAN_TIMEZONE
                        ? JAPAN_TIMEZONE
                        : VIETNAM_TIMEZONE;

                localStorage.setItem(
                    DISPLAY_TIMEZONE_STORAGE_KEY,
                    timezone
                );

                hienThiNgayTrangChu();
                hienThiNgayTrangDiquy();
                taoLichDiquyHomNay();
            }
        );
    }

    function openModal() {
        modal.classList.add("open");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );
    }

    function closeModal() {
        modal.classList.remove("open");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );
    }

    openButton.addEventListener(
        "click",
        openModal
    );

    if (closeButton) {
        closeButton.addEventListener(
            "click",
            closeModal
        );
    }

    modal.addEventListener(
        "click",
        function (event) {
            if (event.target === modal) {
                closeModal();
            }
        }
    );

    document.addEventListener(
        "keydown",
        function (event) {
            if (event.key === "Escape") {
                closeModal();
            }
        }
    );
}


function taoTheLich(
    icon,
    time,
    title,
    description,
    type
) {
    const taskKey =
        encodeURIComponent(
            `${time}|${title}`
        );

    const displayTime =
        chuyenKhoangGioHienThi(time);

    return `
        <tr class="schedule-item ${type}">
            <td class="schedule-table-time">
                ${displayTime}
            </td>

            <td class="schedule-table-activity">
                <div class="schedule-table-title">
                    <strong>${title}</strong>
                </div>

                <small>
                    ${description}
                </small>
            </td>

            <td class="schedule-table-status">
                <button
                    class="complete-button"
                    type="button"
                    data-task-key="${taskKey}"
                    aria-label="Đánh dấu hoàn thành"
                >
                    ○
                </button>
            </td>
        </tr>
    `;
}


function taoTheThongBao(
    icon,
    title,
    description
) {
    return `
        <tr class="schedule-message-row">
            <td colspan="3">
                <div class="schedule-table-message">
                    <span>${icon}</span>

                    <div>
                        <strong>${title}</strong>
                        <small>${description}</small>
                    </div>
                </div>
            </td>
        </tr>
    `;
}


/* =========================
   LƯU VÀ ĐỌC CA LÀM
========================= */

async function layCauHinhCaLam() {
    try {
        const {
            data,
            error
        } = await supabaseClient
            .from("shift_settings")
            .select(
                `
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
            )
            .limit(1)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data) {
            return layCauHinhTuMay();
        }

        const settings = {
            cycleStartDate:
                data.cycle_start_date,

            workShift:
                data.work_shift,

            weekendWorkDay:
                data.weekend_work_day
        };

        localStorage.setItem(
            SHIFT_STORAGE_KEY,
            JSON.stringify(settings)
        );

        return settings;
    } catch (error) {
        console.error(
            "Không thể tải lịch từ Supabase:",
            error.message
        );

        return layCauHinhTuMay();
    }
}


function layCauHinhTuMay() {
    const savedData =
        localStorage.getItem(
            SHIFT_STORAGE_KEY
        );

    if (!savedData) {
        return null;
    }

    try {
        return JSON.parse(savedData);
    } catch (error) {
        return null;
    }
}

/* =========================
   KIỂM TRA CHU KỲ 2 TUẦN
========================= */

function tinhSoNgayChenhLech(startDateText, currentDate) {
    const startDate =
        new Date(startDateText + "T00:00:00");

    const today = new Date(currentDate);

    startDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const millisecondsPerDay =
        24 * 60 * 60 * 1000;

    return Math.floor(
        (today - startDate) / millisecondsPerDay
    );
}


function kiemTraChuKy(settings, currentDate) {
    if (!settings || !settings.cycleStartDate) {
        return "not-set";
    }

    const difference =
        tinhSoNgayChenhLech(
            settings.cycleStartDate,
            currentDate
        );

    if (difference < 0) {
        return "not-started";
    }

    if (difference >= 14) {
        return "expired";
    }

    return "active";
}


/* =========================
   TẠO LỊCH THEO CA
========================= */

function taoLichTheoCa(workShift) {
    let html = "";

    if (workShift === "morning") {
        html += taoTheLich(
            "💼",
            "07:00–16:00",
            "Lab Helpdesk",
            "Ca sáng",
            "work-schedule"
        );

        html += taoTheLich(
            "📖",
            "19:00–20:00",
            "Tự học N5",
            "Từ vựng, Kanji hoặc ngữ pháp",
            "study-schedule"
        );
    }

    if (workShift === "normal") {
        html += taoTheLich(
            "💼",
            "09:00–18:00",
            "Lab Helpdesk",
            "Ca thường",
            "work-schedule"
        );

        html += taoTheLich(
            "📖",
            "20:00–21:00",
            "Tự học N5",
            "Ôn nội dung đã học tại Riki",
            "study-schedule"
        );
    }

    if (workShift === "afternoon") {
        html += taoTheLich(
            "📖",
            "10:00–11:30",
            "Tự học N5",
            "Học trước khi đi làm",
            "study-schedule"
        );

        html += taoTheLich(
            "💼",
            "13:00–21:00",
            "Lab Helpdesk",
            "Ca chiều",
            "work-schedule"
        );
    }

    return html;
}


function taoLichNgayNghiCuoiTuan() {
    let html = "";

    html += taoTheLich(
        "🔤",
        "10:00–11:00",
        "Từ vựng và Kanji",
        "Ôn lại nội dung trong tuần",
        "study-schedule"
    );

    html += taoTheLich(
        "📖",
        "11:10–12:00",
        "Ngữ pháp N5",
        "Học và làm bài tập",
        "review-schedule"
    );

    html += taoTheLich(
        "🎧",
        "15:00–16:00",
        "Nghe tiếng Nhật",
        "Luyện nghe và shadowing",
        "work-schedule"
    );

    return html;
}

/* =========================
   ĐỒNG BỘ VỚI LỊCH TUẦN
========================= */

async function layKeHoachHomNay() {
    const todayISO =
        layNgayHomNayDangISO();

    const {
        data,
        error
    } = await supabaseClient
        .from("daily_plans")
        .select(`
            id,
            plan_date,
            work_shift,
            study_slots,
            updated_at
        `)
        .eq("plan_date", todayISO)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data || null;
}


function layCaMacDinhHomNay(
    today,
    settings
) {
    const dayOfWeek =
        today.getDay();

    const isRikiDay =
        dayOfWeek === 1 ||
        dayOfWeek === 3 ||
        dayOfWeek === 5;

    if (isRikiDay) {
        return "afternoon";
    }

    if (!settings) {
        return "off";
    }

    const cycleStatus =
        kiemTraChuKy(
            settings,
            today
        );

    if (cycleStatus !== "active") {
        return "off";
    }

    const isNormalWeekday =
        dayOfWeek === 2 ||
        dayOfWeek === 4;

    if (isNormalWeekday) {
        return settings.workShift;
    }

    const currentWeekendDay =
        dayOfWeek === 6
            ? "saturday"
            : "sunday";

    if (
        settings.weekendWorkDay ===
        currentWeekendDay
    ) {
        return settings.workShift;
    }

    return "off";
}


function taoLichCaLamDaChon(workShift) {
    if (workShift === "morning") {
        return taoTheLich(
            "",
            "07:00–16:00",
            "Lab Helpdesk",
            "Ca sáng",
            "work-schedule"
        );
    }

    if (workShift === "normal") {
        return taoTheLich(
            "",
            "09:00–18:00",
            "Lab Helpdesk",
            "Ca thường",
            "work-schedule"
        );
    }

    if (workShift === "afternoon") {
        return taoTheLich(
            "",
            "13:00–21:00",
            "Lab Helpdesk",
            "Ca chiều",
            "work-schedule"
        );
    }

    return "";
}


function taoLichHocTuThem(studySlots) {
    if (!Array.isArray(studySlots)) {
        return "";
    }

    return studySlots
        .map(
            function (slot) {
                const time =
                    `${slot.start_time}–${slot.end_time}`;

                return taoTheLich(
                    "",
                    time,
                    slot.title,
                    "Giờ học tự thêm từ lịch tuần",
                    "study-schedule custom-study-schedule"
                );
            }
        )
        .join("");
}

/* =========================
   LỊCH DIQUY HÔM NAY
========================= */
async function taoLichDiquyHomNay() {
    const container =
        document.getElementById(
            "diquyTodaySchedule"
        );

    if (!container) {
        return;
    }

    container.innerHTML =
        taoTheThongBao(
            "",
            "Đang tải lịch",
            "App đang đồng bộ dữ liệu."
        );

    try {
        const today =
            layNgayLichGocHienTai();

        const dayOfWeek =
            today.getDay();

        const [
            settings,
            dailyPlan
        ] = await Promise.all([
            layCauHinhCaLam(),
            layKeHoachHomNay()
        ]);

        const selectedShift =
            dailyPlan
                ? dailyPlan.work_shift
                : layCaMacDinhHomNay(
                    today,
                    settings
                );

        const isRikiDay =
            dayOfWeek === 1 ||
            dayOfWeek === 3 ||
            dayOfWeek === 5;

        let html = "";


        /* Lịch cố định thứ 2, 4, 6 */

        if (isRikiDay) {
            html += taoTheLich(
                "",
                "09:00–11:30",
                "Học tiếng Nhật N5",
                "Lớp học tại Riki",
                "study-schedule"
            );

            html +=
                taoLichCaLamDaChon(
                    selectedShift
                );

            html += taoTheLich(
                "",
                "22:00–22:20",
                "Ôn nhẹ bài học",
                "Ôn từ vựng hoặc Kanji đã học",
                "review-schedule"
            );
        }


        /* Các ngày còn lại */

        if (!isRikiDay) {
            if (selectedShift !== "off") {
                html +=
                    taoLichTheoCa(
                        selectedShift
                    );
            }
        }


        /* Giờ học được thêm từ lịch tuần */

        if (dailyPlan) {
            html += taoLichHocTuThem(
                dailyPlan.study_slots
            );
        }


        /* Khi hôm nay chưa có lịch */

        if (!html.trim()) {
            html =
                taoTheThongBao(
                    "",
                    "Hôm nay chưa có lịch",
                    "Bạn có thể thêm giờ học trong Lịch tuần."
                );
        }

        container.innerHTML = html;

        await apDungTrangThaiHoanThanh();

        ganSuKienHoanThanh();
    } catch (error) {
        console.error(
            "Không thể đồng bộ lịch hôm nay:",
            error
        );

        container.innerHTML =
            taoTheThongBao(
                "",
                "Không thể tải lịch",
                "Hãy kiểm tra mạng rồi thử lại."
            );
    }
}


function taoThongBaoTheoChuKy(status) {
    if (status === "not-started") {
        return taoTheThongBao(
            "📅",
            "Chu kỳ chưa bắt đầu",
            "Ca làm đã được lưu nhưng chưa đến ngày bắt đầu."
        );
    }

    if (status === "expired") {
        return taoTheThongBao(
            "🔄",
            "Chu kỳ 2 tuần đã kết thúc",
            "Hãy chọn ca làm mới cho chu kỳ tiếp theo."
        );
    }

    return taoTheThongBao(
        "⚙️",
        "Chưa chọn ca làm",
        "Nhấn Xếp ca làm để tạo lịch cho chu kỳ 2 tuần."
    );
}


/* =========================
   ĐÁNH DẤU HOÀN THÀNH
========================= */

async function apDungTrangThaiHoanThanh() {
    const buttons =
        document.querySelectorAll(
            ".complete-button"
        );

    if (buttons.length === 0) {
        return;
    }

    try {
        const {
            data,
            error
        } = await supabaseClient
            .from("task_completions")
            .select(
                `
                task_key,
                is_completed
                `
            )
            .eq(
                "task_date",
                layNgayHomNayDangISO()
            );

        if (error) {
            throw error;
        }

        const completionMap =
            new Map();

        data.forEach(function (item) {
            completionMap.set(
                item.task_key,
                item.is_completed
            );
        });

        buttons.forEach(function (button) {
            const taskKey =
                button.dataset.taskKey;

            const isCompleted =
                completionMap.get(taskKey) ===
                true;

            capNhatGiaoDienHoanThanh(
                button,
                isCompleted
            );
        });
    } catch (error) {
        console.error(
            "Không thể tải trạng thái hoàn thành:",
            error.message
        );
    }
}


function ganSuKienHoanThanh() {
    const buttons =
        document.querySelectorAll(
            ".complete-button"
        );

    buttons.forEach(function (button) {
        button.addEventListener(
            "click",
            async function () {
                const scheduleItem =
                    button.closest(
                        ".schedule-item"
                    );

                const wasCompleted =
                    scheduleItem.classList
                        .contains(
                            "completed"
                        );

                const newStatus =
                    !wasCompleted;

                capNhatGiaoDienHoanThanh(
                    button,
                    newStatus
                );

                button.disabled = true;

                try {
                    await luuTrangThaiHoanThanh(
                        button.dataset.taskKey,
                        newStatus
                    );
                } catch (error) {
                    capNhatGiaoDienHoanThanh(
                        button,
                        wasCompleted
                    );

                    console.error(
                        "Không thể lưu trạng thái:",
                        error.message
                    );

                    alert(
                        "Không thể lưu trạng thái hoàn thành."
                    );
                } finally {
                    button.disabled = false;
                }
            }
        );
    });
}


function capNhatGiaoDienHoanThanh(
    button,
    isCompleted
) {
    const scheduleItem =
        button.closest(".schedule-item");

    if (!scheduleItem) {
        return;
    }

    scheduleItem.classList.toggle(
        "completed",
        isCompleted
    );

    button.textContent =
        isCompleted ? "✓" : "○";
}


async function luuTrangThaiHoanThanh(
    taskKey,
    isCompleted
) {
    const {
        data: userData,
        error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !userData.user) {
        throw new Error(
            "Không tìm thấy tài khoản."
        );
    }

    const {
        error
    } = await supabaseClient
        .from("task_completions")
        .upsert(
            {
                task_date:
                    layNgayHomNayDangISO(),

                task_key:
                    taskKey,

                is_completed:
                    isCompleted,

                updated_by:
                    userData.user.id,

                updated_at:
                    new Date().toISOString()
            },
            {
                onConflict:
                    "task_date,task_key"
            }
        );

    if (error) {
        throw error;
    }
}

/* =========================
   ĐIỀN DỮ LIỆU ĐÃ LƯU
========================= */

function layNgayHomNayDangISO() {
    const parts =
        layCacPhanNgayTheoMuiGio(
            new Date(),
            VIETNAM_TIMEZONE
        );

    return (
        `${parts.year}-${parts.month}-${parts.day}`
    );
}

/* =========================
   SỰ KIỆN TRANG DIQUY
========================= */
function ganSuKienTrangDiquy() {
    const refreshButton =
        document.getElementById(
            "refreshScheduleButton"
        );

    const weekButton =
        document.getElementById(
            "openWeekScheduleButton"
        );

    if (refreshButton) {
        refreshButton.addEventListener(
            "click",
            taoLichDiquyHomNay
        );
    }

    if (weekButton) {
        weekButton.addEventListener(
            "click",
            function () {
                window.location.href =
                    "lich-tuan.html";
            }
        );
    }
}

/* =========================
   BỘ ĐẾM NGÀY YÊU
========================= */

function updateLoveDays() {
    const totalElement =
        document.getElementById("loveDays");

    const yearsElement =
        document.getElementById("loveYears");

    const monthsElement =
        document.getElementById("loveMonths");

    const weeksElement =
        document.getElementById("loveWeeks");

    const daysElement =
        document.getElementById(
            "loveRemainingDays"
        );

    if (
        !totalElement ||
        !yearsElement ||
        !monthsElement ||
        !weeksElement ||
        !daysElement
    ) {
        return;
    }

    const millisecondsPerDay =
        1000 * 60 * 60 * 24;

    /* Ngày bắt đầu: 11/04/2017 */
    const startDate =
        new Date(
            Date.UTC(2017, 3, 11)
        );

    const now = new Date();

    const today =
        new Date(
            Date.UTC(
                now.getFullYear(),
                now.getMonth(),
                now.getDate()
            )
        );

    const endDate = new Date(today);

    /* Tổng số ngày */
    const totalDays =
        Math.floor(
            (today - startDate) /
            millisecondsPerDay
        );

    /* Tính số năm */
    let cursor = new Date(startDate);

    let years =
        endDate.getUTCFullYear() -
        cursor.getUTCFullYear();

    let candidate = new Date(cursor);

    candidate.setUTCFullYear(
        candidate.getUTCFullYear() + years
    );

    if (candidate > endDate) {
        years -= 1;

        candidate = new Date(cursor);

        candidate.setUTCFullYear(
            candidate.getUTCFullYear() + years
        );
    }

    cursor = candidate;

    /* Tính số tháng còn lại */
    let months =
        (
            endDate.getUTCFullYear() -
            cursor.getUTCFullYear()
        ) * 12 +
        endDate.getUTCMonth() -
        cursor.getUTCMonth();

    candidate = new Date(cursor);

    candidate.setUTCMonth(
        candidate.getUTCMonth() + months
    );

    if (candidate > endDate) {
        months -= 1;

        candidate = new Date(cursor);

        candidate.setUTCMonth(
            candidate.getUTCMonth() + months
        );
    }

    cursor = candidate;

    /* Tính số tuần và ngày còn lại */
    const remainingDays =
        Math.floor(
            (endDate - cursor) /
            millisecondsPerDay
        );

    const weeks =
        Math.floor(remainingDays / 7);

    const days =
        remainingDays % 7;

    /* Hiển thị kết quả */
    totalElement.textContent =
        String(totalDays);

    yearsElement.textContent =
        String(years);

    monthsElement.textContent =
        String(months);

    weeksElement.textContent =
        String(weeks);

    daysElement.textContent =
        String(days);
}

updateLoveDays();