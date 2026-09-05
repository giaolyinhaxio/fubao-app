const POQY_SELECTED_GOAL_KEY = "poqySelectedGoalId";

let poqyGoals = [];
let poqyCurrentGoal = null;
let poqyExpenses = [];
let poqyContributions = [];
let poqyTasks = [];
let poqyMilestones = [];
let poqyActivities = [];
let poqyCurrentUserEmail = "";
let poqyRefreshTimer = null;

document.addEventListener("DOMContentLoaded", function () {
    ganSuKienPoQy();
    taiPoQy();

    poqyRefreshTimer = window.setInterval(function () {
        if (
            poqyCurrentGoal &&
            document.visibilityState === "visible"
        ) {
            taiDuLieuGoal(poqyCurrentGoal.id, false);
        }
    }, 30000);
});

window.addEventListener("pageshow", function () {
    if (poqyCurrentGoal) {
        taiDuLieuGoal(poqyCurrentGoal.id, false);
    }
});

document.addEventListener("visibilitychange", function () {
    if (
        document.visibilityState === "visible" &&
        poqyCurrentGoal
    ) {
        taiDuLieuGoal(poqyCurrentGoal.id, false);
    }
});

function layPhanTu(id) {
    return document.getElementById(id);
}

function baoVeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function dinhDangTien(value) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(Number(value || 0));
}

function taoNgayTuISO(value) {
    if (!value) {
        return null;
    }

    const parts = String(value)
        .split("-")
        .map(Number);

    return new Date(
        parts[0],
        parts[1] - 1,
        parts[2],
        12,
        0,
        0
    );
}

function dinhDangNgay(value) {
    const date = value instanceof Date
        ? value
        : taoNgayTuISO(value);

    if (!date || Number.isNaN(date.getTime())) {
        return "--/--/----";
    }

    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(date);
}

