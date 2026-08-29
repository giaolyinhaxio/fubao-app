document.body.style.visibility = "hidden";

kiemTraQuyenTruyCap();


async function kiemTraQuyenTruyCap() {
    try {
        const {
            data,
            error
        } = await supabaseClient.auth.getSession();

        if (error) {
            throw error;
        }

        if (!data.session) {
            window.location.replace(
                "login.html"
            );

            return;
        }

        hienThiTaiKhoan(
            data.session.user
        );

        ganSuKienDangXuat();

        document.body.style.visibility =
            "visible";
    } catch (error) {
        console.error(
            "Không thể kiểm tra đăng nhập:",
            error.message
        );

        window.location.replace(
            "login.html"
        );
    }
}


function hienThiTaiKhoan(user) {
    const emailElement =
        document.getElementById(
            "currentUserEmail"
        );

    if (!emailElement) {
        return;
    }

    emailElement.textContent =
        user.email || "Đã đăng nhập";
}


function ganSuKienDangXuat() {
    const logoutButton =
        document.getElementById(
            "logoutButton"
        );

    if (!logoutButton) {
        return;
    }

    logoutButton.addEventListener(
        "click",
        dangXuat
    );
}


async function dangXuat() {
    const logoutButton =
        document.getElementById(
            "logoutButton"
        );

    if (logoutButton) {
        logoutButton.disabled = true;
        logoutButton.textContent =
            "Đang thoát...";
    }

    const {
        error
    } = await supabaseClient.auth.signOut();

    if (error) {
        console.error(
            "Không thể đăng xuất:",
            error.message
        );

        if (logoutButton) {
            logoutButton.disabled = false;
            logoutButton.textContent =
                "Đăng xuất";
        }

        alert(
            "Không thể đăng xuất. Hãy thử lại."
        );

        return;
    }

    window.location.replace("login.html");
}