let vocabularyTopics = [];

let editingVocabularyTopicId = null;


document.addEventListener(
    "DOMContentLoaded",
    async function () {
        ganSuKienChuDeTuVung();

        await taiDanhSachChuDeTuVung();
    }
);


/* =========================
   LẤY ELEMENT
========================= */

function layPhanTu(id) {
    return document.getElementById(id);
}


/* =========================
   GẮN SỰ KIỆN
========================= */

function ganSuKienChuDeTuVung() {
    layPhanTu(
        "openVocabularyTopicFormButton"
    ).addEventListener(
        "click",
        function () {
            moFormChuDeTuVung();
        }
    );


    layPhanTu(
        "closeVocabularyTopicFormButton"
    ).addEventListener(
        "click",
        dongFormChuDeTuVung
    );


    layPhanTu(
        "cancelVocabularyTopicFormButton"
    ).addEventListener(
        "click",
        dongFormChuDeTuVung
    );


    layPhanTu(
        "vocabularyTopicForm"
    ).addEventListener(
        "submit",
        xuLyLuuChuDeTuVung
    );


    layPhanTu(
        "vocabularyTopicFormModal"
    ).addEventListener(
        "click",
        function (event) {
            if (
                event.target ===
                layPhanTu(
                    "vocabularyTopicFormModal"
                )
            ) {
                dongFormChuDeTuVung();
            }
        }
    );


    document.addEventListener(
        "keydown",
        function (event) {
            if (event.key === "Escape") {
                dongFormChuDeTuVung();
            }
        }
    );
}


/* =========================
   TẢI DANH SÁCH CHỦ ĐỀ
========================= */

async function taiDanhSachChuDeTuVung() {
    hienThiThongBaoChuDe(
        "Đang tải danh sách chủ đề..."
    );


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
            emoji,
            display_order,
            created_at
        `)
        .order(
            "display_order",
            {
                ascending: true
            }
        )
        .order(
            "created_at",
            {
                ascending: true
            }
        );


    if (error) {
        console.error(
            "Không thể tải chủ đề:",
            error
        );

        hienThiThongBaoChuDe(
            error.message ||
            "Không thể tải danh sách chủ đề.",
            true
        );

        return;
    }


    vocabularyTopics =
        await Promise.all(
            (data || []).map(
                async function (topic) {
                    const {
                        count,
                        error: countError
                    } = await supabaseClient
                        .from(
                            "english_vocabulary"
                        )
                        .select(
                            "id",
                            {
                                count: "exact",
                                head: true
                            }
                        )
                        .eq(
                            "topic_id",
                            topic.id
                        );


                    if (countError) {
                        console.error(
                            "Không thể đếm từ:",
                            countError
                        );
                    }


                    return {
                        ...topic,

                        vocabulary_count:
                            countError
                                ? 0
                                : Number(count) || 0
                    };
                }
            )
        );


    hienThiDanhSachChuDeTuVung();
}


/* =========================
   HIỂN THỊ CHỦ ĐỀ
========================= */

function hienThiDanhSachChuDeTuVung() {
    const container =
        layPhanTu(
            "vocabularyTopicContainer"
        );


    container.innerHTML = "";


    if (vocabularyTopics.length === 0) {
        hienThiThongBaoChuDe(
            "Chưa có chủ đề từ vựng."
        );

        return;
    }


    vocabularyTopics.forEach(
        function (topic) {
            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "vocabulary-topic-card";


            card.innerHTML = `
                <div class="vocabulary-topic-icon">
                    ${thoatHtml(
                topic.emoji || "📚"
            )}
                </div>

                <div class="vocabulary-topic-content">

                    <span>CHỦ ĐỀ</span>

                    <h2>
                        ${thoatHtml(topic.name)}
                    </h2>

                    <p>
                        ${thoatHtml(
                topic.description ||
                "Chưa có mô tả"
            )}
                    </p>

                    <strong>
                        ${topic.vocabulary_count} từ
                    </strong>

                </div>

                <div class="vocabulary-topic-actions">

                    <a
    class="vocabulary-topic-open"
    href="vocabulary.html?topic=${encodeURIComponent(
                topic.id
            )}"
>
    Mở chủ đề ›
