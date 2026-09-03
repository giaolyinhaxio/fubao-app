const CACHE_NAME = "fubao-v10";

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