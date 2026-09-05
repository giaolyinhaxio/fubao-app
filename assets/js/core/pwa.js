if ("serviceWorker" in navigator) {
    window.addEventListener(
        "load",
        async function () {
            try {
                const registration =
                    await navigator
                        .serviceWorker
                        .register(
                            "./service-worker.js"
                        );

                console.log(
                    "PWA đã được đăng ký:",
                    registration.scope
                );
            } catch (error) {
                console.error(
                    "Không thể đăng ký PWA:",
                    error.message
                );
            }
        }
    );
}