</a>

                    <button
                        class="vocabulary-topic-edit"
                        type="button"
                    >
                        Sửa
                    </button>

                    <button
                        class="vocabulary-topic-delete"
                        type="button"
                    >
                        Xóa
                    </button>

                </div>
            `;


            card
                .querySelector(
                    ".vocabulary-topic-open"
                )
                .addEventListener(
                    "click",
                    function () {
                        moChuDeTuVung(topic.id);
                    }
                );


            card
                .querySelector(
                    ".vocabulary-topic-edit"
                )
                .addEventListener(
                    "click",
                    function () {
                        moFormChuDeTuVung(
                            topic
                        );
                    }
                );


            card
                .querySelector(
                    ".vocabulary-topic-delete"
                )
                .addEventListener(
                    "click",
                    function () {
                        xoaChuDeTuVung(
                            topic
                        );
                    }
                );


            container.appendChild(card);
        }
    );
}


/* =========================
   MỞ CHỦ ĐỀ
========================= */

function moChuDeTuVung(topicId) {
    window.location.href =
        `vocabulary.html?topic=${encodeURIComponent(
            topicId
        )}`;
}


/* =========================
   MỞ FORM
========================= */

function moFormChuDeTuVung(
    topic = null
) {
    editingVocabularyTopicId =
        topic
            ? topic.id
            : null;


    layPhanTu(
        "vocabularyTopicForm"
    ).reset();


    layPhanTu(
        "vocabularyTopicId"
    ).value =
        topic
            ? topic.id
            : "";


    layPhanTu(
        "vocabularyTopicName"
    ).value =
        topic
            ? topic.name
            : "";


    layPhanTu(
        "vocabularyTopicDescription"
    ).value =
        topic
            ? topic.description || ""
            : "";


    layPhanTu(
        "vocabularyTopicEmoji"
    ).value =
        topic
            ? topic.emoji || "📚"
            : "📚";


    layPhanTu(
        "vocabularyTopicFormTitle"
    ).textContent =
        topic
            ? "Sửa chủ đề"
            : "Thêm chủ đề";


    datThongBaoFormChuDe("");


    const modal =
        layPhanTu(
            "vocabularyTopicFormModal"
        );


    modal.hidden = false;

    modal.classList.remove(
        "hidden"
    );


    document.body.classList.add(
        "modal-open"
    );


    setTimeout(
        function () {
            layPhanTu(
                "vocabularyTopicName"
            ).focus();
        },
        50
    );
}


/* =========================
   ĐÓNG FORM
========================= */

function dongFormChuDeTuVung() {
    const modal =
        layPhanTu(
            "vocabularyTopicFormModal"
        );


    if (!modal) {
        return;
    }


    modal.hidden = true;

    modal.classList.add(
        "hidden"
    );


    document.body.classList.remove(
        "modal-open"
    );


    editingVocabularyTopicId = null;

    datThongBaoFormChuDe("");
}


/* =========================
   LƯU CHỦ ĐỀ
========================= */

async function xuLyLuuChuDeTuVung(
    event
) {
    event.preventDefault();


    const name =
        layPhanTu(
            "vocabularyTopicName"
        ).value.trim();


    const description =
        layPhanTu(
            "vocabularyTopicDescription"
        ).value.trim();


    const emoji =
        layPhanTu(
            "vocabularyTopicEmoji"
        ).value.trim() || "📚";


    if (!name) {
        datThongBaoFormChuDe(
            "Vui lòng nhập tên chủ đề."
        );

        return;
    }


    datThongBaoFormChuDe(
        "Đang lưu chủ đề...",
        false
    );


    let result;


    if (editingVocabularyTopicId) {
        result =
            await supabaseClient
                .from(
                    "english_vocabulary_topics"
                )
                .update({
                    name,
                    description,
                    emoji
                })
                .eq(
                    "id",
                    editingVocabularyTopicId
                );
    } else {
        const nextOrder =
            vocabularyTopics.length > 0
                ? Math.max(
                    ...vocabularyTopics.map(
                        function (topic) {
                            return Number(
                                topic.display_order
                            ) || 0;
                        }
                    )
                ) + 1
                : 1;


        result =
            await supabaseClient
                .from(
                    "english_vocabulary_topics"
                )
                .insert({
                    name,
                    description,
                    emoji,
                    display_order:
                        nextOrder
                });
    }


    if (result.error) {
        console.error(
            "Không thể lưu chủ đề:",
            result.error
        );


        if (
            result.error.code ===
            "23505"
        ) {
            datThongBaoFormChuDe(
                "Tên chủ đề này đã tồn tại."
            );
        } else {
            datThongBaoFormChuDe(
                result.error.message ||
                "Không thể lưu chủ đề."
            );
        }

        return;
    }


    dongFormChuDeTuVung();

    await taiDanhSachChuDeTuVung();
}


/* =========================
   XÓA CHỦ ĐỀ
========================= */

async function xoaChuDeTuVung(
    topic
) {
    if (
        Number(
            topic.vocabulary_count
        ) > 0
    ) {
        alert(
            `Chủ đề “${topic.name}” đang có ` +
            `${topic.vocabulary_count} từ.\n\n` +
            "Hãy chuyển hoặc xóa từ vựng trước khi xóa chủ đề."
        );

        return;
    }


    const confirmed =
        window.confirm(
            `Bạn có chắc muốn xóa chủ đề “${topic.name}” không?`
        );


    if (!confirmed) {
        return;
    }


    const {
        error
    } = await supabaseClient
        .from(
            "english_vocabulary_topics"
        )
        .delete()
        .eq(
            "id",
            topic.id
        );


    if (error) {
        console.error(
            "Không thể xóa chủ đề:",
            error
        );

        alert(
            error.message ||
            "Không thể xóa chủ đề."
        );

        return;
    }


    await taiDanhSachChuDeTuVung();
}


/* =========================
   THÔNG BÁO
========================= */

function hienThiThongBaoChuDe(
    message,
    isError = false
) {
    const container =
        layPhanTu(
            "vocabularyTopicContainer"
        );


    container.innerHTML = `
        <article class="
            vocabulary-topic-message
            ${isError ? "error" : ""}
        ">
            ${thoatHtml(message)}
        </article>
    `;
}


function datThongBaoFormChuDe(
    message,
    isError = true
) {
    const element =
        layPhanTu(
            "vocabularyTopicFormMessage"
        );


    element.textContent = message;


    element.classList.toggle(
        "error",
        isError && Boolean(message)
    );
}


/* =========================
   BẢO VỆ HTML
========================= */

function thoatHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}