function dinhDangNgayGio(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

function layHomNayISO() {
    const now = new Date();

    const year = now.getFullYear();

    const month = String(
        now.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        now.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function tinhCountdown(targetDateText) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = taoNgayTuISO(targetDateText);

    if (!target) {
        return {
            totalDays: 0,
            title: "Chưa đặt ngày",
            detail: ""
        };
    }

    target.setHours(0, 0, 0, 0);

    const difference =
        target.getTime() - today.getTime();

    const totalDays = Math.ceil(
        difference / 86400000
    );

    if (totalDays < 0) {
        return {
            totalDays,
            title:
                `Đã qua ${Math.abs(totalDays)} ngày`,
            detail: "Ngày mục tiêu đã qua"
        };
    }

    if (totalDays === 0) {
        return {
            totalDays: 0,
            title: "Chính là hôm nay!",
            detail: "Cùng hoàn thành mục tiêu 🎉"
        };
    }

    let months =
        (target.getFullYear() -
            today.getFullYear()) * 12 +
        target.getMonth() -
        today.getMonth();

    if (target.getDate() < today.getDate()) {
        months -= 1;
    }

    months = Math.max(0, months);

    const anchor = new Date(today);

    anchor.setMonth(
        anchor.getMonth() + months
    );

    const remainingDays = Math.max(
        0,
        Math.ceil(
            (
                target.getTime() -
                anchor.getTime()
            ) / 86400000
        )
    );

    return {
        totalDays,

        title:
            `Còn ${totalDays.toLocaleString("vi-VN")} ngày`,

        detail:
            months > 0
                ? `Khoảng ${months} tháng ${remainingDays} ngày nữa`
                : `${remainingDays} ngày nữa`
    };
}

function tenMacDinhTuEmail() {
    if (!poqyCurrentUserEmail) {
        return (
            poqyCurrentGoal?.person_a ||
            "Người A"
        );
    }

    const emailName =
        poqyCurrentUserEmail
            .split("@")[0]
            .toLowerCase();

    const people = [
        poqyCurrentGoal?.person_a,
        poqyCurrentGoal?.person_b
    ].filter(Boolean);

    return people.find(function (person) {
        return emailName.includes(
            String(person)
                .toLowerCase()
                .replaceAll(" ", "")
        );
    }) || people[0] || "Người A";
}

async function taiPoQy() {
    hienThiTrangThaiTai(true);

    try {
        const userResult =
            await supabaseClient.auth.getUser();

        poqyCurrentUserEmail =
            userResult.data?.user?.email || "";

        const result = await supabaseClient
            .from("poqy_goals")
            .select("*")
            .order(
                "created_at",
                { ascending: true }
            );

        if (result.error) {
            throw result.error;
        }

        poqyGoals = result.data || [];

        if (!poqyGoals.length) {
            hienThiGoalTrong();
            return;
        }

        const savedId =
            localStorage.getItem(
                POQY_SELECTED_GOAL_KEY
            );

        const selectedGoal =
            poqyGoals.find(function (goal) {
                return goal.id === savedId;
            }) || poqyGoals[0];

        await chonGoal(selectedGoal.id);

    } catch (error) {
        console.error(
            "Không thể tải PoQy:",
            error
        );

        hienThiLoiTai(error);
    }
}

function hienThiTrangThaiTai(isLoading) {
    layPhanTu("goalLoading")
        .classList
        .toggle("hidden", !isLoading);

    layPhanTu("goalEmpty")
        .classList
        .add("hidden");

    layPhanTu("goalWorkspace")
        .classList
        .add("hidden");
}

function hienThiGoalTrong() {
    layPhanTu("goalLoading")
        .classList
        .add("hidden");

    layPhanTu("goalWorkspace")
        .classList
        .add("hidden");

    layPhanTu("goalEmpty")
        .classList
        .remove("hidden");
}

function hienThiLoiTai(error) {
    const loading =
        layPhanTu("goalLoading");

    loading.classList.remove("hidden");

    loading.innerHTML = `
        <strong>Chưa tải được PoQy</strong>

        <p>
            ${baoVeHTML(
        error?.message ||
        "Hãy kiểm tra kết nối và bảng dữ liệu."
    )}
        </p>
    `;
}

async function chonGoal(goalId) {
    const goal =
        poqyGoals.find(function (item) {
            return item.id === goalId;
        });

    if (!goal) {
        return;
    }

    poqyCurrentGoal = goal;

    localStorage.setItem(
        POQY_SELECTED_GOAL_KEY,
        goalId
    );

    capNhatDanhSachGoal();

    await taiDuLieuGoal(goalId, true);
}

function capNhatDanhSachGoal() {
    const select =
        layPhanTu("goalSelect");

    select.innerHTML =
        poqyGoals.map(function (goal) {
            const selected =
                goal.id === poqyCurrentGoal?.id
                    ? "selected"
                    : "";

            return `
                <option
                    value="${baoVeHTML(goal.id)}"
                    ${selected}>

                    ${baoVeHTML(goal.emoji || "🎯")}
                    ${baoVeHTML(goal.title)}

                </option>
            `;
        }).join("");
}

async function taiDuLieuGoal(
    goalId,
    showLoading
) {
    if (showLoading) {
        layPhanTu("goalLoading")
            .classList
            .remove("hidden");

        layPhanTu("goalWorkspace")
            .classList
            .add("hidden");
    }

    try {
        const results =
            await Promise.all([

                supabaseClient
                    .from("poqy_expenses")
                    .select("*")
                    .eq("goal_id", goalId)
                    .order("created_at"),

                supabaseClient
                    .from("poqy_contributions")
                    .select("*")
                    .eq("goal_id", goalId)
                    .order("created_at"),

                supabaseClient
                    .from("poqy_tasks")
                    .select("*")
                    .eq("goal_id", goalId)
                    .order("created_at"),

                supabaseClient
                    .from("poqy_milestones")
                    .select("*")
                    .eq("goal_id", goalId)
                    .order("milestone_date"),

                supabaseClient
                    .from("poqy_activities")
                    .select("*")
                    .eq("goal_id", goalId)
                    .order(
                        "created_at",
                        { ascending: false }
                    )
                    .limit(30)
            ]);

        const failed =
            results.find(function (result) {
                return result.error;
            });

        if (failed) {
            throw failed.error;
        }

        poqyExpenses =
            results[0].data || [];

        poqyContributions =
            results[1].data || [];

        poqyTasks =
            results[2].data || [];

        poqyMilestones =
            results[3].data || [];

        poqyActivities =
            results[4].data || [];

        hienThiToanBoGoal();

    } catch (error) {
        console.error(
            "Không thể tải dữ liệu goal:",
            error
        );

        if (showLoading) {
            hienThiLoiTai(error);
        }
    }
}

function hienThiToanBoGoal() {
    layPhanTu("goalLoading")
        .classList
        .add("hidden");

    layPhanTu("goalEmpty")
        .classList
        .add("hidden");

    layPhanTu("goalWorkspace")
        .classList
        .remove("hidden");

    hienThiHero();
    hienThiNganSach();
    hienThiChecklist();
    hienThiMilestones();
    hienThiActivities();
    capNhatCacOChonNguoi();
}

function hienThiHero() {
    const goal = poqyCurrentGoal;

    const countdown =
        tinhCountdown(goal.target_date);

    const progress = Math.min(
        100,
        Math.max(
            0,
            Number(goal.progress || 0)
        )
    );

    const hero =
        layPhanTu("goalHero");

    layPhanTu("goalEmoji").textContent =
        goal.emoji || "🎯";

    layPhanTu("goalTitle").textContent =
        goal.title;

    layPhanTu("goalCountdown").textContent =
        countdown.title;

    layPhanTu("goalTargetDate").textContent =
        dinhDangNgay(goal.target_date);

    layPhanTu("goalCountdownDetail").textContent =
        countdown.detail;

    layPhanTu("goalProgressText").textContent =
        `${progress}%`;

    layPhanTu("goalProgressFill").style.width =
        `${progress}%`;

    layPhanTu("goalStartDate").textContent =
        dinhDangNgay(goal.start_date);

    layPhanTu("goalNotes").value =
        goal.notes || "";

    if (
        /^https?:\/\//i.test(
            goal.cover_url || ""
        )
    ) {
        const safeCover =
            String(goal.cover_url)
                .replaceAll('"', "%22");

        hero.style.backgroundImage =
            `url("${safeCover}")`;

    } else {
        hero.style.backgroundImage =
            "linear-gradient(135deg, #80c6e5, #e9abc4)";
    }
}

function hienThiNganSach() {
    const total = poqyExpenses.reduce(
        function (sum, expense) {
            return sum + Number(expense.amount || 0);
        },
        0
    );

    const spent = poqyExpenses.reduce(
        function (sum, expense) {
            if (expense.status === "paid") {
                return sum + Number(expense.amount || 0);
            }

            return sum;
        },
        0
    );

    layPhanTu("budgetTotal").textContent =
        dinhDangTien(total);

    layPhanTu("budgetSpent").textContent =
        dinhDangTien(spent);

    layPhanTu("budgetRemaining").textContent =
        dinhDangTien(
            Math.max(0, total - spent)
        );

    layPhanTu("summaryBudget").textContent =
        dinhDangTien(total);

    const people = [
        poqyCurrentGoal.person_a,
        poqyCurrentGoal.person_b
    ];

    layPhanTu("contributionSummary").innerHTML =
        people.map(function (person) {
            const amount =
                poqyContributions
                    .filter(function (item) {
                        return (
                            item.person_name === person
                        );
                    })
                    .reduce(function (sum, item) {
                        return (
                            sum +
                            Number(item.amount || 0)
                        );
                    }, 0);

            return `
                <div class="poqy-contribution-card">
                    <small>
                        ${baoVeHTML(person)} đã đóng
                    </small>

                    <strong>
                        ${dinhDangTien(amount)}
                    </strong>
                </div>
            `;
        }).join("");

    const list =
        layPhanTu("expenseList");

    if (!poqyExpenses.length) {
        list.innerHTML = `
            <div class="poqy-empty-list">
                Chưa có khoản chi nào.
            </div>
        `;

        return;
    }

    list.innerHTML =
        poqyExpenses.map(function (expense) {
            const statusLabel =
                expense.status === "paid"
                    ? "Đã chi"
                    : "Chưa chi";

            const note =
                expense.note
                    ? `
                        <small>
                            ${baoVeHTML(expense.note)}
                        </small>
                    `
                    : "";

            return `
                <article class="poqy-list-item">

                    <div class="poqy-list-copy">

                        <strong>
                            ${baoVeHTML(expense.name)}
                        </strong>

                        <span>
                            ${dinhDangTien(expense.amount)}
                            ·
                            ${baoVeHTML(expense.entered_by)}
                        </span>

                        <span class="poqy-status ${expense.status === "paid"
                    ? "paid"
                    : ""
                }">
                            ${statusLabel}
                        </span>

                        ${note}

                    </div>

                    <div class="poqy-item-actions">

                        <button
                            type="button"
                            data-action="edit-expense"
                            data-id="${expense.id}"
                            aria-label="Sửa">
                            ✎
                        </button>

                        <button
                            class="delete"
                            type="button"
                            data-action="delete-expense"
                            data-id="${expense.id}"
                            aria-label="Xóa">
                            ×
                        </button>

                    </div>
                </article>
            `;
        }).join("");
}

function hienThiChecklist() {
    const completed =
        poqyTasks.filter(function (task) {
            return task.completed;
        }).length;

    const total = poqyTasks.length;

    const percentage =
        total
            ? Math.round(
                (completed / total) * 100
            )
            : 0;

    layPhanTu("summaryChecklist").textContent =
        `${completed}/${total} việc`;

    layPhanTu("checklistProgressText").textContent =
        `${completed}/${total} việc đã hoàn thành – ${percentage}%`;

    layPhanTu("checklistProgressFill").style.width =
        `${percentage}%`;

    const list =
        layPhanTu("taskList");

    if (!total) {
        list.innerHTML = `
            <div class="poqy-empty-list">
                Chưa có việc cần làm.
            </div>
        `;

        return;
    }

    list.innerHTML =
        poqyTasks.map(function (task) {
            const detail =
                task.completed
                    ? `Hoàn thành bởi ${baoVeHTML(
                        task.completed_by ||
                        "một người"
                    )
                    }`
                    : `Thêm bởi ${baoVeHTML(task.added_by)
                    }`;

            return `
                <article class="poqy-list-item ${task.completed
                    ? "poqy-task-completed"
                    : ""
                }">

                    <div class="poqy-list-main">

                        <input
                            class="poqy-check"
                            type="checkbox"
                            data-action="toggle-task"
                            data-id="${task.id}"
                            ${task.completed ? "checked" : ""}
                            aria-label="Đánh dấu hoàn thành">

                        <div class="poqy-list-copy">

                            <strong>
                                ${baoVeHTML(task.title)}
                            </strong>

                            <small>
                                ${detail}
                            </small>

                        </div>
                    </div>

                    <div class="poqy-item-actions">

                        <button
                            type="button"
                            data-action="edit-task"
                            data-id="${task.id}"
                            aria-label="Sửa">
                            ✎
                        </button>

                        <button
                            class="delete"
                            type="button"
                            data-action="delete-task"
                            data-id="${task.id}"
                            aria-label="Xóa">
                            ×
                        </button>

                    </div>
                </article>
            `;
        }).join("");
}

function hienThiMilestones() {
    layPhanTu("summaryMilestones").textContent =
        `${poqyMilestones.length} mốc`;

    const list =
        layPhanTu("milestoneList");

    if (!poqyMilestones.length) {
        list.innerHTML = `
            <div class="poqy-empty-list">
                Chưa có mốc quan trọng.
            </div>
        `;

        return;
    }

    list.innerHTML =
        poqyMilestones.map(function (milestone) {
            const note =
                milestone.note
                    ? `
                        <small>
                            ${baoVeHTML(milestone.note)}
                        </small>
                    `
                    : "";

            return `
                <article class="poqy-list-item">

                    <div class="poqy-list-main">

                        <span class="poqy-milestone-icon">
                            ${baoVeHTML(
                milestone.icon || "🎯"
            )}
                        </span>

                        <div class="poqy-list-copy">

                            <strong>
                                ${dinhDangNgay(
                milestone.milestone_date
            )}
                                —
                                ${baoVeHTML(milestone.title)}
                            </strong>

                            ${note}

                        </div>
                    </div>

                    <div class="poqy-item-actions">

                        <button
                            type="button"
                            data-action="edit-milestone"
                            data-id="${milestone.id}"
                            aria-label="Sửa">
                            ✎
                        </button>

                        <button
                            class="delete"
                            type="button"
                            data-action="delete-milestone"
                            data-id="${milestone.id}"
                            aria-label="Xóa">
                            ×
                        </button>

                    </div>
                </article>
            `;
        }).join("");
}

function hienThiActivities() {
    const list =
        layPhanTu("activityList");

    if (!poqyActivities.length) {
        list.innerHTML = `
            <div class="poqy-empty-list">
                Chưa có hoạt động nào.
            </div>
        `;

        return;
    }

    list.innerHTML =
        poqyActivities.map(function (activity) {
            return `
                <article class="poqy-activity-item">

                    <p>
                        <strong>
                            ${baoVeHTML(activity.actor_name)}
                        </strong>

                        ${baoVeHTML(activity.message)}
                    </p>

                    <time>
                        ${baoVeHTML(
                dinhDangNgayGio(
                    activity.created_at
                )
            )}
                    </time>

                </article>
            `;
        }).join("");
}

function capNhatCacOChonNguoi() {
    if (!poqyCurrentGoal) {
        return;
    }

    const people = [
        poqyCurrentGoal.person_a,
        poqyCurrentGoal.person_b
    ];

    const options =
        people.map(function (person) {
            return `
                <option value="${baoVeHTML(person)}">
                    ${baoVeHTML(person)}
                </option>
            `;
        }).join("");

    [
        "expenseAuthorInput",
        "contributionPersonInput",
        "taskAuthorInput"
    ].forEach(function (id) {
        const element =
            layPhanTu(id);

        element.innerHTML = options;
        element.value = tenMacDinhTuEmail();
    });
}

function moModal(id) {
    const modal =
        layPhanTu(id);

    modal.classList.add("open");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "poqy-modal-open"
    );
}

