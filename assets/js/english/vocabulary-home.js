const VOCABULARY_SESSION_SIZE_KEY =
    "fubao_vocabulary_session_size";


const vocabularyTopicId =
    new URLSearchParams(
        window.location.search
    ).get("topic");


let vocabularySessionSize =
    laySoLuongTuMoiLuot();


let vocabularyCsvRows = [];


document.addEventListener(
    "DOMContentLoaded",
    async function () {
        if (!vocabularyTopicId) {
            window.location.replace(
                "vocabulary-topics.html"
            );

            return;
        }


        ganSuKienCaiDat();

        ganSuKienImportCsv();

        capNhatLienKetTheoChuDe();


        try {
            await taiThongTinChuDe();

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
   THÔNG TIN CHỦ ĐỀ
========================= */

async function taiThongTinChuDe() {
    const {
        data,
        error
    } = await supabaseClient
        .from(
            "english_vocabulary_topics"
        )
        .select(`
            id,
            name,
            description,
            emoji
        `)
        .eq(
            "id",
            vocabularyTopicId
        )
        .maybeSingle();


    if (error) {
        throw error;
    }


    if (!data) {
        throw new Error(
            "Không tìm thấy chủ đề từ vựng."
        );
    }


    const topicName =
        document.getElementById(
            "vocabularyTopicName"
        );


    const topicDescription =
        document.getElementById(
            "vocabularyTopicDescription"
        );


    topicName.textContent =
        `${data.emoji || "📚"} ${data.name}`;


    topicDescription.textContent =
        data.description ||
        "Chọn nội dung bạn muốn học";


    document.title =
        `${data.name} | FuBao`;
}


/* =========================
   CẬP NHẬT ĐƯỜNG DẪN
========================= */

function capNhatLienKetTheoChuDe() {
    const encodedTopicId =
        encodeURIComponent(
            vocabularyTopicId
        );


    datDuongDan(
        "allVocabularyLink",
        `vocabulary-list.html?status=all&topic=${encodedTopicId}`
    );


    datDuongDan(
        "knownVocabularyLink",
        `vocabulary-list.html?status=known&topic=${encodedTopicId}`
    );


    datDuongDan(
        "reviewVocabularyListLink",
        `vocabulary-list.html?status=review&topic=${encodedTopicId}`
    );


    datDuongDan(
        "newVocabularyModeLink",
        `flashcard.html?mode=new&topic=${encodedTopicId}`
    );


    datDuongDan(
        "reviewVocabularyModeLink",
        `flashcard.html?mode=review&topic=${encodedTopicId}`
    );
}


function datDuongDan(
    elementId,
    url
) {
    const element =
        document.getElementById(
            elementId
        );


    if (element) {
        element.href = url;
    }
}


/* =========================
   IMPORT CSV
========================= */

function ganSuKienImportCsv() {
    const openButton =
        document.getElementById(
            "openVocabularyCsvButton"
        );

    const closeButton =
        document.getElementById(
            "closeVocabularyCsvButton"
        );

    const cancelButton =
        document.getElementById(
            "cancelVocabularyCsvButton"
        );

    const fileInput =
        document.getElementById(
            "vocabularyCsvInput"
        );

    const form =
        document.getElementById(
            "vocabularyCsvForm"
        );

    const modal =
        document.getElementById(
            "vocabularyCsvModal"
        );

    if (
        !openButton ||
        !closeButton ||
        !cancelButton ||
        !fileInput ||
        !form ||
        !modal
    ) {
        return;
    }

    openButton.addEventListener(
        "click",
        moFormImportCsv
    );

    closeButton.addEventListener(
        "click",
        dongFormImportCsv
    );

    cancelButton.addEventListener(
        "click",
        dongFormImportCsv
    );

    fileInput.addEventListener(
        "change",
        xuLyChonFileCsv
    );

    form.addEventListener(
        "submit",
        xuLyImportCsv
    );

    modal.addEventListener(
        "click",
        function (event) {
            if (event.target === modal) {
                dongFormImportCsv();
            }
        }
    );
}

function moFormImportCsv() {
    vocabularyCsvRows = [];

    document.getElementById(
        "vocabularyCsvForm"
    ).reset();

    document.getElementById(
        "vocabularyCsvSelected"
    ).textContent =
        "Chưa chọn file.";

    datThongBaoCsv("");

    const modal =
        document.getElementById(
            "vocabularyCsvModal"
        );

    modal.hidden = false;
    modal.classList.remove("hidden");

    document.body.classList.add(
        "modal-open"
    );
}

function dongFormImportCsv() {
    const modal =
        document.getElementById(
            "vocabularyCsvModal"
        );

    if (!modal) {
        return;
    }

    modal.hidden = true;
    modal.classList.add("hidden");

    document.body.classList.remove(
        "modal-open"
    );

    vocabularyCsvRows = [];
}

async function xuLyChonFileCsv(event) {
    const file =
        event.target.files?.[0];

    vocabularyCsvRows = [];

    datThongBaoCsv("");

    if (!file) {
        document.getElementById(
            "vocabularyCsvSelected"
        ).textContent =
            "Chưa chọn file.";

        return;
    }

    if (
        !file.name
            .toLowerCase()
            .endsWith(".csv")
    ) {
        datThongBaoCsv(
            "Vui lòng chọn đúng file CSV.",
            true
        );

        event.target.value = "";

        return;
    }

    try {
        const csvText =
            await file.text();

        if (csvText.includes("�")) {
            throw new Error(
                "File bị lỗi font. Hãy lưu CSV ở định dạng UTF-8."
            );
        }

        vocabularyCsvRows =
            docDuLieuTuCsv(csvText);

        document.getElementById(
            "vocabularyCsvSelected"
        ).textContent =
            `Đã đọc ${vocabularyCsvRows.length} từ từ file ${file.name}.`;

        datThongBaoCsv(
            "File hợp lệ và sẵn sàng thêm."
        );
    } catch (error) {
        console.error(
            "Không thể đọc CSV:",
            error
        );

        vocabularyCsvRows = [];

        datThongBaoCsv(
            error.message ||
            "Không thể đọc file CSV.",
            true
        );
    }
}

function docDuLieuTuCsv(csvText) {
    const table =
        tachBangCsv(csvText);

    if (table.length < 2) {
        throw new Error(
            "CSV chưa có dữ liệu từ vựng."
        );
    }

    const headers =
        table[0].map(
            function (header) {
                return String(header)
                    .replace(/^\uFEFF/, "")
                    .trim()
                    .toLowerCase();
            }
        );

    const requiredHeaders = [
        "english",
        "ipa",
        "vietnamese",
        "japanese"
    ];

    const missingHeaders =
        requiredHeaders.filter(
            function (header) {
                return !headers.includes(
                    header
                );
            }
        );

    if (missingHeaders.length > 0) {
        throw new Error(
            `CSV thiếu cột: ${missingHeaders.join(", ")}.`
        );
    }

    const indexes = {};

    requiredHeaders.forEach(
        function (header) {
            indexes[header] =
                headers.indexOf(header);
        }
    );

    const wordsInFile = new Set();
    const result = [];

    table.slice(1).forEach(
        function (row) {
            const english =
                String(
                    row[indexes.english] ?? ""
                ).trim();

            if (!english) {
                return;
            }

            const duplicateKey =
                english.toLocaleLowerCase(
                    "en"
                );

            if (
                wordsInFile.has(
                    duplicateKey
                )
            ) {
                return;
            }

            wordsInFile.add(
                duplicateKey
            );

            result.push({
                topic_id:
                    vocabularyTopicId,

                english,

                ipa: String(
                    row[indexes.ipa] ?? ""
                ).trim(),

                vietnamese: String(
                    row[indexes.vietnamese] ??
                    ""
                ).trim(),

                japanese: String(
                    row[indexes.japanese] ??
                    ""
                ).trim()
            });
        }
    );

    if (result.length === 0) {
        throw new Error(
            "Không tìm thấy từ tiếng Anh hợp lệ trong CSV."
        );
    }

    return result;
}

function tachBangCsv(csvText) {
    const rows = [];

    let row = [];
    let value = "";
    let insideQuotes = false;

    for (
        let index = 0;
        index < csvText.length;
        index += 1
    ) {
        const character =
            csvText[index];

        const nextCharacter =
            csvText[index + 1];

        if (character === '"') {
            if (
                insideQuotes &&
                nextCharacter === '"'
            ) {
                value += '"';
                index += 1;
            } else {
                insideQuotes =
                    !insideQuotes;
            }
        } else if (
            character === "," &&
            !insideQuotes
        ) {
            row.push(value);
            value = "";
        } else if (
            (
                character === "\n" ||
                character === "\r"
            ) &&
            !insideQuotes
        ) {
            if (
                character === "\r" &&
                nextCharacter === "\n"
            ) {
                index += 1;
            }

            row.push(value);

            if (
                row.some(
                    function (cell) {
                        return String(cell)
                            .trim() !== "";
                    }
                )
            ) {
                rows.push(row);
            }

            row = [];
            value = "";
        } else {
            value += character;
        }
    }

    if (insideQuotes) {
        throw new Error(
            "CSV có dấu ngoặc kép chưa đóng."
        );
    }

    row.push(value);

    if (
        row.some(
            function (cell) {
                return String(cell)
                    .trim() !== "";
            }
        )
    ) {
        rows.push(row);
    }

    return rows;
}

async function xuLyImportCsv(event) {
    event.preventDefault();

    if (
        vocabularyCsvRows.length === 0
    ) {
        datThongBaoCsv(
            "Vui lòng chọn file CSV hợp lệ.",
            true
        );

        return;
    }

    const submitButton =
        document.getElementById(
            "submitVocabularyCsvButton"
        );

    submitButton.disabled = true;
    submitButton.textContent =
        "Đang thêm...";

    datThongBaoCsv(
        "Đang kiểm tra từ đã tồn tại..."
    );

    try {
        const existingWords =
            await taiCacTuDaTonTai();

        const newRows =
            vocabularyCsvRows.filter(
                function (row) {
                    const key =
                        row.english
                            .toLocaleLowerCase(
                                "en"
                            );

                    return !existingWords.has(
                        key
                    );
                }
            );

        const skippedCount =
            vocabularyCsvRows.length -
            newRows.length;

        if (newRows.length === 0) {
            datThongBaoCsv(
                `Không có từ mới. Đã bỏ qua ${skippedCount} từ trùng.`
            );

            return;
        }

        for (
            let index = 0;
            index < newRows.length;
            index += 200
        ) {
            const batch =
                newRows.slice(
                    index,
                    index + 200
                );

            const { error } =
                await supabaseClient
                    .from(
                        "english_vocabulary"
                    )
                    .insert(batch);

            if (error) {
                throw error;
            }
        }

        vocabularyCsvRows = [];

        document.getElementById(
            "vocabularyCsvInput"
        ).value = "";

        document.getElementById(
            "vocabularyCsvSelected"
        ).textContent =
            "Import đã hoàn tất.";

        datThongBaoCsv(
            `Đã thêm ${newRows.length} từ mới. Bỏ qua ${skippedCount} từ trùng.`
        );

        await taiThongKeTuVung();
    } catch (error) {
        console.error(
            "Không thể import CSV:",
            error
        );

        datThongBaoCsv(
            error.message ||
            "Không thể thêm dữ liệu vào Supabase.",
            true
        );
    } finally {
        submitButton.disabled = false;

        submitButton.textContent =
            "Thêm từ vựng";
    }
}

async function taiCacTuDaTonTai() {
    const existingWords =
        new Set();

    const pageSize = 1000;

    for (
        let startIndex = 0;
        ;
        startIndex += pageSize
    ) {
        const {
            data,
            error
        } = await supabaseClient
            .from(
                "english_vocabulary"
            )
            .select("english")
            .eq(
                "topic_id",
                vocabularyTopicId
            )
            .range(
                startIndex,
                startIndex +
                pageSize -
                1
            );

        if (error) {
            throw error;
        }

        (data || []).forEach(
            function (item) {
                existingWords.add(
                    String(
                        item.english || ""
                    )
                        .trim()
                        .toLocaleLowerCase(
                            "en"
                        )
                );
            }
        );

        if (
            !data ||
            data.length < pageSize
        ) {
            break;
        }
    }

    return existingWords;
}

function datThongBaoCsv(
    message,
    isError = false
) {
    const element =
        document.getElementById(
            "vocabularyCsvMessage"
        );

    if (!element) {
        return;
    }

    element.textContent = message;

    element.classList.toggle(
        "error",
        isError && Boolean(message)
    );
}


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


    return validValues.includes(
        savedValue
    )
        ? savedValue
        : 10;
}


/* =========================
   THỐNG KÊ THEO CHỦ ĐỀ
========================= */

async function taiThongKeTuVung() {
    const [
        statisticsResult,
        knownResult
    ] = await Promise.all([
        supabaseClient.rpc(
            "get_vocabulary_stats",
            {
                p_topic_id:
                    vocabularyTopicId
            }
        ),

        supabaseClient.rpc(
            "get_vocabulary_list",
            {
                p_search: "",
                p_status: "known",
                p_limit: 1,
                p_offset: 0,
                p_topic_id:
                    vocabularyTopicId
            }
        )
    ]);


    if (statisticsResult.error) {
        throw statisticsResult.error;
    }


    if (knownResult.error) {
        throw knownResult.error;
    }


    const statistics =
        statisticsResult.data &&
            statisticsResult.data.length > 0
            ? statisticsResult.data[0]
            : {
                total_words: 0,
                due_words: 0
            };


    const knownWords =
        knownResult.data &&
            knownResult.data.length > 0
            ? Number(
                knownResult.data[0]
                    .total_count
            ) || 0
            : 0;


    document.getElementById(
        "totalVocabularyCount"
    ).textContent =
        Number(
            statistics.total_words
        ) || 0;


    document.getElementById(
        "studiedVocabularyCount"
    ).textContent =
        knownWords;


    document.getElementById(
        "dueVocabularyCount"
    ).textContent =
        Number(
            statistics.due_words
        ) || 0;
}


/* =========================
   THÀNH QUẢ HÔM NAY
========================= */

async function taiThanhQuaHomNay() {
    const {
        data,
        error
    } = await supabaseClient.rpc(
        "get_vocabulary_daily_stats",
        {
            p_topic_id:
                vocabularyTopicId
        }
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
                String(
                    vocabularySessionSize
                )
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


    const topicName =
        document.getElementById(
            "vocabularyTopicName"
        );


    const topicDescription =
        document.getElementById(
            "vocabularyTopicDescription"
        );


    const message =
        document.getElementById(
            "todayVocabularyMessage"
        );


    if (topicName) {
        topicName.textContent =
            "Không tải được chủ đề";
    }


    if (topicDescription) {
        topicDescription.textContent =
            "Vui lòng quay lại danh sách chủ đề.";
    }


    if (message) {
        message.textContent =
            "Chưa tải được kết quả hôm nay.";
    }
}