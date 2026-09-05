/* =========================
   CẤU HÌNH THÔNG BÁO
========================= */

const VAPID_PUBLIC_KEY =
    "BEPkKbTgm1KlNZLKHafOWOn8rCMhTM04pbwsJSVbJQI2J2RUJRlHMHf9hDF0pyFXqOBX7hKHQwSJQbbpDrNo1e0";

const NOTIFICATION_FUNCTION_NAME =
    "dynamic-processor";

const TIMEZONE_STORAGE_KEY =
    "fubaoDisplayTimezone";


/* Chuyển VAPID Public Key sang dạng trình duyệt cần */

function chuyenVapidKey(base64String) {
    const cleanKey =
        String(base64String).trim();


    if (
        !/^[A-Za-z0-9_-]{87}$/.test(
            cleanKey
        )
    ) {
        throw new Error(
            "VAPID Public Key chưa đúng. Khóa phải có đúng 87 ký tự."
        );
    }


    const padding =
        "=".repeat(
            (
                4 -
                cleanKey.length % 4
            ) % 4
        );


    const base64 =
        (
            cleanKey + padding
        )
            .replaceAll("-", "+")
            .replaceAll("_", "/");


    const rawData =
        window.atob(base64);


    return Uint8Array.from(
        [...rawData].map(
            function (character) {
                return character
                    .charCodeAt(0);
            }
        )
    );
}


/* Lấy tài khoản đang đăng nhập */

async function layNguoiDungThongBao() {
    const {
        data,
        error
    } = await supabaseClient.auth.getUser();

    if (
        error ||
        !data.user
    ) {
        throw new Error(
            "Không tìm thấy tài khoản đăng nhập."
        );
    }

    return data.user;
}


/* Hiển thị trạng thái */

function hienThiTrangThaiThongBao(
    message,
    isError
) {
    const statusElement =
        document.getElementById(
            "notificationStatus"
        );

    if (!statusElement) {
        return;
    }

    statusElement.textContent = message;

    statusElement.classList.toggle(
        "error",
        Boolean(isError)
    );
}


/* Lấy múi giờ đang chọn */

function layMuiGioThongBao() {
    const timezone =
        localStorage.getItem(
            TIMEZONE_STORAGE_KEY
        );

    if (timezone === "Asia/Tokyo") {
        return "Asia/Tokyo";
    }

    return "Asia/Ho_Chi_Minh";
}


/* Lấy số phút báo trước */

function laySoPhutBaoTruoc() {
    const selectElement =
        document.getElementById(
            "notificationMinutesSelect"
        );

    if (!selectElement) {
        return 30;
    }

    return Number(
        selectElement.value
    ) || 30;
}


/* Lưu cài đặt vào Supabase */

async function luuCaiDatThongBao(
    userId,
    enabled
) {
    const {
        error
    } = await supabaseClient
        .from("notification_settings")
        .upsert(
            {
                user_id: userId,

                enabled: enabled,

                minutes_before:
                    laySoPhutBaoTruoc(),

                timezone:
                    layMuiGioThongBao(),

                updated_at:
                    new Date().toISOString()
            },
            {
                onConflict: "user_id"
            }
        );

    if (error) {
        throw error;
    }
}


/* Lưu thiết bị nhận thông báo */

async function luuThietBiThongBao(
    userId,
    subscription
) {
    const subscriptionData =
        subscription.toJSON();

    if (
        !subscriptionData.keys ||
        !subscriptionData.keys.p256dh ||
        !subscriptionData.keys.auth
    ) {
        throw new Error(
            "Không lấy được khóa của thiết bị."
        );
    }

    const {
        error
    } = await supabaseClient
        .from("push_subscriptions")
        .upsert(
            {
                user_id: userId,

                endpoint:
                    subscription.endpoint,

                p256dh:
                    subscriptionData.keys.p256dh,

                auth:
                    subscriptionData.keys.auth,

                user_agent:
                    navigator.userAgent,

                updated_at:
                    new Date().toISOString()
            },
            {
                onConflict: "endpoint"
            }
        );

    if (error) {
        throw error;
    }
}