function dongModal(id) {
    const modal =
        layPhanTu(id);

    modal.classList.remove("open");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    if (
        !document.querySelector(
            ".poqy-modal-overlay.open"
        )
    ) {
        document.body.classList.remove(
            "poqy-modal-open"
        );
    }
}

function datLoiForm(id, message) {
    layPhanTu(id).textContent =
        message || "";
}

function nenAnhCover(file) {
    return new Promise(function (resolve, reject) {
        const image = new Image();

        const objectUrl =
            URL.createObjectURL(file);

        image.onload = function () {
            const maximumWidth = 1600;

            const scale = Math.min(
                1,
                maximumWidth / image.naturalWidth
            );

            const canvas =
                document.createElement("canvas");

            canvas.width = Math.max(
                1,
                Math.round(
                    image.naturalWidth * scale
                )
            );

            canvas.height = Math.max(
                1,
                Math.round(
                    image.naturalHeight * scale
                )
            );

            const context =
                canvas.getContext("2d");

            context.drawImage(
                image,
                0,
                0,
                canvas.width,
                canvas.height
            );

            URL.revokeObjectURL(objectUrl);

            canvas.toBlob(
                function (blob) {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(
                            new Error(
                                "Không xử lý được ảnh cover."
                            )
                        );
                    }
                },
                "image/jpeg",
                0.84
            );
        };

        image.onerror = function () {
            URL.revokeObjectURL(objectUrl);

            reject(
                new Error(
                    "Không đọc được ảnh đã chọn."
                )
            );
        };

        image.src = objectUrl;
    });
}

