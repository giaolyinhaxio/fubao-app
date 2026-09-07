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
        const {
            data,
            error
        } = await supabaseClient
            .from("english_readings")
            .select(`
                id,
                title,
                english_content,
                vietnamese_translation
            `)
            .eq("id", readingId)
            .single();


        if (error) {
            throw error;
        }


        currentReading = data;

        hienThiBaiDoc();

    } catch (error) {
        console.error(
            "Không thể tải bài đọc:",
            error
        );

        hienThiLoi(
            `Không thể tải bài đọc: ${
                error.message
            }`
        );
    }
}


/* =========================
   HIỂN THỊ BÀI ĐỌC
========================= */

function hienThiBaiDoc() {
    document
        .getElementById("readingLoading")
        .classList
        .add("hidden");


    document
        .getElementById("readingWorkspace")
        .classList
        .remove("hidden");


    document
        .getElementById("readingTitle")
        .textContent =
            currentReading.title;


    document.title =
        `${currentReading.title} | FuBao`;


    hienThiNoiDungTiengAnh(
        currentReading.english_content
    );


    hienThiBanDichTiengViet(
        currentReading.vietnamese_translation
    );


    capNhatTienDo(0);

    capNhatNutDieuKhien();
}


function hienThiNoiDungTiengAnh(content) {
    const container =
        document.getElementById(
            "readingEnglishContent"
        );


    container.replaceChildren();

    readingSentences = [];


    const paragraphs =
        tachThanhDoanVan(content);


    paragraphs.forEach(
        function (paragraphText) {
            const paragraph =
                document.createElement("p");


            const sentences =
                tachThanhCau(paragraphText);


            sentences.forEach(
                function (sentenceText) {
                    const sentenceIndex =
                        readingSentences.length;


                    readingSentences.push(
                        sentenceText
                    );


                    const sentenceElement =
                        document.createElement(
                            "span"
                        );


                    sentenceElement.className =
                        "reading-sentence";


                    sentenceElement.dataset.index =
                        sentenceIndex;


                    sentenceElement.textContent =
                        sentenceText + " ";


                    sentenceElement.addEventListener(
                        "click",
                        function () {
                            docTuCau(
                                sentenceIndex
                            );
                        }
                    );


                    paragraph.appendChild(
                        sentenceElement
                    );
                }
            );


            container.appendChild(
                paragraph
            );
        }
    );
}


function hienThiBanDichTiengViet(content) {
    const container =
        document.getElementById(
            "readingVietnameseContent"
        );


    container.replaceChildren();


    const paragraphs =
        tachThanhDoanVan(content);


    if (paragraphs.length === 0) {
        const emptyMessage =
            document.createElement("p");

        emptyMessage.className =
            "reading-translation-empty";

        emptyMessage.textContent =
            "Bài đọc này chưa có bản dịch tiếng Việt.";

        container.appendChild(
            emptyMessage
        );

        return;
    }


    paragraphs.forEach(
        function (paragraphText) {
            const paragraph =
                document.createElement("p");

            paragraph.textContent =
                paragraphText;

            container.appendChild(
                paragraph
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
                `Đang đọc câu ${
                    currentSentenceIndex + 1
                }/${
                    readingSentences.length
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
            `.reading-sentence[data-index="${
                sentenceIndex
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
            "▶ Tiếp tục";
    } else if (
        currentSentenceIndex >=
            readingSentences.length &&
        readingSentences.length > 0
    ) {
        playButton.textContent =
            "↻ Đọc lại";
    } else {
        playButton.textContent =
            "🔊 Đọc";
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
            "readingVietnameseContent"
        );


    const button =
        document.getElementById(
            "toggleTranslationButton"
        );


    const willHide =
        !content.hidden;


    content.hidden =
        willHide;


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