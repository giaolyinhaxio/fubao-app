const VOCABULARY_MODE_KEY =
    "fubao_vocabulary_mode";

const VOCABULARY_SESSION_SIZE_KEY =
    "fubao_vocabulary_session_size";

const VOCABULARY_DAILY_GOAL_KEY =
    "fubao_vocabulary_daily_goal";


let vocabularySessionSize =
    laySoLuongTuMoiLuot();


function laySoLuongTuMoiLuot() {
    const savedValue =
        Number(
            localStorage.getItem(
                VOCABULARY_SESSION_SIZE_KEY
            )
        );

    const validValues = [
        5,
        10,
        20
    ];

    return validValues.includes(
        savedValue
    )
        ? savedValue
        : 10;
}

function layMucTieuMoiNgay() {
    const savedValue =
        Number(
            localStorage.getItem(
                VOCABULARY_DAILY_GOAL_KEY
            )
        );

    const validValues = [
        5,
        10,
        20
    ];

    return validValues.includes(
        savedValue
    )
        ? savedValue
        : 10;
}


let vocabularyDailyGoal =
    layMucTieuMoiNgay();

function layCheDoHocDaLuu() {
    const savedMode =
        localStorage.getItem(
            VOCABULARY_MODE_KEY
        );

    return savedMode === "review"
        ? "review"
        : "new";
}


let vocabularyMode =
    layCheDoHocDaLuu();

let vocabularyList = [];

let currentVocabularyIndex = 0;

let isFlashcardFlipped = false;

let repeatedVocabularyIds =
    new Set();

let sessionResults = {
    again: 0,
    learning: 0,
    known: 0
};


document.addEventListener(
    "DOMContentLoaded",
    async function () {
        try {
            await Promise.all([
                taiDanhSachTuVung(),
                taiThongKeTuVung(),
                taiTienDoHomNay()
            ]);

            ganSuKienFlashcard();

            if (vocabularyList.length === 0) {
                hienThiKhongCoTuCanHoc();

                return;
            }

            hienThiFlashcard();
        } catch (error) {
            hienThiLoiTaiDuLieu(error);
        }
    }
);


/* =========================
   ĐỌC TỪ VỰNG TỪ SUPABASE
========================= */

async function taiDanhSachTuVung() {
    const {
        data,
        error
    } = await supabaseClient.rpc(
        "get_vocabulary_session_by_mode",
        {
            p_limit:
                vocabularySessionSize,

            p_mode:
                vocabularyMode
        }
    );

    if (error) {
        throw error;
    }

    vocabularyList = data || [];

    currentVocabularyIndex = 0;

    isFlashcardFlipped = false;

    repeatedVocabularyIds =
        new Set();
}

async function taiThongKeTuVung() {
    const {
        data,
        error
    } = await supabaseClient.rpc(
        "get_vocabulary_stats"
    );


    if (error) {
        throw error;
    }


    const statistics =
        data && data.length > 0
            ? data[0]
            : {
                total_words: 0,
                studied_words: 0,
                due_words: 0
            };


    document.getElementById(
        "totalVocabularyCount"
    ).textContent =
        statistics.total_words;


    document.getElementById(
        "studiedVocabularyCount"
    ).textContent =
        statistics.studied_words;


    document.getElementById(
        "dueVocabularyCount"
    ).textContent =
        statistics.due_words;
}

async function taiTienDoHomNay() {
    const {
        data,
        error
    } = await supabaseClient.rpc(
        "get_vocabulary_daily_stats"
    );


    if (error) {
        throw error;
    }


    const reviewedToday =
        data && data.length > 0
            ? Number(
                data[0].reviewed_today
            ) || 0
            : 0;


    const percentage =
        Math.min(
            Math.round(
                reviewedToday /
                vocabularyDailyGoal *
                100
            ),
            100
        );


    document.getElementById(
        "dailyReviewedCount"
    ).textContent =
        reviewedToday;


    document.getElementById(
        "dailyGoalValue"
    ).textContent =
        vocabularyDailyGoal;


    document.getElementById(
        "dailyGoalProgress"
    ).style.width =
        `${percentage}%`;


    const message =
        document.getElementById(
            "dailyGoalMessage"
        );


    if (
        reviewedToday >=
        vocabularyDailyGoal
    ) {
        message.textContent =
            "✓ Đã hoàn thành mục tiêu hôm nay!";

        message.classList.add(
            "is-completed"
        );
    } else {
        const remaining =
            vocabularyDailyGoal -
            reviewedToday;

        message.textContent =
            `Còn ${remaining} từ để hoàn thành mục tiêu.`;

        message.classList.remove(
            "is-completed"
        );
    }
}