async function taiAnhCoverLenSupabase(file) {
    const compressedImage =
        await nenAnhCover(file);

    const randomPart =
        Math.random()
            .toString(16)
            .slice(2);

    const filePath =
        `${Date.now()}-${randomPart}.jpg`;

    const uploadResult =
        await supabaseClient.storage
            .from("poqy-covers")
            .upload(
                filePath,
                compressedImage,
                {
                    contentType: "image/jpeg",
                    upsert: false
                }
            );

    if (uploadResult.error) {
        throw uploadResult.error;
    }

    const publicResult =
        supabaseClient.storage
            .from("poqy-covers")
            .getPublicUrl(filePath);

    return publicResult.data.publicUrl;
}

function moFormGoal(goal) {
    layPhanTu("goalForm").reset();

    datLoiForm(
        "goalFormMessage",
        ""
    );

    layPhanTu("goalModalTitle").textContent =
        goal
            ? "Chỉnh sửa mục tiêu"
            : "Tạo mục tiêu chung";

    layPhanTu("goalId").value =
        goal?.id || "";

    layPhanTu("goalNameInput").value =
        goal?.title || "";

    layPhanTu("goalEmojiInput").value =
        goal?.emoji || "🎯";

    layPhanTu("goalStartInput").value =
        goal?.start_date || layHomNayISO();

    layPhanTu("goalTargetInput").value =
        goal?.target_date || "";

    layPhanTu("goalProgressInput").value =
        Number(goal?.progress || 0);

    layPhanTu("goalPersonAInput").value =
        goal?.person_a || "";

    layPhanTu("goalPersonBInput").value =
        goal?.person_b || "";

    layPhanTu("goalCoverInput").value =
        goal?.cover_url || "";

    moModal("goalModal");
}

