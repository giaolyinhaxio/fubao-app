const VOCABULARY_PAGE_SIZE = 20;

let currentVocabularyPage = 1;

let currentSearchText = "";

let currentStatusFilter = "all";

let totalVocabularyCount = 0;


document.addEventListener(
    "DOMContentLoaded",
    async function () {
        const countElement =
            document.getElementById(
                "vocabularyListCount"
            );

        try {
            countElement.textContent =
                "JavaScript đã chạy...";

            ganSuKienDanhSachTu();

            await taiDanhSachTrongKho();
        } catch (error) {
            console.error(
                "Lỗi khởi động danh sách:",
                error
            );

            countElement.textContent =
                `Lỗi: ${error.message}`;
        }
    }
);


/* =========================
   GẮN SỰ KIỆN
========================= */

function ganSuKienDanhSachTu() {
    const searchInput =
        document.getElementById(
            "vocabularySearchInput"
        );

    const searchButton =
        document.getElementById(
            "searchVocabularyButton"
        );

    const previousButton =
        document.getElementById(
            "previousVocabularyPage"
        );

    const nextButton =
        document.getElementById(
            "nextVocabularyPage"
        );

    const statusFilter =
        document.getElementById(
            "vocabularyStatusFilter"
        );


    searchButton.addEventListener(
        "click",
        timKiemTuVung
    );


    searchInput.addEventListener(
        "keydown",
        function (event) {
            if (event.key === "Enter") {
                timKiemTuVung();
            }
        }
    );


    previousButton.addEventListener(
        "click",
        async function () {
            if (
                currentVocabularyPage <= 1
            ) {
                return;
            }

            currentVocabularyPage -= 1;

            await taiDanhSachTrongKho();

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        }
    );


    nextButton.addEventListener(
        "click",
        async function () {
            const totalPages =
                layTongSoTrang();

            if (
                currentVocabularyPage >=
                totalPages
            ) {
                return;
            }

            currentVocabularyPage += 1;

            await taiDanhSachTrongKho();

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        }
    );

    statusFilter.addEventListener(
        "change",
        async function () {
            currentStatusFilter =
                statusFilter.value;

            currentVocabularyPage = 1;

            await taiDanhSachTrongKho();
        }
    );
}


/* =========================
   TÌM KIẾM
========================= */

async function timKiemTuVung() {
    const searchInput =
        document.getElementById(
            "vocabularySearchInput"
        );

    currentSearchText =
        searchInput.value.trim();

    currentVocabularyPage = 1;

    await taiDanhSachTrongKho();
}


/* =========================
   ĐỌC DỮ LIỆU SUPABASE
========================= */

async function taiDanhSachTrongKho() {
    hienThiDangTai();

    try {
        const startIndex =
            (
                currentVocabularyPage - 1
            ) * VOCABULARY_PAGE_SIZE;


        const {
            data,
            error
        } = await supabaseClient.rpc(
            "get_vocabulary_list_v2",
            {
                p_search:
                    currentSearchText,

                p_status:
                    currentStatusFilter,

                p_limit:
                    VOCABULARY_PAGE_SIZE,

                p_offset:
                    startIndex
            }
        );


        if (error) {
            throw error;
        }


        const vocabularyList =
            data || [];


        totalVocabularyCount =
            vocabularyList.length > 0
                ? Number(
                    vocabularyList[0]
                        .total_count
                ) || 0
                : 0;


        hienThiDanhSachTu(
            vocabularyList
        );

        capNhatPhanTrang();

        capNhatSoLuongKetQua();
    } catch (error) {
        hienThiLoiDanhSach(error);
    }
}

/* =========================
   HIỂN THỊ DANH SÁCH
========================= */

function hienThiDanhSachTu(
    vocabularyList
) {
    const container =
        document.getElementById(
            "vocabularyListContainer"
        );


    container.replaceChildren();


    if (vocabularyList.length === 0) {
        const emptyNotice =
            document.createElement(
                "article"
            );

        emptyNotice.className =
            "vocabulary-list-empty";

        emptyNotice.textContent =
            "Không tìm thấy từ phù hợp.";

        container.appendChild(
            emptyNotice
        );

        return;
    }


    vocabularyList.forEach(
        function (vocabulary) {
            const card =
                taoTheTuVung(
                    vocabulary
                );

            container.appendChild(
                card
            );
        }
    );
}


function taoTheTuVung(
    vocabulary
) {
    const card =
        document.createElement(
            "article"
        );

    card.className =
        "vocabulary-list-card";


    const heading =
        document.createElement(
            "div"
        );

    heading.className =
        "vocabulary-list-card-heading";


    const wordArea =
        document.createElement(
            "div"
        );


    const english =
        document.createElement(
            "h2"
        );

    english.textContent =
        vocabulary.english;


    const ipa =
        document.createElement(
            "p"
        );

    ipa.className =
        "vocabulary-list-ipa";

    ipa.textContent =
        vocabulary.ipa ||
        "Chưa có phiên âm";


    const statusBadge =
        document.createElement(
            "span"
        );

    statusBadge.className =
        `vocabulary-status-badge status-${vocabulary.learning_status}`;

    statusBadge.textContent =
        layTenTrangThai(
            vocabulary.learning_status
        );


    wordArea.append(
        english,
        ipa,
        statusBadge
    );


    const speakButton =
        document.createElement(
            "button"
        );

    speakButton.type =
        "button";

    speakButton.className =
        "vocabulary-list-speak-button";

    speakButton.textContent =
        "🔊";

    speakButton.setAttribute(
        "aria-label",
        `Phát âm ${vocabulary.english}`
    );

    speakButton.addEventListener(
        "click",
        function () {
            phatAmTu(
                vocabulary.english
            );
        }
    );


    const favoriteButton =
        document.createElement(
            "button"
        );

    favoriteButton.type =
        "button";

    favoriteButton.className =
        "vocabulary-favorite-button";

    favoriteButton.setAttribute(
        "aria-label",
        "Đánh dấu từ yêu thích"
    );


    capNhatNutYeuThich(
        favoriteButton,
        vocabulary
    );


    favoriteButton.addEventListener(
        "click",
        async function () {
            await thayDoiTrangThaiYeuThich(
                vocabulary,
                favoriteButton
            );
        }
    );


    const cardActions =
        document.createElement(
            "div"
        );

    cardActions.className =
        "vocabulary-list-card-actions";

    cardActions.append(
        favoriteButton,
        speakButton
    );


    heading.append(
        wordArea,
        cardActions
    );


    const meanings =
        document.createElement(
            "div"
        );

    meanings.className =
        "vocabulary-list-meanings";


    const vietnamese =
        document.createElement(
            "p"
        );

    vietnamese.textContent =
        vocabulary.vietnamese ||
        "Chưa có nghĩa tiếng Việt";


    const japanese =
        document.createElement(
            "p"
        );

    japanese.textContent =
        vocabulary.japanese ||
        "日本語の意味はまだありません";


    meanings.append(
        vietnamese,
        japanese
    );


    card.append(
        heading,
        meanings
    );


    return card;
}