/* =========================
   GẮN SỰ KIỆN
========================= */

function ganSuKienFlashcard() {
    const flashcard =
        document.getElementById(
            "flashcard"
        );

    const speakButton =
        document.getElementById(
            "speakWordButton"
        );

    const answerButtons =
        document.querySelectorAll(
            ".answer-button"
        );

    const restartButton =
        document.getElementById(
            "restartVocabularyButton"
        );

    const modeButtons =
        document.querySelectorAll(
            ".vocabulary-mode-button"
        );

    const sessionSizeSelect =
        document.getElementById(
            "sessionSizeSelect"
        );

    const dailyGoalSelect =
        document.getElementById(
            "dailyGoalSelect"
        );


    flashcard.addEventListener(
        "click",
        latFlashcard
    );


    flashcard.addEventListener(
        "keydown",
        function (event) {
            if (
                event.key === "Enter" ||
                event.key === " "
            ) {
                event.preventDefault();

                latFlashcard();
            }
        }
    );


    speakButton.addEventListener(
        "click",
        function (event) {
            event.stopPropagation();

            phatAmTuHienTai();
        }
    );


    answerButtons.forEach(
        function (button) {
            button.addEventListener(
                "click",
                function () {
                    chuyenSangTuTiepTheo(
                        button.dataset.result
                    );
                }
            );
        }
    );


    restartButton.addEventListener(
        "click",
        batDauLai
    );

    if (sessionSizeSelect) {
        sessionSizeSelect.value =
            String(
                vocabularySessionSize
            );

        sessionSizeSelect.addEventListener(
            "change",
            function () {
                const selectedValue =
                    Number(
                        sessionSizeSelect.value
                    );

                localStorage.setItem(
                    VOCABULARY_SESSION_SIZE_KEY,
                    String(selectedValue)
                );

                window.location.reload();
            }
        );
    }

    modeButtons.forEach(
        function (button) {
            const buttonMode =
                button.dataset.mode;

            const isActive =
                buttonMode ===
                vocabularyMode;


            button.classList.toggle(
                "is-active",
                isActive
            );

            button.setAttribute(
                "aria-pressed",
                String(isActive)
            );


            button.addEventListener(
                "click",
                function () {
                    if (
                        buttonMode ===
                        vocabularyMode
                    ) {
                        return;
                    }


                    localStorage.setItem(
                        VOCABULARY_MODE_KEY,
                        buttonMode
                    );


                    window.location.reload();
                }
            );
        }
    );

    if (dailyGoalSelect) {
        dailyGoalSelect.value =
            String(
                vocabularyDailyGoal
            );

        dailyGoalSelect.addEventListener(
            "change",
            function () {
                const selectedGoal =
                    Number(
                        dailyGoalSelect.value
                    );

                localStorage.setItem(
                    VOCABULARY_DAILY_GOAL_KEY,
                    String(selectedGoal)
                );

                window.location.reload();
            }
        );
    }
}


/* =========================
   HIỂN THỊ FLASHCARD
========================= */

function hienThiFlashcard() {
    const vocabulary =
        vocabularyList[
        currentVocabularyIndex
        ];

    document.getElementById(
        "englishWord"
    ).textContent =
        vocabulary.english;


    document.getElementById(
        "ipaText"
    ).textContent =
        vocabulary.ipa ||
        "Chưa có phiên âm";


    document.getElementById(
        "vietnameseMeaning"
    ).textContent =
        vocabulary.vietnamese ||
        "Chưa có nghĩa tiếng Việt";


    document.getElementById(
        "japaneseMeaning"
    ).textContent =
        vocabulary.japanese ||
        "日本語の意味はまだありません";


    const currentNumber =
        currentVocabularyIndex + 1;

    const totalNumber =
        vocabularyList.length;


    document.getElementById(
        "cardCounter"
    ).textContent =
        `${currentNumber} / ${totalNumber}`;


    const progressPercent =
        (
            currentNumber /
            totalNumber
        ) * 100;


    document.getElementById(
        "progressValue"
    ).style.width =
        `${progressPercent}%`;


    datFlashcardVeMatTruoc();
}


/* =========================
   LẬT FLASHCARD
========================= */