function moFormExpense(expense) {
    layPhanTu("expenseForm").reset();

    capNhatCacOChonNguoi();

    datLoiForm(
        "expenseFormMessage",
        ""
    );

    layPhanTu("expenseModalTitle").textContent =
        expense
            ? "Sửa khoản chi"
            : "Thêm khoản chi";

    layPhanTu("expenseId").value =
        expense?.id || "";

    layPhanTu("expenseNameInput").value =
        expense?.name || "";

    layPhanTu("expenseAmountInput").value =
        Number(expense?.amount || 0) || "";

    layPhanTu("expenseAuthorInput").value =
        expense?.entered_by ||
        tenMacDinhTuEmail();

    layPhanTu("expenseStatusInput").value =
        expense?.status || "pending";

    layPhanTu("expenseNoteInput").value =
        expense?.note || "";

    moModal("expenseModal");
}

function moFormTask(task) {
    layPhanTu("taskForm").reset();

    capNhatCacOChonNguoi();

    datLoiForm(
        "taskFormMessage",
        ""
    );

    layPhanTu("taskModalTitle").textContent =
        task
            ? "Sửa việc cần làm"
            : "Thêm việc cần làm";

    layPhanTu("taskId").value =
        task?.id || "";

    layPhanTu("taskTitleInput").value =
        task?.title || "";

    layPhanTu("taskAuthorInput").value =
        task?.added_by ||
        tenMacDinhTuEmail();

    moModal("taskModal");
}

function moFormMilestone(milestone) {
    layPhanTu("milestoneForm").reset();

    datLoiForm(
        "milestoneFormMessage",
        ""
    );

    layPhanTu("milestoneModalTitle").textContent =
        milestone
            ? "Sửa mốc quan trọng"
            : "Thêm mốc quan trọng";

    layPhanTu("milestoneId").value =
        milestone?.id || "";

    layPhanTu("milestoneIconInput").value =
        milestone?.icon || "🎯";

    layPhanTu("milestoneDateInput").value =
        milestone?.milestone_date || "";

    layPhanTu("milestoneTitleInput").value =
        milestone?.title || "";

    layPhanTu("milestoneNoteInput").value =
        milestone?.note || "";

    moModal("milestoneModal");
}
async function ghiHoatDong(
    actor,
    message,
    goalId
) {
    const result =
        await supabaseClient
            .from("poqy_activities")
            .insert({
                goal_id:
                    goalId ||
                    poqyCurrentGoal.id,

                actor_name:
                    actor ||
                    tenMacDinhTuEmail(),

                message
            });

    if (result.error) {
        console.warn(
            "Chưa ghi được hoạt động:",
            result.error
        );
    }
}

