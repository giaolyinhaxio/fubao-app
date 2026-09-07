let currentReading = null;

let readingSentences = [];

let currentSentenceIndex = 0;

let isReading = false;

let isPaused = false;

let speechRunId = 0;

let englishVoice = null;


document.addEventListener(
    "DOMContentLoaded",
    async function () {
        ganSuKienTrangDoc();

        taiDanhSachGiongDoc();

        await taiBaiDoc();
    }
);


window.addEventListener(
    "pagehide",
    dungDoc
);


/* =========================
   GẮN SỰ KIỆN
========================= */

function ganSuKienTrangDoc() {
    document
        .getElementById("readingPlayButton")
        .addEventListener(
            "click",
            batDauHoacTiepTucDoc
        );


    document
        .getElementById("readingPauseButton")
        .addEventListener(
            "click",
            tamDungDoc
        );


    document
        .getElementById("readingStopButton")
        .addEventListener(
            "click",
            dungDoc
        );


    document
        .getElementById("readFromBeginningButton")
        .addEventListener(
            "click",
            docTuDau
        );


    document
        .getElementById("toggleTranslationButton")
        .addEventListener(
            "click",
            batTatBanDich
        );


    document
        .getElementById("readingRateSelect")
        .addEventListener(
            "change",
            thayDoiTocDoDoc
        );


    if (
        "speechSynthesis" in window
    ) {
        window.speechSynthesis.addEventListener(
            "voiceschanged",
            taiDanhSachGiongDoc
        );
    }
}


/* =========================
   TẢI BÀI ĐỌC
========================= */

async function taiBaiDoc() {
    const readingId =
        new URLSearchParams(
            window.location.search
        ).get("id");

    if (!readingId) {
        hienThiLoi(
            "Không tìm thấy mã bài đọc."
        );

        return;
    }

    try {
        const [
            readingResult,
            sentenceResult
        ] = await Promise.all([
            supabaseClient
                .from(
                    "english_readings"
                )
                .select(`
                    id,
                    title,
                    english_content,
                    vietnamese_translation
                `)
                .eq(
                    "id",
                    readingId
                )
                .single(),

            supabaseClient
                .from(
                    "english_reading_sentences"
                )
                .select(`
                    sentence_order,
                    english,
                    vietnamese
                `)
                .eq(
                    "reading_id",
                    readingId
                )
                .order(
                    "sentence_order",
                    {
                        ascending: true
                    }
                )
        ]);

        if (readingResult.error) {
            throw readingResult.error;
        }

        if (sentenceResult.error) {
            throw sentenceResult.error;
        }

        const savedSentences =
            sentenceResult.data || [];

        currentReading = {
            ...readingResult.data,

            sentences:
                savedSentences.length
                    ? savedSentences
                    : taoDanhSachCauTuDuLieuCu(
                        readingResult.data
                    )
        };

        hienThiBaiDoc();

    } catch (error) {
        console.error(
            "Không thể tải bài đọc:",
            error
        );

        hienThiLoi(
            `Không thể tải bài đọc: ${error.message}`
        );
    }
}


/*
 * Dùng cho các bài cũ được tạo trước khi có chức năng CSV.
 * Sau khi upload CSV mới, app sẽ dùng dữ liệu trong bảng câu.
 */
function taoDanhSachCauTuDuLieuCu(
    reading
) {
    const englishSentences =
        tachThanhDoanVan(
            reading.english_content
        ).flatMap(
            function (paragraph) {
                return tachThanhCau(
                    paragraph
                );
            }
        );

    const vietnameseSentences =
        tachThanhDoanVan(
            reading.vietnamese_translation
        );

    return englishSentences.map(
        function (
            english,
            index
        ) {
            return {
                sentence_order:
                    index + 1,

                english,

                vietnamese:
                    vietnameseSentences[index] ||
                    ""
            };
        }
    );
}


/* =========================
   HIỂN THỊ BÀI ĐỌC
========================= */

function hienThiBaiDoc() {
    document
        .getElementById(
            "readingLoading"
        )
        .classList
        .add("hidden");

    document
        .getElementById(
            "readingWorkspace"
        )
        .classList
        .remove("hidden");

    document
        .getElementById(
            "readingTitle"
        )
        .textContent =
        currentReading.title;

    document.title =
        `${currentReading.title} | FuBao`;

    hienThiCacCapCau(
        currentReading.sentences || []
    );

    capNhatTienDo(0);

    capNhatNutDieuKhien();
}