/* Đổi trạng thái nút bật/tắt */

function capNhatNutThongBao(enabled) {
    const toggleButton =
        document.getElementById(
            "notificationToggleButton"
        );

    const testButton =
        document.getElementById(
            "testNotificationButton"
        );

    if (toggleButton) {
        toggleButton.dataset.enabled =
            enabled ? "true" : "false";

        toggleButton.textContent =
            enabled
                ? "Tắt thông báo"
                : "Bật thông báo";
    }

    if (testButton) {
        testButton.disabled = !enabled;
    }
}


/* Kiểm tra trình duyệt */

function trinhDuyetHoTroThongBao() {
    return (
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window
    );
}


/* Bật thông báo */

async function batThongBao() {
    if (!trinhDuyetHoTroThongBao()) {
        throw new Error(
            "Thiết bị hoặc trình duyệt này chưa hỗ trợ thông báo."
        );
    }

    const permission =
        await Notification.requestPermission();

    if (permission !== "granted") {
        throw new Error(
            "Bạn chưa cho phép FuBao gửi thông báo."
        );
    }

    const user =
        await layNguoiDungThongBao();

    const registration =
        await navigator.serviceWorker.ready;

    let subscription =
        await registration.pushManager
            .getSubscription();

    if (!subscription) {
        subscription =
            await registration.pushManager
                .subscribe({
                    userVisibleOnly: true,

                    applicationServerKey:
                        chuyenVapidKey(
                            VAPID_PUBLIC_KEY
                        )
                });
    }

    await luuThietBiThongBao(
        user.id,
        subscription
    );

    await luuCaiDatThongBao(
        user.id,
        true
    );

    capNhatNutThongBao(true);

    hienThiTrangThaiThongBao(
        `Đã bật · Báo trước ${laySoPhutBaoTruoc()} phút`,
        false
    );
}


/* Tắt thông báo */

async function tatThongBao() {
    const user =
        await layNguoiDungThongBao();

    const registration =
        await navigator.serviceWorker.ready;

    const subscription =
        await registration.pushManager
            .getSubscription();

    if (subscription) {
        const {
            error
        } = await supabaseClient
            .from("push_subscriptions")
            .delete()
            .eq(
                "user_id",
                user.id
            )
            .eq(
                "endpoint",
                subscription.endpoint
            );

        if (error) {
            throw error;
        }

        await subscription.unsubscribe();
    }

    await luuCaiDatThongBao(
        user.id,
        false
    );

    capNhatNutThongBao(false);

    hienThiTrangThaiThongBao(
        "Thông báo đang tắt",
        false
    );
}


/* Xử lý nút bật/tắt */

async function xuLyNutThongBao() {
    const toggleButton =
        document.getElementById(
            "notificationToggleButton"
        );

    if (!toggleButton) {
        return;
    }

    toggleButton.disabled = true;

    hienThiTrangThaiThongBao(
        "Đang xử lý...",
        false
    );

    try {
        const isEnabled =
            toggleButton.dataset.enabled ===
            "true";

        if (isEnabled) {
            await tatThongBao();
        } else {
            await batThongBao();
        }
    } catch (error) {
        console.error(
            "Lỗi thông báo:",
            error
        );

        hienThiTrangThaiThongBao(
            error.message ||
            "Không thể thay đổi cài đặt thông báo.",
            true
        );
    } finally {
        toggleButton.disabled = false;
    }
}


/* Gửi thông báo thử */