async function guiFormGoal(event) {
    event.preventDefault();

    const id =
        layPhanTu("goalId").value;

    const startDate =
        layPhanTu("goalStartInput").value;

    const targetDate =
        layPhanTu("goalTargetInput").value;

    if (targetDate < startDate) {
        datLoiForm(
            "goalFormMessage",
            "Ngày mục tiêu phải sau ngày bắt đầu."
        );

        return;
    }

    const payload = {
        title:
            layPhanTu("goalNameInput")
                .value
                .trim(),

        emoji:
            layPhanTu("goalEmojiInput")
                .value
                .trim() || "🎯",

        start_date: startDate,
        target_date: targetDate,

        progress: Number(
            layPhanTu("goalProgressInput")
                .value || 0
        ),

        person_a:
            layPhanTu("goalPersonAInput")
                .value
                .trim(),

        person_b:
            layPhanTu("goalPersonBInput")
                .value
                .trim(),

        cover_url:
            layPhanTu("goalCoverInput")
                .value
                .trim() || null,

        updated_at:
            new Date().toISOString()
    };

    try {
        const coverFile =
            layPhanTu("goalCoverFileInput")
                .files[0];

        if (coverFile) {
            payload.cover_url =
                await taiAnhCoverLenSupabase(
                    coverFile
                );
        }

        let savedGoal;

        if (id) {
            const result =
                await supabaseClient
                    .from("poqy_goals")
                    .update(payload)
                    .eq("id", id)
                    .select()
                    .single();

            if (result.error) {
                throw result.error;
            }

            savedGoal = result.data;

            await ghiHoatDong(
                tenMacDinhTuEmail(),
                "vừa cập nhật thông tin mục tiêu.",
                id
            );

        } else {
            const result =
                await supabaseClient
                    .from("poqy_goals")
                    .insert(payload)
                    .select()
                    .single();

            if (result.error) {
                throw result.error;
            }

            savedGoal = result.data;

            await ghiHoatDong(
                payload.person_a,
                `vừa tạo mục tiêu: ${payload.title} 🎯`,
                savedGoal.id
            );
        }

        dongModal("goalModal");

        localStorage.setItem(
            POQY_SELECTED_GOAL_KEY,
            savedGoal.id
        );

        await taiPoQy();

    } catch (error) {
        datLoiForm(
            "goalFormMessage",
            error.message ||
            "Chưa lưu được mục tiêu."
        );
    }
}

async function guiFormExpense(event) {
    event.preventDefault();

    const id =
        layPhanTu("expenseId").value;

    const payload = {
        goal_id: poqyCurrentGoal.id,

        name:
            layPhanTu("expenseNameInput")
                .value
                .trim(),

        amount: Number(
            layPhanTu("expenseAmountInput")
                .value || 0
        ),

        entered_by:
            layPhanTu("expenseAuthorInput")
                .value,

        status:
            layPhanTu("expenseStatusInput")
                .value,

        note:
            layPhanTu("expenseNoteInput")
                .value
                .trim(),

        updated_at:
            new Date().toISOString()
    };

    try {
        const result = id
            ? await supabaseClient
                .from("poqy_expenses")
                .update(payload)
                .eq("id", id)

            : await supabaseClient
                .from("poqy_expenses")
                .insert(payload);

        if (result.error) {
            throw result.error;
        }

        await ghiHoatDong(
            payload.entered_by,

            `${id ? "vừa cập nhật" : "vừa thêm"} khoản chi ${payload.name} – ${dinhDangTien(payload.amount)}`
        );

        dongModal("expenseModal");

        await taiDuLieuGoal(
            poqyCurrentGoal.id,
            false
        );

    } catch (error) {
        datLoiForm(
            "expenseFormMessage",
            error.message ||
            "Chưa lưu được khoản chi."
        );
    }
}

async function guiFormContribution(event) {
    event.preventDefault();

    const payload = {
        goal_id: poqyCurrentGoal.id,

        person_name:
            layPhanTu("contributionPersonInput")
                .value,

        amount: Number(
            layPhanTu("contributionAmountInput")
                .value || 0
        ),

        note:
            layPhanTu("contributionNoteInput")
                .value
                .trim()
    };

    try {
        const result =
            await supabaseClient
                .from("poqy_contributions")
                .insert(payload);

        if (result.error) {
            throw result.error;
        }

        await ghiHoatDong(
            payload.person_name,
            `vừa đóng góp ${dinhDangTien(payload.amount)} 💰`
        );

        dongModal("contributionModal");

        layPhanTu("contributionForm")
            .reset();

        await taiDuLieuGoal(
            poqyCurrentGoal.id,
            false
        );

    } catch (error) {
        datLoiForm(
            "contributionFormMessage",
            error.message ||
            "Chưa lưu được khoản đóng góp."
        );
    }
}