function hienThiCacCapCau(sentences) {
    const container =
        document.getElementById(
            "readingEnglishContent"
        );

    container.replaceChildren();

    readingSentences = [];

    if (!sentences.length) {
        const emptyMessage =
            document.createElement("p");

        emptyMessage.className =
            "reading-translation-empty";

        emptyMessage.textContent =
            "Bài đọc này chưa có nội dung.";

        container.appendChild(
            emptyMessage
        );

        return;
    }

    sentences.forEach(
        function (sentence) {
            const english =
                String(
                    sentence.english || ""
                ).trim();

            const vietnamese =
                String(
                    sentence.vietnamese || ""
                ).trim();

            if (!english) {
                return;
            }

            const sentenceIndex =
                readingSentences.length;

            readingSentences.push(
                english
            );

            const pair =
                document.createElement(
                    "div"
                );

            pair.className =
                "reading-sentence-pair";

            pair.dataset.index =
                sentenceIndex;

            pair.tabIndex = 0;

            pair.setAttribute(
                "role",
                "button"
            );

            pair.setAttribute(
                "aria-label",
                `Đọc câu ${sentenceIndex + 1}`
            );

            const englishElement =
                document.createElement(
                    "p"
                );

            englishElement.className =
                "reading-sentence-english";

            englishElement.textContent =
                english;

            const vietnameseElement =
                document.createElement(
                    "p"
                );

            vietnameseElement.className =
                "reading-sentence-vietnamese";

            vietnameseElement.textContent =
                vietnamese ||
                "Chưa có bản dịch tiếng Việt.";

            pair.append(
                englishElement,
                vietnameseElement
            );

            pair.addEventListener(
                "click",
                function () {
                    docTuCau(
                        sentenceIndex
                    );
                }
            );

            pair.addEventListener(
                "keydown",
                function (event) {
                    if (
                        event.key === "Enter" ||
                        event.key === " "
                    ) {
                        event.preventDefault();

                        docTuCau(
                            sentenceIndex
                        );
                    }
                }
            );

            container.appendChild(
                pair
            );
        }
    );
}


/* =========================
   TÁCH ĐOẠN VÀ CÂU
========================= */

function tachThanhDoanVan(content) {
    return String(content || "")
        .split(/\r?\n+/)
        .map(
            function (paragraph) {
                return paragraph.trim();
            }
        )
        .filter(Boolean);
}


function tachThanhCau(paragraph) {
    if (
        "Segmenter" in Intl
    ) {
        const segmenter =
            new Intl.Segmenter(
                "en",
                {
                    granularity: "sentence"
                }
            );


        return Array
            .from(
                segmenter.segment(paragraph)
            )
            .map(
                function (item) {
                    return item.segment.trim();
                }
            )
            .filter(Boolean);
    }


    const sentences =
        paragraph.match(
            /[^.!?]+(?:[.!?]+|$)/g
        );


    return sentences
        ? sentences
            .map(
                function (sentence) {
                    return sentence.trim();
                }
            )
            .filter(Boolean)
        : [paragraph];
}


/* =========================
   GIỌNG ĐỌC
========================= */

function taiDanhSachGiongDoc() {
    if (
        !("speechSynthesis" in window)
    ) {
        return;
    }


    const voices =
        window.speechSynthesis
            .getVoices();


    const englishVoices =
        voices.filter(
            function (voice) {
                return voice.lang
                    .toLowerCase()
                    .startsWith("en");
            }
        );


    englishVoice =
        englishVoices.find(
            function (voice) {
                return (
                    voice.lang
                        .toLowerCase() ===
                    "en-us"
                );
            }
        ) ||
        englishVoices[0] ||
        null;
}


/* =========================
   ĐỌC NỘI DUNG
========================= */

