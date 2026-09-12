const CACHE_NAME = "fubao-v35";

const APP_FILES = [
    "./",
    "./index.html",
    "./login.html",
    "./diquy.html",
    "./lich-tuan.html",
    "./tioong.html",
    "./chung-minh.html",

    "./english.html",
    "./verbs.html",
    "./verb-flashcard.html",
    "./assets/js/english/verbs.js?v=1",
    "./assets/js/english/verb-flashcard.js?v=1",
    "./vocabulary.html",
    "./assets/js/english/vocabulary-home.js",
    "./vocabulary-list.html",
    "./assets/js/english/vocabulary-list.js",
    "./flashcard.html",
    "./assets/js/english/flashcard.js",
    "./reading-list.html",
    "./assets/js/english/reading-list.js",
    "./reading.html",
    "./assets/js/english/reading.js",

    "./assets/css/style.css",
    "./assets/js/core/app.js",
    "./assets/css/poqy.css",
    "./assets/js/poqy/poqy.js",
    "./assets/js/core/notifications.js",
    "./tioong-calendar.html",
    "./assets/js/tioong/tioong-calendar.js",
    "./tioong-tasks.html",
    "./assets/js/tioong/tioong-tasks.js",
    "./assets/js/core/auth.js",
    "./assets/js/core/auth-guard.js",
    "./assets/js/core/supabase-config.js",
    "./assets/js/diquy/week.js",
    "./assets/js/core/pwa.js",
    "./poqy-detail.html",
    "./assets/js/poqy/poqy-detail.js",

    "./manifest.json",
    "./assets/icons/icon.svg",
    "./assets/icons/icon-192.png",
    "./assets/icons/icon-512.png",
    "./assets/icons/bear-favicon.svg",
    "./assets/icons/apple-touch-icon.png"
];


/* Cài đặt và lưu app shell */

self.addEventListener(
    "install",
    function (event) {
        event.waitUntil(
            caches
                .open(CACHE_NAME)
                .then(function (cache) {
                    return cache.addAll(
                        APP_FILES
                    );
                })
        );

        self.skipWaiting();
    }
);


/* Xóa cache phiên bản cũ */

self.addEventListener(
    "activate",
    function (event) {
        event.waitUntil(
            caches
                .keys()
                .then(function (cacheNames) {
                    return Promise.all(
                        cacheNames.map(
                            function (cacheName) {
                                if (
                                    cacheName !==
                                    CACHE_NAME
                                ) {
                                    return caches.delete(
                                        cacheName
                                    );
                                }

                                return null;
                            }
                        )
                    );
                })
        );

        self.clients.claim();
    }
);


/* Xử lý các yêu cầu tải file */

self.addEventListener(
    "fetch",
    function (event) {
        const request = event.request;

        if (request.method !== "GET") {
            return;
        }

        const requestURL =
            new URL(request.url);


        /* Không can thiệp API Supabase */

        if (
            requestURL.hostname.includes(
                "supabase.co"
            )
        ) {
            return;
        }


        /* Trang HTML: ưu tiên bản mới từ mạng */

        if (request.mode === "navigate") {
            event.respondWith(
                fetch(request)
                    .then(function (response) {
                        const responseCopy =
                            response.clone();

                        caches
                            .open(CACHE_NAME)
                            .then(function (cache) {
                                cache.put(
                                    request,
                                    responseCopy
                                );
                            });

                        return response;
                    })
                    .catch(function () {
                        return caches
                            .match(request)
                            .then(function (
                                cachedResponse
                            ) {
                                return (
                                    cachedResponse ||
                                    caches.match(
                                        "./login.html"
                                    )
                                );
                            });
                    })
            );

            return;
        }


        /* CSS và JavaScript: ưu tiên cache */

        event.respondWith(
            caches
                .match(request)
                .then(function (
                    cachedResponse
                ) {
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    return fetch(request)
                        .then(function (
                            response
                        ) {
                            const responseCopy =
                                response.clone();

                            caches
                                .open(CACHE_NAME)
                                .then(function (
                                    cache
                                ) {
                                    cache.put(
                                        request,
                                        responseCopy
                                    );
                                });

                            return response;
                        });
                })
        );
    }
);

/* =========================
   NHẬN THÔNG BÁO ĐẨY
========================= */

self.addEventListener(
    "push",
    function (event) {
        let notificationData = {};

        if (event.data) {
            try {
                notificationData =
                    event.data.json();
            } catch (error) {
                notificationData = {
                    body:
                        event.data.text()
                };
            }
        }


        const title =
            notificationData.title ||
            "FuBao 🐼";


        const options = {
            body:
                notificationData.body ||
                "Bạn có một lịch trình sắp bắt đầu.",

            icon:
                notificationData.icon ||
                "./assets/icons/icon-192.png",

            badge:
                notificationData.badge ||
                "./assets/icons/icon-192.png",

            tag:
                notificationData.tag ||
                "fubao-schedule",

            data: {
                url:
                    notificationData.url ||
                    "./diquy.html"
            }
        };


        event.waitUntil(
            self.registration
                .showNotification(
                    title,
                    options
                )
        );
    }
);


/* =========================
   MỞ APP KHI NHẤN THÔNG BÁO
========================= */

self.addEventListener(
    "notificationclick",
    function (event) {
        event.notification.close();


        const targetURL =
            new URL(
                event.notification.data?.url ||
                "./diquy.html",

                self.location.origin
            ).href;


        event.waitUntil(
            self.clients
                .matchAll({
                    type: "window",
                    includeUncontrolled: true
                })
                .then(
                    async function (
                        clientList
                    ) {
                        for (
                            const client
                            of clientList
                        ) {
                            if (
                                client.url ===
                                targetURL
                            ) {
                                return client.focus();
                            }
                        }


                        for (
                            const client
                            of clientList
                        ) {
                            if (
                                "navigate" in client
                            ) {
                                await client.navigate(
                                    targetURL
                                );

                                return client.focus();
                            }
                        }


                        if (
                            self.clients.openWindow
                        ) {
                            return self.clients
                                .openWindow(
                                    targetURL
                                );
                        }

                        return null;
                    }
                )
        );
    }
);