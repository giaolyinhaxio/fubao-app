const SHIFT_STORAGE_KEY = "diquyShiftSettings";


document.addEventListener("DOMContentLoaded", function () {
    hienThiNgayTrangChu();
    hienThiNgayTrangDiquy();
    taoLichDiquyHomNay();
    ganSuKienTrangDiquy();
});


/* =========================
   HIỂN THỊ NGÀY
========================= */

function dinhDangNgay(date) {
    const formatter = new Intl.DateTimeFormat("vi-VN", {
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
    const element = document.getElementById("currentDate");

    if (element) {
        element.textContent = dinhDangNgay(new Date());
    }
}


function hienThiNgayTrangDiquy() {
    const element =
        document.getElementById("diquyCurrentDate");

    if (element) {
        element.textContent = dinhDangNgay(new Date());
    }
}


/* =========================
   TẠO THẺ LỊCH
========================= */

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
    return `
        <article class="schedule-item ${type}">
            <div class="schedule-item-icon">
                ${icon}
            </div>

            <div class="schedule-item-content">
                <p class="schedule-item-time">
                    ${time}
                </p>

                <h3>${title}</h3>

                <p class="schedule-item-description">
                    ${description}
                </p>
            </div>

            <button
    class="complete-button"
    type="button"
    data-task-key="${taskKey}"
    aria-label="Đánh dấu hoàn thành"
>
                ○
            </button>
        </article>
    `;
}


function taoTheThongBao(icon, title, description) {
    return `
        <article class="schedule-notice">
            <span>${icon}</span>

            <div>
                <h3>${title}</h3>
                <p>${description}</p>
            </div>
        </article>
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


async function luuCauHinhCaLam(settings) {
    const {
        data: userData,
        error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !userData.user) {
        throw new Error(
            "Không tìm thấy tài khoản đăng nhập."
        );
    }

    const {
        error
    } = await supabaseClient
        .from("shift_settings")
        .insert({
            cycle_start_date:
                settings.cycleStartDate,

            work_shift:
                settings.workShift,

            weekend_work_day:
                settings.weekendWorkDay,

            created_by:
                userData.user.id
        });

    if (error) {
        throw error;
    }

    localStorage.setItem(
        SHIFT_STORAGE_KEY,
        JSON.stringify(settings)
    );
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
   LỊCH DIQUY HÔM NAY
========================= */

async function taoLichDiquyHomNay() {
    const container =
        document.getElementById("diquyTodaySchedule");

    if (!container) {
        return;
    }

    const today = new Date();
    const dayOfWeek = today.getDay();

    container.innerHTML =
        taoTheThongBao(
            "⏳",
            "Đang tải lịch",
            "App đang lấy dữ liệu từ Supabase."
        );

    const settings =
        await layCauHinhCaLam();
    const cycleStatus =
        kiemTraChuKy(settings, today);

    const isRikiDay =
        dayOfWeek === 1 ||
        dayOfWeek === 3 ||
        dayOfWeek === 5;

    const isNormalWeekday =
        dayOfWeek === 2 ||
        dayOfWeek === 4;

    const isWeekend =
        dayOfWeek === 0 ||
        dayOfWeek === 6;

    let html = "";


    /* Thứ 2, 4 và 6 */

    if (isRikiDay) {
        html += taoTheLich(
            "📚",
            "09:00–11:30",
            "Học tiếng Nhật N5",
            "Lớp học tại Riki",
            "study-schedule"
        );

        html += taoTheLich(
            "💼",
            "13:00–21:00",
            "Lab Helpdesk",
            "Ca chiều vì buổi sáng có lớp Riki",
            "work-schedule"
        );

        html += taoTheLich(
            "📝",
            "22:00–22:20",
            "Ôn nhẹ bài hôm nay",
            "Ôn từ vựng hoặc Kanji đã học",
            "review-schedule"
        );
    }


    /* Thứ 3 và Thứ 5 */

    if (isNormalWeekday) {
        if (cycleStatus === "active") {
            html += taoLichTheoCa(settings.workShift);
        } else {
            html += taoThongBaoTheoChuKy(cycleStatus);
        }
    }


    /* Thứ 7 và Chủ Nhật */

    if (isWeekend) {
        if (cycleStatus !== "active") {
            html += taoThongBaoTheoChuKy(cycleStatus);
        } else {
            const todayWeekendName =
                dayOfWeek === 6
                    ? "saturday"
                    : "sunday";

            const isWorkDay =
                settings.weekendWorkDay ===
                todayWeekendName;

            if (isWorkDay) {
                html += taoLichTheoCa(settings.workShift);
            } else {
                html += taoLichNgayNghiCuoiTuan();
            }
        }
    }

    container.innerHTML = html;

    await apDungTrangThaiHoanThanh();

    ganSuKienHoanThanh();
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
   MỞ VÀ ĐÓNG CỬA SỔ
========================= */

async function moCuaSoXepCa() {
    const modal =
        document.getElementById("shiftModal");

    if (!modal) {
        return;
    }

    await dienDuLieuDaLuu();

    modal.classList.add("open");
    document.body.classList.add("modal-open");
}


function dongCuaSoXepCa() {
    const modal =
        document.getElementById("shiftModal");

    if (!modal) {
        return;
    }

    modal.classList.remove("open");
    document.body.classList.remove("modal-open");
}


/* =========================
   ĐIỀN DỮ LIỆU ĐÃ LƯU
========================= */

function layNgayHomNayDangISO() {
    const today = new Date();

    const year = today.getFullYear();

    const month = String(
        today.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        today.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


async function dienDuLieuDaLuu() {
    const settings =
        await layCauHinhCaLam();

    const startDateInput =
        document.getElementById("cycleStartDate");

    const workShiftSelect =
        document.getElementById("workShift");

    if (!startDateInput || !workShiftSelect) {
        return;
    }

    if (!settings) {
        startDateInput.value =
            layNgayHomNayDangISO();

        return;
    }

    startDateInput.value =
        settings.cycleStartDate;

    workShiftSelect.value =
        settings.workShift;

    const weekendRadio =
        document.querySelector(
            `input[name="weekendWorkDay"][value="${settings.weekendWorkDay}"]`
        );

    if (weekendRadio) {
        weekendRadio.checked = true;
    }
}


/* =========================
   SỰ KIỆN TRANG DIQUY
========================= */

function ganSuKienTrangDiquy() {
    const refreshButton =
        document.getElementById(
            "refreshScheduleButton"
        );

    const shiftButton =
        document.getElementById(
            "openShiftSettingButton"
        );

    const closeButton =
        document.getElementById(
            "closeShiftModalButton"
        );

    const modal =
        document.getElementById("shiftModal");

    const form =
        document.getElementById(
            "shiftSettingForm"
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


    if (shiftButton) {
        shiftButton.addEventListener(
            "click",
            moCuaSoXepCa
        );
    }


    if (closeButton) {
        closeButton.addEventListener(
            "click",
            dongCuaSoXepCa
        );
    }


    if (modal) {
        modal.addEventListener(
            "click",
            function (event) {
                if (event.target === modal) {
                    dongCuaSoXepCa();
                }
            }
        );
    }


    if (form) {
        form.addEventListener(
            "submit",
            async function (event) {
                event.preventDefault();

                const formData =
                    new FormData(form);

                const settings = {
                    cycleStartDate:
                        formData.get(
                            "cycleStartDate"
                        ),

                    workShift:
                        formData.get(
                            "workShift"
                        ),

                    weekendWorkDay:
                        formData.get(
                            "weekendWorkDay"
                        )
                };

                try {
                    await luuCauHinhCaLam(settings);

                    dongCuaSoXepCa();
                    taoLichDiquyHomNay();

                    alert(
                        "Đã lưu lịch làm lên Supabase."
                    );
                } catch (error) {
                    console.error(
                        "Không thể lưu lịch làm:",
                        error.message
                    );

                    alert(
                        "Không thể lưu lịch làm. Hãy kiểm tra kết nối mạng."
                    );
                }
            }
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


    document.addEventListener(
        "keydown",
        function (event) {
            if (event.key === "Escape") {
                dongCuaSoXepCa();
            }
        }
    );
}