function batDauHoacTiepTucDoc() {
    if (
        !("speechSynthesis" in window)
    ) {
        capNhatTrangThaiDoc(
            "Thiết bị này không hỗ trợ chức năng đọc."
        );

        return;
    }


    if (readingSentences.length === 0) {
        capNhatTrangThaiDoc(
            "Bài này chưa có nội dung tiếng Anh."
        );

        return;
    }


    if (isPaused) {
        window.speechSynthesis.resume();

        isPaused = false;

        capNhatTrangThaiDoc(
            "Đang tiếp tục đọc..."
        );

        capNhatNutDieuKhien();

        return;
    }


    if (
        currentSentenceIndex >=
        readingSentences.length
    ) {
        currentSentenceIndex = 0;
    }


    window.speechSynthesis.cancel();

    speechRunId += 1;

    isReading = true;

    isPaused = false;


    capNhatNutDieuKhien();

    docCauHienTai(speechRunId);
}


function docCauHienTai(runId) {
    if (
        runId !== speechRunId ||
        !isReading
    ) {
        return;
    }


    if (
        currentSentenceIndex >=
        readingSentences.length
    ) {
        ketThucBaiDoc();

        return;
    }


    const sentence =
        readingSentences[
        currentSentenceIndex
        ];


    const utterance =
        new SpeechSynthesisUtterance(
            sentence
        );


    utterance.lang = "en-US";

    utterance.rate =
        Number(
            document
                .getElementById(
                    "readingRateSelect"
                )
                .value
        ) || 1;


    utterance.pitch = 1;

    utterance.volume = 1;


    if (englishVoice) {
        utterance.voice =
            englishVoice;
    }


    utterance.onstart =
        function () {
            if (
                runId !== speechRunId
            ) {
                return;
            }


            toSangCau(
                currentSentenceIndex
            );


            capNhatTienDo(
                currentSentenceIndex + 1
            );


            capNhatTrangThaiDoc(
                `Đang đọc câu ${currentSentenceIndex + 1
                }/${readingSentences.length
                }`
            );
        };


    utterance.onend =
        function () {
            if (
                runId !== speechRunId ||
                !isReading
            ) {
                return;
            }


            currentSentenceIndex += 1;

            docCauHienTai(runId);
        };


    utterance.onerror =
        function (event) {
            if (
                runId !== speechRunId ||
                event.error === "canceled" ||
                event.error === "interrupted"
            ) {
                return;
            }


            console.error(
                "Lỗi giọng đọc:",
                event.error
            );


            isReading = false;

            isPaused = false;


            capNhatTrangThaiDoc(
                "Không thể phát giọng đọc."
            );


            capNhatNutDieuKhien();
        };


    window.speechSynthesis.speak(
        utterance
    );
}


/* =========================
   TẠM DỪNG VÀ DỪNG
========================= */

function tamDungDoc() {
    if (
        !isReading ||
        isPaused
    ) {
        return;
    }


    window.speechSynthesis.pause();

    isPaused = true;


    capNhatTrangThaiDoc(
        "Đã tạm dừng"
    );


    capNhatNutDieuKhien();
}


function dungDoc() {
    if (
        "speechSynthesis" in window
    ) {
        window.speechSynthesis.cancel();
    }


    speechRunId += 1;

    isReading = false;

    isPaused = false;

    currentSentenceIndex = 0;


    xoaToSangCau();

    capNhatTienDo(0);

    capNhatTrangThaiDoc(
        "Đã dừng"
    );

    capNhatNutDieuKhien();
}


function docTuDau() {
    dungDoc();


    window.setTimeout(
        function () {
            batDauHoacTiepTucDoc();
        },
        100
    );
}


function docTuCau(sentenceIndex) {
    if (
        sentenceIndex < 0 ||
        sentenceIndex >=
        readingSentences.length
    ) {
        return;
    }


    if (
        "speechSynthesis" in window
    ) {
        window.speechSynthesis.cancel();
    }


    speechRunId += 1;

    isReading = false;

    isPaused = false;

    currentSentenceIndex =
        sentenceIndex;


    window.setTimeout(
        function () {
            batDauHoacTiepTucDoc();
        },
        100
    );
}


/* =========================
   THAY ĐỔI TỐC ĐỘ
========================= */

function thayDoiTocDoDoc() {
    if (
        !isReading &&
        !isPaused
    ) {
        return;
    }


    const restartIndex =
        currentSentenceIndex;


    window.speechSynthesis.cancel();

    speechRunId += 1;

    isReading = false;

    isPaused = false;

    currentSentenceIndex =
        restartIndex;


    window.setTimeout(
        function () {
            batDauHoacTiepTucDoc();
        },
        100
    );
}


