document.addEventListener(
    "DOMContentLoaded",
    function () {
        kiemTraPhienDangNhap();
        ganSuKienDangNhap();
    }
);


/* =========================
   KIỂM TRA ĐÃ ĐĂNG NHẬP
========================= */

async function kiemTraPhienDangNhap() {
    const {
        data,
        error
    } = await supabaseClient.auth.getSession();

    if (error) {
        console.error(
            "Không thể kiểm tra phiên đăng nhập:",
            error.message
        );

        return;
    }

    if (data.session) {
        window.location.replace("index.html");
    }
}


/* =========================
   XỬ LÝ ĐĂNG NHẬP
========================= */

function ganSuKienDangNhap() {
    const loginForm =
        document.getElementById("loginForm");

    if (!loginForm) {
        return;
    }

    loginForm.addEventListener(
        "submit",
        async function (event) {
            event.preventDefault();

            const emailInput =
                document.getElementById("loginEmail");

            const passwordInput =
                document.getElementById(
                    "loginPassword"
                );

            const loginButton =
                document.getElementById(
                    "loginButton"
                );

            const loginMessage =
                document.getElementById(
                    "loginMessage"
                );

            const email =
                emailInput.value.trim();

            const password =
                passwordInput.value;

            loginButton.disabled = true;
            loginButton.textContent =
                "Đang đăng nhập...";

            loginMessage.textContent = "";
            loginMessage.className =
                "login-message";

            try {
                const {
                    data,
                    error
                } =
                    await supabaseClient.auth
                        .signInWithPassword({
                            email: email,
                            password: password
                        });

                if (error) {
                    throw error;
                }

                if (!data.session) {
                    throw new Error(
                        "Không tạo được phiên đăng nhập."
                    );
                }

                loginMessage.textContent =
                    "Đăng nhập thành công.";

                loginMessage.classList.add(
                    "success"
                );

                window.location.replace(
                    "index.html"
                );
            } catch (error) {
                hienThiLoiDangNhap(
                    error,
                    loginMessage
                );

                loginButton.disabled = false;

                loginButton.textContent =
                    "Đăng nhập";
            }
        }
    );
}


/* =========================
   THÔNG BÁO LỖI
========================= */

function hienThiLoiDangNhap(
    error,
    messageElement
) {
    let message =
        "Không thể đăng nhập. Hãy thử lại.";

    if (
        error.message ===
        "Invalid login credentials"
    ) {
        message =
            "Email hoặc mật khẩu chưa đúng.";
    }

    if (
        error.message
            .toLowerCase()
            .includes("email not confirmed")
    ) {
        message =
            "Tài khoản chưa được xác nhận email.";
    }

    messageElement.textContent = message;

    messageElement.classList.add("error");

    console.error(
        "Lỗi đăng nhập:",
        error.message
    );
}