async function guiFormTask(event) {
    event.preventDefault();

    const id =
        layPhanTu("taskId").value;

    const payload = {
        goal_id: poqyCurrentGoal.id,

        title:
            layPhanTu("taskTitleInput")
                .value
                .trim(),

        added_by:
            layPhanTu("taskAuthorInput")
                .value,

        updated_at:
            new Date().toISOString()
    };

    try {
        const result = id
            ? await supabaseClient
                .from("poqy_tasks")
                .update(payload)
                .eq("id", id)

            : await supabaseClient
                .from("poqy_tasks")
                .insert(payload);

        if (result.error) {
            throw result.error;
        }

        await ghiHoatDong(
            payload.added_by,

            `${id ? "vừa cập nhật" : "vừa thêm"}: ${payload.title}`
        );

        dongModal("taskModal");

        await taiDuLieuGoal(
            poqyCurrentGoal.id,
            false
        );

    } catch (error) {
        datLoiForm(
            "taskFormMessage",
            error.message ||
            "Chưa lưu được công việc."
        );
    }
}

async function guiFormMilestone(event) {
    event.preventDefault();

    const id =
        layPhanTu("milestoneId").value;

    const payload = {
        goal_id: poqyCurrentGoal.id,

        icon:
            layPhanTu("milestoneIconInput")
                .value
                .trim() || "🎯",

        milestone_date:
            layPhanTu("milestoneDateInput")
                .value,

        title:
            layPhanTu("milestoneTitleInput")
                .value
                .trim(),

        note:
            layPhanTu("milestoneNoteInput")
                .value
                .trim(),

        updated_at:
            new Date().toISOString()
    };

    try {
        const result = id
            ? await supabaseClient
                .from("poqy_milestones")
                .update(payload)
                .eq("id", id)

            : await supabaseClient
                .from("poqy_milestones")
                .insert(payload);

        if (result.error) {
            throw result.error;
        }

        await ghiHoatDong(
            tenMacDinhTuEmail(),

            `${id ? "vừa cập nhật" : "vừa thêm mốc"}: ${payload.title} 📅`
        );

        dongModal("milestoneModal");

        await taiDuLieuGoal(
            poqyCurrentGoal.id,
            false
        );

    } catch (error) {
        datLoiForm(
            "milestoneFormMessage",
            error.message ||
            "Chưa lưu được cột mốc."
        );
    }
}

async function luuGhiChu() {
    const notes =
        layPhanTu("goalNotes")
            .value
            .trim();

    const button =
        layPhanTu("saveNotesButton");

    button.disabled = true;
    button.textContent = "Đang lưu...";

    try {
        const result =
            await supabaseClient
                .from("poqy_goals")
                .update({
                    notes,

                    updated_at:
                        new Date()
                            .toISOString()
                })
                .eq(
                    "id",
                    poqyCurrentGoal.id
                );

        if (result.error) {
            throw result.error;
        }

        poqyCurrentGoal.notes = notes;

        await ghiHoatDong(
            tenMacDinhTuEmail(),
            "vừa cập nhật ghi chú chung 📝"
        );

        await taiDuLieuGoal(
            poqyCurrentGoal.id,
            false
        );

        button.textContent = "Đã lưu ✓";

    } catch (error) {
        alert(
            error.message ||
            "Chưa lưu được ghi chú."
        );

    } finally {
        button.disabled = false;

        window.setTimeout(function () {
            button.textContent =
                "Lưu ghi chú";
        }, 1300);
    }
}