/* =========================
   KẾT THÚC
========================= */

function ketThucBaiDoc() {
    isReading = false;

    isPaused = false;

    currentSentenceIndex =
        readingSentences.length;


    xoaToSangCau();

    capNhatTienDo(
        readingSentences.length
    );


    capNhatTrangThaiDoc(
        "Đã đọc xong bài"
    );


    capNhatNutDieuKhien();
}


/* =========================
   TÔ SÁNG VÀ TIẾN ĐỘ
========================= */

function toSangCau(sentenceIndex) {
    xoaToSangCau();


    const sentenceElement =
        document.querySelector(
            `.reading-sentence-pair[data-index="${sentenceIndex
            }"]`
        );


    if (!sentenceElement) {
        return;
    }


    sentenceElement.classList.add(
        "active-reading-sentence"
    );


    const position =
        sentenceElement
            .getBoundingClientRect();


    if (
        position.top < 100 ||
        position.bottom >
        window.innerHeight - 80
    ) {
        sentenceElement.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}


function xoaToSangCau() {
    document
        .querySelectorAll(
            ".active-reading-sentence"
        )
        .forEach(
            function (element) {
                element.classList.remove(
                    "active-reading-sentence"
                );
            }
        );
}


function capNhatTienDo(completedCount) {
    const total =
        readingSentences.length;


    const safeCompleted =
        Math.min(
            Math.max(
                completedCount,
                0
            ),
            total
        );


    const percentage =
        total > 0
            ? (
                safeCompleted / total
            ) * 100
            : 0;


    document
        .getElementById(
            "readingProgressFill"
        )
        .style
        .width =
        `${percentage}%`;


    document
        .getElementById(
            "readingProgressText"
        )
        .textContent =
        `${safeCompleted}/${total} câu`;
}


/* =========================
   NÚT ĐIỀU KHIỂN
========================= */

function capNhatNutDieuKhien() {
    const playButton =
        document.getElementById(
            "readingPlayButton"
        );


    const pauseButton =
        document.getElementById(
            "readingPauseButton"
        );


    const stopButton =
        document.getElementById(
            "readingStopButton"
        );


    if (isPaused) {
        playButton.textContent =
            "▶";

        playButton.setAttribute(
            "aria-label",
            "Tiếp tục đọc"
        );

        playButton.title =
            "Tiếp tục đọc";

    } else if (
        currentSentenceIndex >=
        readingSentences.length &&
        readingSentences.length > 0
    ) {
        playButton.textContent =
            "↻";

        playButton.setAttribute(
            "aria-label",
            "Đọc lại"
        );

        playButton.title =
            "Đọc lại";

    } else {
        playButton.textContent =
            "🔊";

        playButton.setAttribute(
            "aria-label",
            "Đọc bài"
        );

        playButton.title =
            "Đọc bài";
    }


    playButton.disabled =
        readingSentences.length === 0;


    pauseButton.disabled =
        !isReading ||
        isPaused;


    stopButton.disabled =
        !isReading &&
        !isPaused &&
        currentSentenceIndex === 0;
}


function capNhatTrangThaiDoc(message) {
    document
        .getElementById(
            "readingSpeechStatus"
        )
        .textContent = message;
}


/* =========================
   BẬT TẮT BẢN DỊCH
========================= */

function batTatBanDich() {
    const content =
        document.getElementById(
            "readingEnglishContent"
        );

    const button =
        document.getElementById(
            "toggleTranslationButton"
        );

    const willHide =
        !content.classList.contains(
            "hide-reading-translation"
        );

    content.classList.toggle(
        "hide-reading-translation",
        willHide
    );

    button.textContent =
        willHide
            ? "Hiện bản dịch"
            : "Ẩn bản dịch";

    button.setAttribute(
        "aria-expanded",
        String(!willHide)
    );
}


/* =========================
   HIỂN THỊ LỖI
========================= */

function hienThiLoi(message) {
    document
        .getElementById("readingLoading")
        .classList
        .add("hidden");


    const errorElement =
        document.getElementById(
            "readingError"
        );


    errorElement.textContent =
        message;


    errorElement.classList.remove(
        "hidden"
    );
}