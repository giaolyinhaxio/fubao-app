const VOCABULARY_SESSION_SIZE_KEY =
    "fubao_vocabulary_session_size";


let vocabularySessionSize =
    laySoLuongTuMoiLuot();


document.addEventListener(
    "DOMContentLoaded",
    async function () {
        ganSuKienCaiDat();

        try {
            await Promise.all([
                taiThongKeTuVung(),
                taiThanhQuaHomNay()
            ]);
        } catch (error) {
            console.error(
                "Không thể tải trang từ vựng:",
                error
            );

            hienThiLoiThongKe();
        }
    }
);


/* =========================
   SỐ TỪ MỖI LƯỢT
========================= */

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

    return validValues.includes(savedValue)
        ? savedValue
        : 10;
}


/* =========================
   THỐNG KÊ TỪ VỰNG
========================= */

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
        Number(statistics.total_words) || 0;

    document.getElementById(
        "studiedVocabularyCount"
    ).textContent =
        Number(statistics.studied_words) || 0;

    document.getElementById(
        "dueVocabularyCount"
    ).textContent =
        Number(statistics.due_words) || 0;
}


/* =========================
   THÀNH QUẢ HÔM NAY
========================= */

async function taiThanhQuaHomNay() {
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

    document.getElementById(
        "todayVocabularyCount"
    ).textContent =
        reviewedToday;

    const message =
        document.getElementById(
            "todayVocabularyMessage"
        );

    if (reviewedToday === 0) {
        message.textContent =
            "Hôm nay bạn chưa bắt đầu học.";
    } else if (reviewedToday < 10) {
        message.textContent =
            "Bạn đã bắt đầu buổi học hôm nay.";
    } else if (reviewedToday < 20) {
        message.textContent =
            "Một buổi học khá hiệu quả!";
    } else {
        message.textContent =
            "Thành quả hôm nay rất tốt!";
    }
}


/* =========================
   CÀI ĐẶT
========================= */

function ganSuKienCaiDat() {
    const sessionSizeSelect =
        document.getElementById(
            "sessionSizeSelect"
        );

    if (!sessionSizeSelect) {
        return;
    }

    sessionSizeSelect.value =
        String(vocabularySessionSize);

    sessionSizeSelect.addEventListener(
        "change",
        function () {
            vocabularySessionSize =
                Number(
                    sessionSizeSelect.value
                );

            localStorage.setItem(
                VOCABULARY_SESSION_SIZE_KEY,
                String(vocabularySessionSize)
            );
        }
    );
}


/* =========================
   HIỂN THỊ LỖI
========================= */

function hienThiLoiThongKe() {
    const elementIds = [
        "totalVocabularyCount",
        "studiedVocabularyCount",
        "dueVocabularyCount",
        "todayVocabularyCount"
    ];

    elementIds.forEach(
        function (elementId) {
            const element =
                document.getElementById(
                    elementId
                );

            if (element) {
                element.textContent = "--";
            }
        }
    );

    const message =
        document.getElementById(
            "todayVocabularyMessage"
        );

    if (message) {
        message.textContent =
            "Chưa tải được kết quả hôm nay.";
    }
}