function layTenTrangThai(
    status
) {
    const statusNames = {
        new: "Chưa học",
        again: "Chưa nhớ",
        learning: "Hơi nhớ",
        known: "Đã nhớ"
    };

    return statusNames[status] ||
        "Chưa học";
}

function capNhatNutYeuThich(
    button,
    vocabulary
) {
    const isFavorite =
        Boolean(
            vocabulary.is_favorite
        );

    button.textContent =
        isFavorite
            ? "★"
            : "☆";

    button.classList.toggle(
        "is-favorite",
        isFavorite
    );

    button.setAttribute(
        "aria-pressed",
        String(isFavorite)
    );
}


async function thayDoiTrangThaiYeuThich(
    vocabulary,
    button
) {
    button.disabled = true;

    try {
        const {
            data: userData,
            error: userError
        } = await supabaseClient
            .auth
            .getUser();


        if (
            userError ||
            !userData.user
        ) {
            throw new Error(
                "Không xác định được tài khoản."
            );
        }


        if (vocabulary.is_favorite) {
            const {
                error
            } = await supabaseClient
                .from(
                    "vocabulary_favorites"
                )
                .delete()
                .eq(
                    "user_id",
                    userData.user.id
                )
                .eq(
                    "vocabulary_id",
                    vocabulary.id
                );


            if (error) {
                throw error;
            }


            vocabulary.is_favorite =
                false;
        } else {
            const {
                error
            } = await supabaseClient
                .from(
                    "vocabulary_favorites"
                )
                .insert({
                    user_id:
                        userData.user.id,

                    vocabulary_id:
                        vocabulary.id
                });


            if (error) {
                throw error;
            }


            vocabulary.is_favorite =
                true;
        }


        capNhatNutYeuThich(
            button,
            vocabulary
        );


        if (
            currentStatusFilter ===
            "favorite" &&
            !vocabulary.is_favorite
        ) {
            await taiDanhSachTrongKho();
        }
    } catch (error) {
        console.error(
            "Không thể lưu từ yêu thích:",
            error
        );

        alert(
            "Không thể cập nhật từ yêu thích. Hãy thử lại."
        );
    } finally {
        button.disabled = false;
    }
}

/* =========================
   PHÁT ÂM
========================= */

function phatAmTu(
    englishWord
) {
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


    window.speechSynthesis.cancel();


    const utterance =
        new SpeechSynthesisUtterance(
            englishWord
        );

    utterance.lang = "en-US";

    utterance.rate = 0.8;

    window.speechSynthesis.speak(
        utterance
    );
}


/* =========================
   PHÂN TRANG
========================= */

function layTongSoTrang() {
    return Math.max(
        1,
        Math.ceil(
            totalVocabularyCount /
            VOCABULARY_PAGE_SIZE
        )
    );
}


function capNhatPhanTrang() {
    const totalPages =
        layTongSoTrang();

    document.getElementById(
        "vocabularyPageNumber"
    ).textContent =
        `Trang ${currentVocabularyPage} / ${totalPages}`;


    document.getElementById(
        "previousVocabularyPage"
    ).disabled =
        currentVocabularyPage <= 1;


    document.getElementById(
        "nextVocabularyPage"
    ).disabled =
        currentVocabularyPage >=
        totalPages;
}


function capNhatSoLuongKetQua() {
    const countElement =
        document.getElementById(
            "vocabularyListCount"
        );


    if (currentSearchText) {
        countElement.textContent =
            `${totalVocabularyCount} kết quả cho “${currentSearchText}”`;

        return;
    }


    countElement.textContent =
        `${totalVocabularyCount} từ trong kho`;
}


/* =========================
   TRẠNG THÁI TRANG
========================= */

function hienThiDangTai() {
    const container =
        document.getElementById(
            "vocabularyListContainer"
        );

    container.innerHTML = `
        <article class="vocabulary-list-loading">
            Đang tải danh sách từ...
        </article>
    `;
}


function hienThiLoiDanhSach(
    error
) {
    console.error(
        "Không thể tải danh sách từ:",
        error
    );


    document.getElementById(
        "vocabularyListContainer"
    ).innerHTML = `
        <article class="vocabulary-list-empty">
            Không thể tải danh sách từ.
            Hãy kiểm tra mạng rồi thử lại.
        </article>
    `;


    document.getElementById(
        "vocabularyListCount"
    ).textContent =
        "Không thể tải dữ liệu";
}