function latFlashcard() {
    const flashcard =
        document.getElementById(
            "flashcard"
        );

    const answerActions =
        document.getElementById(
            "answerActions"
        );


    isFlashcardFlipped =
        !isFlashcardFlipped;


    flashcard.classList.toggle(
        "is-flipped",
        isFlashcardFlipped
    );


    answerActions.hidden =
        !isFlashcardFlipped;
}


function datFlashcardVeMatTruoc() {
    const flashcard =
        document.getElementById(
            "flashcard"
        );

    const answerActions =
        document.getElementById(
            "answerActions"
        );


    isFlashcardFlipped = false;


    flashcard.classList.remove(
        "is-flipped"
    );


    answerActions.hidden = true;
}


/* =========================
   PHÁT ÂM
========================= */

function phatAmTuHienTai() {
    if (
        !(
            "speechSynthesis"
            in window
        )
    ) {
        alert(
            "Thiết bị này chưa hỗ trợ phát âm."
        );

        return;
    }


    const vocabulary =
        vocabularyList[
        currentVocabularyIndex
        ];


    window.speechSynthesis.cancel();


    const utterance =
        new SpeechSynthesisUtterance(
            vocabulary.english
        );


    utterance.lang = "en-US";

    utterance.rate = 0.8;

    utterance.pitch = 1;

    utterance.volume = 1;


    window.speechSynthesis.speak(
        utterance
    );
}


/* =========================
   CHUYỂN SANG TỪ TIẾP THEO
========================= */

async function chuyenSangTuTiepTheo(
    result
) {
    datTrangThaiDangLuu(true);

    try {
        const vocabulary =
            vocabularyList[
            currentVocabularyIndex
            ];

        await luuTienDoTuVung(
            vocabulary,
            result
        );

        if (
            Object.prototype.hasOwnProperty.call(
                sessionResults,
                result
            )
        ) {
            sessionResults[result] += 1;
        }


        /* Đưa từ chưa nhớ xuống cuối lượt */

        if (
            result === "again" &&
            !repeatedVocabularyIds.has(
                vocabulary.id
            )
        ) {
            repeatedVocabularyIds.add(
                vocabulary.id
            );

            vocabularyList.push(
                vocabulary
            );
        }


        currentVocabularyIndex += 1;

        if (
            currentVocabularyIndex >=
            vocabularyList.length
        ) {
            hienThiHoanThanh();

            return;
        }

        hienThiFlashcard();
    } catch (error) {
        console.error(
            "Không thể lưu tiến độ:",
            error
        );

        alert(
            "Không thể lưu tiến độ. Hãy kiểm tra mạng rồi thử lại."
        );
    } finally {
        datTrangThaiDangLuu(false);
    }
}

/* =========================
   LƯU TIẾN ĐỘ HỌC
========================= */

async function luuTienDoTuVung(
    vocabulary,
    result
) {
    const {
        data: userData,
        error: userError
    } = await supabaseClient.auth.getUser();

    if (
        userError ||
        !userData.user
    ) {
        throw new Error(
            "Không xác định được tài khoản."
        );
    }


    const currentProgress =
        await layTienDoTuHienTai(
            vocabulary.id
        );


    const currentLevel =
        currentProgress
            ? currentProgress.review_level
            : 0;


    const reviewSchedule =
        tinhLichOnTiepTheo(
            result,
            currentLevel
        );


    const reviewedAt =
        new Date().toISOString();


    const {
        error
    } = await supabaseClient
        .from("vocabulary_progress")
        .upsert(
            {
                user_id:
                    userData.user.id,

                vocabulary_id:
                    vocabulary.id,

                status:
                    result,

                review_level:
                    reviewSchedule.level,

                last_reviewed_at:
                    reviewedAt,

                next_review_at:
                    reviewSchedule
                        .nextReviewAt,

                updated_at:
                    reviewedAt
            },
            {
                onConflict:
                    "user_id,vocabulary_id"
            }
        );


    if (error) {
        throw error;
    }
}


/* Đọc tiến độ cũ của từ */

async function layTienDoTuHienTai(
    vocabularyId
) {
    const {
        data,
        error
    } = await supabaseClient
        .from("vocabulary_progress")
        .select(`
            status,
            review_level,
            last_reviewed_at,
            next_review_at
        `)
        .eq(
            "vocabulary_id",
            vocabularyId
        )
        .maybeSingle();


    if (error) {
        throw error;
    }


    return data;
}


/* Tính ngày cần ôn lại */

