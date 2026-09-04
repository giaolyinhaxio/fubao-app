const CACHE_NAME = "fubao-v14";

const APP_FILES = [
    "./",
    "./index.html",
    "./login.html",
    "./diquy.html",
    "./lich-tuan.html",
    "./tioong.html",
    "./chung-minh.html",

    "./english.html",
    "./vocabulary.html",
    "./vocabulary-home.js",
    "./vocabulary-list.html",
    "./vocabulary-list.js",
    "./flashcard.html",
    "./flashcard.js",

    "./style.css",
    "./app.js",
    "./notifications.js",
    "./tioong-calendar.html",
    "./tioong-calendar.js",
    "./tioong-tasks.html",
    "./tioong-tasks.js",
    "./auth.js",
    "./auth-guard.js",
    "./supabase-config.js",
    "./week.js",
    "./pwa.js",

    "./manifest.json",
    "./icon.svg",
    "./icon-192.png",
    "./icon-512.png",
    "./apple-touch-icon.png"
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
                "./icon-192.png",

            badge:
                notificationData.badge ||
                "./icon-192.png",

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