async function xuLyHanhDongDanhSach(
    action,
    id,
    target
) {
    if (action === "edit-expense") {
        moFormExpense(
            poqyExpenses.find(function (item) {
                return item.id === id;
            })
        );

        return;
    }

    if (action === "edit-task") {
        moFormTask(
            poqyTasks.find(function (item) {
                return item.id === id;
            })
        );

        return;
    }

    if (action === "edit-milestone") {
        moFormMilestone(
            poqyMilestones.find(function (item) {
                return item.id === id;
            })
        );

        return;
    }

    if (action === "toggle-task") {
        const task =
            poqyTasks.find(function (item) {
                return item.id === id;
            });

        const completed =
            Boolean(target.checked);

        const actor =
            tenMacDinhTuEmail();

        const result =
            await supabaseClient
                .from("poqy_tasks")
                .update({
                    completed,

                    completed_by:
                        completed
                            ? actor
                            : null,

                    completed_at:
                        completed
                            ? new Date().toISOString()
                            : null,

                    updated_at:
                        new Date().toISOString()
                })
                .eq("id", id);

        if (result.error) {
            throw result.error;
        }

        await ghiHoatDong(
            actor,

            completed
                ? `vừa hoàn thành: ${task.title} ❤️`
                : `vừa mở lại công việc: ${task.title}`
        );

        await taiDuLieuGoal(
            poqyCurrentGoal.id,
            false
        );

        return;
    }

    const deleteMap = {
        "delete-expense": {
            table: "poqy_expenses",

            item:
                poqyExpenses.find(
                    function (entry) {
                        return entry.id === id;
                    }
                ),

            label: "khoản chi"
        },

        "delete-task": {
            table: "poqy_tasks",

            item:
                poqyTasks.find(
                    function (entry) {
                        return entry.id === id;
                    }
                ),

            label: "công việc"
        },

        "delete-milestone": {
            table: "poqy_milestones",

            item:
                poqyMilestones.find(
                    function (entry) {
                        return entry.id === id;
                    }
                ),

            label: "cột mốc"
        }
    };

    const deleteInfo =
        deleteMap[action];

    if (
        !deleteInfo ||
        !window.confirm(
            `Xóa ${deleteInfo.label} này?`
        )
    ) {
        return;
    }

    const result =
        await supabaseClient
            .from(deleteInfo.table)
            .delete()
            .eq("id", id);

    if (result.error) {
        throw result.error;
    }

    await ghiHoatDong(
        tenMacDinhTuEmail(),

        `vừa xóa ${deleteInfo.label}: ${deleteInfo.item?.name ||
        deleteInfo.item?.title ||
        ""
        }`
    );

    await taiDuLieuGoal(
        poqyCurrentGoal.id,
        false
    );
}

function ganSuKienPoQy() {
    layPhanTu("createFirstGoalButton")
        .addEventListener(
            "click",
            function () {
                moFormGoal(null);
            }
        );

    layPhanTu("createGoalButton")
        .addEventListener(
            "click",
            function () {
                moFormGoal(null);
            }
        );

    layPhanTu("editGoalButton")
        .addEventListener(
            "click",
            function () {
                moFormGoal(poqyCurrentGoal);
            }
        );

    layPhanTu("addExpenseButton")
        .addEventListener(
            "click",
            function () {
                moFormExpense(null);
            }
        );

    layPhanTu("addContributionButton")
        .addEventListener(
            "click",
            function () {
                layPhanTu("contributionForm")
                    .reset();

                datLoiForm(
                    "contributionFormMessage",
                    ""
                );

                capNhatCacOChonNguoi();

                moModal("contributionModal");
            }
        );

    layPhanTu("addTaskButton")
        .addEventListener(
            "click",
            function () {
                moFormTask(null);
            }
        );

    layPhanTu("addMilestoneButton")
        .addEventListener(
            "click",
            function () {
                moFormMilestone(null);
            }
        );

    layPhanTu("refreshGoalButton")
        .addEventListener(
            "click",
            taiPoQy
        );

    layPhanTu("saveNotesButton")
        .addEventListener(
            "click",
            luuGhiChu
        );

    layPhanTu("goalSelect")
        .addEventListener(
            "change",
            function (event) {
                chonGoal(
                    event.target.value
                );
            }
        );

    layPhanTu("goalForm")
        .addEventListener(
            "submit",
            guiFormGoal
        );

    layPhanTu("expenseForm")
        .addEventListener(
            "submit",
            guiFormExpense
        );

    layPhanTu("contributionForm")
        .addEventListener(
            "submit",
            guiFormContribution
        );

    layPhanTu("taskForm")
        .addEventListener(
            "submit",
            guiFormTask
        );

    layPhanTu("milestoneForm")
        .addEventListener(
            "submit",
            guiFormMilestone
        );

    document
        .querySelectorAll("[data-close-modal]")
        .forEach(function (button) {
            button.addEventListener(
                "click",
                function () {
                    dongModal(
                        button.dataset.closeModal
                    );
                }
            );
        });

    document
        .querySelectorAll(".poqy-modal-overlay")
        .forEach(function (overlay) {
            overlay.addEventListener(
                "click",
                function (event) {
                    if (event.target === overlay) {
                        dongModal(overlay.id);
                    }
                }
            );
        });

    document.addEventListener(
        "keydown",
        function (event) {
            if (event.key === "Escape") {
                document
                    .querySelectorAll(
                        ".poqy-modal-overlay.open"
                    )
                    .forEach(function (modal) {
                        dongModal(modal.id);
                    });
            }
        }
    );

    document.addEventListener(
        "click",
        async function (event) {
            const button =
                event.target.closest(
                    "[data-action]"
                );

            if (!button) {
                return;
            }

            try {
                await xuLyHanhDongDanhSach(
                    button.dataset.action,
                    button.dataset.id,
                    button
                );

            } catch (error) {
                console.error(
                    "Không thể cập nhật PoQy:",
                    error
                );

                alert(
                    error.message ||
                    "Chưa cập nhật được. Hãy thử lại."
                );

                if (
                    button.matches(
                        "input[type='checkbox']"
                    )
                ) {
                    button.checked =
                        !button.checked;
                }
            }
        }
    );
}