function tinhLichOnTiepTheo(
    result,
    currentLevel
) {
    const nextReview =
        new Date();

    let level =
        Number(currentLevel) || 0;


    /* Chưa nhớ: ôn lại sau 10 phút */

    if (result === "again") {
        level = 0;

        nextReview.setMinutes(
            nextReview.getMinutes() + 10
        );
    }


    /* Hơi nhớ: ôn lại sau 1 ngày */

    if (result === "learning") {
        level = Math.min(
            level + 1,
            5
        );

        nextReview.setDate(
            nextReview.getDate() + 1
        );
    }


    /* Đã nhớ: giãn dần ngày ôn */

    if (result === "known") {
        level = Math.min(
            level + 1,
            5
        );

        const reviewDays = [
            1,
            3,
            7,
            14,
            30
        ];

        const days =
            reviewDays[level - 1];

        nextReview.setDate(
            nextReview.getDate() +
            days
        );
    }


    return {
        level: level,
        nextReviewAt:
            nextReview.toISOString()
    };
}


/* Khóa nút trong lúc lưu */

function datTrangThaiDangLuu(
    isSaving
) {
    const buttons =
        document.querySelectorAll(
            ".answer-button"
        );

    buttons.forEach(
        function (button) {
            button.disabled =
                isSaving;
        }
    );
}


/* =========================
   HOÀN THÀNH
========================= */

function hienThiHoanThanh() {

    document.getElementById(
        "restartVocabularyButton"
    ).hidden = false;

    document.getElementById(
        "vocabularyStudyArea"
    ).hidden = true;


    document.getElementById(
        "vocabularyFinished"
    ).hidden = false;


    document.getElementById(
        "againResultCount"
    ).textContent =
        sessionResults.again;


    document.getElementById(
        "learningResultCount"
    ).textContent =
        sessionResults.learning;


    document.getElementById(
        "knownResultCount"
    ).textContent =
        sessionResults.known;

    taiThongKeTuVung().catch(
        function (error) {
            console.error(
                "Không thể cập nhật thống kê:",
                error
            );
        }
    );
}

function hienThiKhongCoTuCanHoc() {
    const finishedSection =
        document.getElementById(
            "vocabularyFinished"
        );

    const finishedTitle =
        finishedSection.querySelector(
            "h2"
        );

    const finishedText =
        finishedSection.querySelector(
            ":scope > p"
        );

    const restartButton =
        document.getElementById(
            "restartVocabularyButton"
        );


    document.getElementById(
        "vocabularyStudyArea"
    ).hidden = true;


    finishedSection.hidden = false;

    restartButton.hidden = true;


    if (vocabularyMode === "review") {
        finishedTitle.textContent =
            "Chưa có từ cần ôn";

        finishedText.textContent =
            "Những từ đến hạn ôn sẽ xuất hiện tại đây.";
    } else {
        finishedTitle.textContent =
            "Đã học hết từ mới!";

        finishedText.textContent =
            "Hiện tại không còn từ mới trong kho.";
    }
}


async function batDauLai() {
    const restartButton =
        document.getElementById(
            "restartVocabularyButton"
        );

    restartButton.disabled = true;

    restartButton.textContent =
        "Đang tải...";


    try {
        sessionResults = {
            again: 0,
            learning: 0,
            known: 0
        };


        await taiDanhSachTuVung();


        if (
            vocabularyList.length === 0
        ) {
            hienThiKhongCoTuCanHoc();

            return;
        }


        document.getElementById(
            "vocabularyFinished"
        ).hidden = true;


        document.getElementById(
            "vocabularyStudyArea"
        ).hidden = false;


        hienThiFlashcard();
    } catch (error) {
        console.error(
            "Không thể tải lượt học mới:",
            error
        );

        alert(
            "Không thể tải lượt học mới. Hãy kiểm tra mạng rồi thử lại."
        );
    } finally {
        restartButton.disabled = false;

        restartButton.textContent =
            "Học lượt tiếp theo";
    }
}


/* =========================
   LỖI TẢI DỮ LIỆU
========================= */

function hienThiLoiTaiDuLieu(
    error
) {
    console.error(
        "Không thể tải từ vựng:",
        error
    );


    document.getElementById(
        "vocabularyStudyArea"
    ).innerHTML = `
        <section class="vocabulary-preparing">
            <span>!</span>

            <h2>Không thể tải từ vựng</h2>

            <p>
                Hãy kiểm tra kết nối mạng,
                quyền Supabase và thử lại.
            </p>
        </section>
    `;
}