async function guiThongBaoThu() {
    const testButton =
        document.getElementById(
            "testNotificationButton"
        );

    if (testButton) {
        testButton.disabled = true;
        testButton.textContent =
            "Đang gửi...";
    }

    try {
        const {
            data,
            error
        } = await supabaseClient
            .functions
            .invoke(
                NOTIFICATION_FUNCTION_NAME,
                {
                    body: {}
                }
            );

        if (error) {
            throw error;
        }

        if (
            !data ||
            data.sent < 1
        ) {
            throw new Error(
                "Chưa gửi được đến thiết bị."
            );
        }

        hienThiTrangThaiThongBao(
            "Đã gửi thông báo thử",
            false
        );
    } catch (error) {
        console.error(
            "Không gửi được thông báo thử:",
            error
        );

        hienThiTrangThaiThongBao(
            error.message ||
            "Không gửi được thông báo thử.",
            true
        );
    } finally {
        if (testButton) {
            testButton.disabled = false;
            testButton.textContent =
                "Gửi thông báo thử";
        }
    }
}


/* Lưu lại số phút và múi giờ */

async function dongBoCaiDatThongBao() {
    try {
        const user =
            await layNguoiDungThongBao();

        const registration =
            await navigator.serviceWorker.ready;

        const subscription =
            await registration.pushManager
                .getSubscription();

        await luuCaiDatThongBao(
            user.id,
            Boolean(subscription)
        );

        if (subscription) {
            hienThiTrangThaiThongBao(
                `Đã bật · Báo trước ${laySoPhutBaoTruoc()} phút`,
                false
            );
        }
    } catch (error) {
        console.error(
            "Không đồng bộ được cài đặt:",
            error
        );
    }
}


/* Tải cài đặt hiện tại */

async function taiCaiDatThongBao() {
    const toggleButton =
        document.getElementById(
            "notificationToggleButton"
        );

    if (!toggleButton) {
        return;
    }

    if (!trinhDuyetHoTroThongBao()) {
        toggleButton.disabled = true;

        hienThiTrangThaiThongBao(
            "Chỉ bật được trên thiết bị hỗ trợ Web Push.",
            true
        );

        return;
    }

    try {
        const user =
            await layNguoiDungThongBao();

        const {
            data,
            error
        } = await supabaseClient
            .from("notification_settings")
            .select(`
                enabled,
                minutes_before,
                timezone
            `)
            .eq(
                "user_id",
                user.id
            )
            .maybeSingle();

        if (error) {
            throw error;
        }

        const minutesSelect =
            document.getElementById(
                "notificationMinutesSelect"
            );

        if (
            minutesSelect &&
            data?.minutes_before
        ) {
            minutesSelect.value =
                String(
                    data.minutes_before
                );
        }

        const registration =
            await navigator.serviceWorker.ready;

        const subscription =
            await registration.pushManager
                .getSubscription();

        const isEnabled =
            Boolean(
                data?.enabled &&
                subscription
            );

        capNhatNutThongBao(isEnabled);

        hienThiTrangThaiThongBao(
            isEnabled
                ? `Đã bật · Báo trước ${laySoPhutBaoTruoc()} phút`
                : "Thông báo đang tắt",
            false
        );
    } catch (error) {
        console.error(
            "Không tải được cài đặt:",
            error
        );

        hienThiTrangThaiThongBao(
            "Chưa tải được cài đặt thông báo.",
            true
        );
    }
}


/* Gắn sự kiện */

document.addEventListener(
    "DOMContentLoaded",
    function () {
        const toggleButton =
            document.getElementById(
                "notificationToggleButton"
            );

        const testButton =
            document.getElementById(
                "testNotificationButton"
            );

        const minutesSelect =
            document.getElementById(
                "notificationMinutesSelect"
            );

        const timezoneSelect =
            document.getElementById(
                "displayTimezoneSelect"
            );

        if (toggleButton) {
            toggleButton.addEventListener(
                "click",
                xuLyNutThongBao
            );
        }

        if (testButton) {
            testButton.addEventListener(
                "click",
                guiThongBaoThu
            );
        }

        if (minutesSelect) {
            minutesSelect.addEventListener(
                "change",
                dongBoCaiDatThongBao
            );
        }

        if (timezoneSelect) {
            timezoneSelect.addEventListener(
                "change",
                dongBoCaiDatThongBao
            );
        }

        taiCaiDatThongBao();
    }
);