const topicId =
    new URLSearchParams(
        window.location.search
    ).get("topic");

let topics = [];
let articles = [];
let currentTopic = null;

const getElement = (id) =>
    document.getElementById(id);


document.addEventListener(
    "DOMContentLoaded",
    async function () {
        attachEvents();

        if (topicId) {
            await loadTopicAndArticles();
        } else {
            await loadTopics();
        }
    }
);


/* =========================
   EVENTS
========================= */

function attachEvents() {
    getElement(
        "openTopicFormButton"
    ).addEventListener(
        "click",
        () => openTopicForm()
    );

    getElement(
        "openReadingFormButton"
    ).addEventListener(
        "click",
        () => openArticleForm()
    );

    getElement(
        "closeTopicFormButton"
    ).addEventListener(
        "click",
        closeTopicForm
    );

    getElement(
        "cancelTopicFormButton"
    ).addEventListener(
        "click",
        closeTopicForm
    );

    getElement(
        "topicFormBackdrop"
    ).addEventListener(
        "click",
        closeTopicForm
    );

    getElement(
        "topicForm"
    ).addEventListener(
        "submit",
        saveTopic
    );

    getElement(
        "closeReadingFormButton"
    ).addEventListener(
        "click",
        closeArticleForm
    );

    getElement(
        "cancelReadingFormButton"
    ).addEventListener(
        "click",
        closeArticleForm
    );

    getElement(
        "readingFormBackdrop"
    ).addEventListener(
        "click",
        closeArticleForm
    );

    getElement(
        "readingForm"
    ).addEventListener(
        "submit",
        saveArticle
    );

    document.addEventListener(
        "keydown",
        function (event) {
            if (event.key === "Escape") {
                closeTopicForm();
                closeArticleForm();
            }
        }
    );
}


/* =========================
   TOPIC LIST
========================= */

async function loadTopics() {
    showMessage(
        "topicListContainer",
        "Đang tải danh sách chủ đề..."
    );

    try {
        const [
            topicResult,
            articleResult
        ] = await Promise.all([
            supabaseClient
                .from(
                    "english_reading_topics"
                )
                .select(`
                    id,
                    name,
                    emoji,
                    description,
                    created_at,
                    updated_at
                `)
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                ),

            supabaseClient
                .from(
                    "english_readings"
                )
                .select("topic_id")
        ]);

        if (topicResult.error) {
            throw topicResult.error;
        }

        if (articleResult.error) {
            throw articleResult.error;
        }

        const articleCount = {};

        (
            articleResult.data || []
        ).forEach(
            function (article) {
                const id =
                    article.topic_id ||
                    "none";

                articleCount[id] =
                    (
                        articleCount[id] ||
                        0
                    ) + 1;
            }
        );

        topics =
            (
                topicResult.data || []
            ).map(
                function (topic) {
                    return {
                        ...topic,

                        article_count:
                            articleCount[
                            topic.id
                            ] || 0
                    };
                }
            );

        renderTopics();

    } catch (error) {
        console.error(
            "Không thể tải chủ đề:",
            error
        );

        showMessage(
            "topicListContainer",
            `Không thể tải chủ đề: ${error.message
            }`,
            true
        );
    }
}


function renderTopics() {
    const container =
        getElement(
            "topicListContainer"
        );

    container.replaceChildren();

    if (!topics.length) {
        showMessage(
            "topicListContainer",
            "Chưa có chủ đề. Nhấn “＋ Chủ đề” để tạo chủ đề đầu tiên."
        );

        return;
    }

    topics.forEach(
        function (topic) {
            const card =
                document.createElement(
                    "article"
                );

            card.className =
                "reading-topic-card";

            card.tabIndex = 0;

            card.setAttribute(
                "role",
                "link"
            );

            card.innerHTML = `
                <div class="reading-topic-icon">
                    ${escapeHtml(
                topic.emoji ||
                "📚"
            )
                }
                </div>

                <div class="reading-topic-content">
                    <span>CHỦ ĐỀ</span>

                    <h2>
                        ${escapeHtml(topic.name)}
                    </h2>

                    <p>
                        ${escapeHtml(
                    topic.description ||
                    "Chưa có mô tả"
                )
                }
                    </p>

                    <strong>
                        ${topic.article_count
                } bài đọc
                    </strong>
                </div>

                <div class="reading-topic-actions">

                    <button
                        class="reading-topic-open"
                        type="button"
                    >
                        Mở chủ đề ›
                    </button>

                    <button
                        class="reading-topic-edit"
                        type="button"
                    >
                        Sửa
                    </button>

                    ${topic.name ===
                    "Chưa phân loại"
                    ? ""
                    : `
                                <button
                                    class="reading-topic-delete"
                                    type="button"
                                >
                                    Xóa
                                </button>
                            `
                }

                </div>
            `;

            card.querySelector(
                ".reading-topic-open"
            ).addEventListener(
                "click",
                function (event) {
                    event.stopPropagation();

                    openTopic(
                        topic.id
                    );
                }
            );

            card.querySelector(
                ".reading-topic-edit"
            ).addEventListener(
                "click",
                function (event) {
                    event.stopPropagation();

                    openTopicForm(
                        topic
                    );
                }
            );

            const deleteButton =
                card.querySelector(
                    ".reading-topic-delete"
                );

            if (deleteButton) {
                deleteButton.addEventListener(
                    "click",
                    async function (
                        event
                    ) {
                        event.stopPropagation();

                        await deleteTopic(
                            topic
                        );
                    }
                );
            }

            card.addEventListener(
                "click",
                function () {
                    openTopic(
                        topic.id
                    );
                }
            );

            card.addEventListener(
                "keydown",
                function (event) {
                    if (
                        event.key ===
                        "Enter" ||
                        event.key === " "
                    ) {
                        event.preventDefault();

                        openTopic(
                            topic.id
                        );
                    }
                }
            );

            container.appendChild(
                card
            );
        }
    );
}


function openTopic(id) {
    window.location.href =
        `reading-list.html?topic=${encodeURIComponent(id)
        }`;
}


/* =========================
   ARTICLES IN A TOPIC
========================= */

async function loadTopicAndArticles() {
    switchToArticleScreen();

    showMessage(
        "readingListContainer",
        "Đang tải danh sách bài đọc..."
    );

    try {
        const [
            topicResult,
            articleResult
        ] = await Promise.all([
            supabaseClient
                .from(
                    "english_reading_topics"
                )
                .select(`
                    id,
                    name,
                    emoji,
                    description
                `)
                .eq(
                    "id",
                    topicId
                )
                .single(),

            supabaseClient
                .from(
                    "english_readings"
                )
                .select(`
                    id,
                    title,
                    english_content,
                    vietnamese_translation,
                    topic_id,
                    sort_order,
                    created_at,
                    updated_at
                `)
                .eq(
                    "topic_id",
                    topicId
                )
                .order(
                    "sort_order",
                    {
                        ascending: true
                    }
                )
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                )
        ]);

        if (topicResult.error) {
            throw topicResult.error;
        }

        if (articleResult.error) {
            throw articleResult.error;
        }

        currentTopic =
            topicResult.data;

        articles =
            articleResult.data || [];

        updateTopicHeading();

        renderArticles();

    } catch (error) {
        console.error(
            "Không thể tải bài đọc:",
            error
        );

        showMessage(
            "readingListContainer",
            `Không thể tải bài đọc: ${error.message
            }`,
            true
        );
    }
}


function switchToArticleScreen() {
    setHidden(
        "topicListContainer",
        true
    );

    setHidden(
        "readingListContainer",
        false
    );

    setHidden(
        "openTopicFormButton",
        true
    );

    setHidden(
        "openReadingFormButton",
        false
    );

    getElement(
        "readingListBackButton"
    ).href =
        "reading-list.html";

    getElement(
        "readingListBackText"
    ).textContent =
        "Chủ đề";
}


function updateTopicHeading() {
    getElement(
        "readingListEyebrow"
    ).textContent =
        "BÀI LUYỆN ĐỌC";

    getElement(
        "readingListTitle"
    ).textContent =
        `${currentTopic.emoji ||
        "📚"
        } ${currentTopic.name}`;

    getElement(
        "readingListDescription"
    ).textContent =
        currentTopic.description ||
        "Chọn bài viết bạn muốn luyện đọc";

    document.title =
        `${currentTopic.name} | FuBao`;
}


function renderArticles() {
    const container =
        getElement(
            "readingListContainer"
        );

    container.replaceChildren();

    if (!articles.length) {
        showMessage(
            "readingListContainer",
            "Chủ đề này chưa có bài. Nhấn “＋ Bài mới” để thêm bài đọc."
        );

        return;
    }

    articles.forEach(
        function (
            article,
            index
        ) {
            const card =
                document.createElement(
                    "article"
                );

            card.className =
                "reading-list-card";

            card.tabIndex = 0;

            card.setAttribute(
                "role",
                "link"
            );

            card.innerHTML = `
                <div class="reading-list-card-content">

                    <span class="reading-list-card-label">
                        BÀI LUYỆN ĐỌC ${index + 1
                }
                    </span>

                    <h2>
                        ${escapeHtml(
                    article.title
                )
                }
                    </h2>

                    <p>
                        ${escapeHtml(
                    createPreview(
                        article
                            .english_content
                    )
                )
                }
                    </p>

                </div>

                <div class="reading-list-card-actions">

                    <button
                        class="reading-open-button"
                        type="button"
                    >
                        Đọc bài ›
                    </button>

                    <button
                        class="reading-edit-button"
                        type="button"
                    >
                        Sửa
                    </button>

                    <button
                        class="reading-delete-button"
                        type="button"
                    >
                        Xóa
                    </button>

                    <button
    class="reading-move-up-button"
    type="button"
    ${index === 0
                    ? "disabled"
                    : ""
                }
>
    ↑ Đưa lên
</button>

<button
    class="reading-move-down-button"
    type="button"
    ${index ===
                    articles.length - 1
                    ? "disabled"
                    : ""
                }
>
    ↓ Đưa xuống
</button>

                </div>
            `;

            card.querySelector(
                ".reading-open-button"
            ).addEventListener(
                "click",
                function (event) {
                    event.stopPropagation();

                    openArticle(
                        article.id
                    );
                }
            );

            card.querySelector(
                ".reading-edit-button"
            ).addEventListener(
                "click",
                function (event) {
                    event.stopPropagation();

                    openArticleForm(
                        article
                    );
                }
            );

            card.querySelector(
                ".reading-delete-button"
            ).addEventListener(
                "click",
                async function (
                    event
                ) {
                    event.stopPropagation();

                    await deleteArticle(
                        article
                    );
                }
            );

            const moveUpButton =
                card.querySelector(
                    ".reading-move-up-button"
                );

            const moveDownButton =
                card.querySelector(
                    ".reading-move-down-button"
                );


            moveUpButton.addEventListener(
                "click",
                async function (event) {
                    event.stopPropagation();

                    await moveArticle(
                        index,
                        -1
                    );
                }
            );


            moveDownButton.addEventListener(
                "click",
                async function (event) {
                    event.stopPropagation();

                    await moveArticle(
                        index,
                        1
                    );
                }
            );

            card.addEventListener(
                "click",
                function () {
                    openArticle(
                        article.id
                    );
                }
            );

            card.addEventListener(
                "keydown",
                function (event) {
                    if (
                        event.key ===
                        "Enter" ||
                        event.key === " "
                    ) {
                        event.preventDefault();

                        openArticle(
                            article.id
                        );
                    }
                }
            );

            container.appendChild(
                card
            );
        }
    );
}


function openArticle(id) {
    window.location.href =
        `reading.html?id=${encodeURIComponent(id)
        }`;
}


function createPreview(content) {
    const text =
        String(content || "")
            .replace(/\s+/g, " ")
            .trim();

    return text.length <= 160
        ? text
        : `${text.slice(0, 160)}...`;
}


/* =========================
   TOPIC FORM
========================= */

function openTopicForm(
    topic = null
) {
    getElement(
        "topicForm"
    ).reset();

    getElement(
        "topicFormMessage"
    ).textContent = "";

    getElement(
        "topicId"
    ).value =
        topic?.id || "";

    getElement(
        "topicEmojiInput"
    ).value =
        topic?.emoji || "📚";

    getElement(
        "topicNameInput"
    ).value =
        topic?.name || "";

    getElement(
        "topicDescriptionInput"
    ).value =
        topic?.description || "";

    getElement(
        "topicFormTitle"
    ).textContent =
        topic
            ? "Chỉnh sửa chủ đề"
            : "Thêm chủ đề";

    openModal(
        "topicFormModal"
    );

    getElement(
        "topicNameInput"
    ).focus();
}


function closeTopicForm() {
    closeModal(
        "topicFormModal"
    );
}


async function saveTopic(event) {
    event.preventDefault();

    const id =
        getElement(
            "topicId"
        ).value;

    const payload = {
        name:
            getElement(
                "topicNameInput"
            ).value.trim(),

        emoji:
            getElement(
                "topicEmojiInput"
            ).value.trim() ||
            "📚",

        description:
            getElement(
                "topicDescriptionInput"
            ).value.trim(),

        updated_at:
            new Date()
                .toISOString()
    };

    if (!payload.name) {
        getElement(
            "topicFormMessage"
        ).textContent =
            "Vui lòng nhập tên chủ đề.";

        return;
    }

    setSaving(
        "topicForm",
        true,
        "Lưu chủ đề"
    );

    try {
        const result =
            id
                ? await supabaseClient
                    .from(
                        "english_reading_topics"
                    )
                    .update(payload)
                    .eq("id", id)

                : await supabaseClient
                    .from(
                        "english_reading_topics"
                    )
                    .insert(payload);

        if (result.error) {
            throw result.error;
        }

        closeTopicForm();

        await loadTopics();

    } catch (error) {
        console.error(
            "Không thể lưu chủ đề:",
            error
        );

        getElement(
            "topicFormMessage"
        ).textContent =
            error.message ||
            "Không thể lưu chủ đề.";

    } finally {
        setSaving(
            "topicForm",
            false,
            "Lưu chủ đề"
        );
    }
}


async function deleteTopic(topic) {
    const accepted =
        window.confirm(
            `Xóa chủ đề “${topic.name}”? Các bài trong đó sẽ chuyển sang “Chưa phân loại”.`
        );

    if (!accepted) {
        return;
    }

    try {
        const defaultTopic =
            topics.find(
                function (item) {
                    return (
                        item.name ===
                        "Chưa phân loại"
                    );
                }
            );

        const moveResult =
            await supabaseClient
                .from(
                    "english_readings"
                )
                .update({
                    topic_id:
                        defaultTopic?.id ||
                        null,

                    updated_at:
                        new Date()
                            .toISOString()
                })
                .eq(
                    "topic_id",
                    topic.id
                );

        if (moveResult.error) {
            throw moveResult.error;
        }

        const deleteResult =
            await supabaseClient
                .from(
                    "english_reading_topics"
                )
                .delete()
                .eq(
                    "id",
                    topic.id
                );

        if (deleteResult.error) {
            throw deleteResult.error;
        }

        await loadTopics();

    } catch (error) {
        console.error(
            "Không thể xóa chủ đề:",
            error
        );

        window.alert(
            `Không thể xóa chủ đề: ${error.message
            }`
        );
    }
}


/* =========================
   ARTICLE FORM
========================= */

function openArticleForm(
    article = null
) {
    if (!currentTopic) {
        return;
    }

    getElement(
        "readingForm"
    ).reset();

    getElement(
        "readingFormMessage"
    ).textContent = "";

    getElement(
        "readingId"
    ).value =
        article?.id || "";

    getElement(
        "readingTitleInput"
    ).value =
        article?.title || "";

    getElement(
        "readingEnglishInput"
    ).value =
        article
            ?.english_content ||
        "";

    getElement(
        "readingVietnameseInput"
    ).value =
        article
            ?.vietnamese_translation ||
        "";

    getElement(
        "readingFormTitle"
    ).textContent =
        article
            ? "Chỉnh sửa bài đọc"
            : "Thêm bài đọc";

    openModal(
        "readingFormModal"
    );

    getElement(
        "readingTitleInput"
    ).focus();
}


function closeArticleForm() {
    closeModal(
        "readingFormModal"
    );
}


async function saveArticle(event) {
    event.preventDefault();

    const id =
        getElement(
            "readingId"
        ).value;

    const payload = {
        topic_id:
            topicId,

        title:
            getElement(
                "readingTitleInput"
            ).value.trim(),

        english_content:
            getElement(
                "readingEnglishInput"
            ).value.trim(),

        vietnamese_translation:
            getElement(
                "readingVietnameseInput"
            ).value.trim(),

        updated_at:
            new Date()
                .toISOString()
    };

    if (!id) {
        const largestOrder =
            articles.reduce(
                function (
                    currentLargest,
                    article
                ) {
                    return Math.max(
                        currentLargest,
                        Number(
                            article.sort_order
                        ) || 0
                    );
                },
                0
            );

        payload.sort_order =
            largestOrder + 1;
    }

    if (
        !payload.title ||
        !payload.english_content
    ) {
        getElement(
            "readingFormMessage"
        ).textContent =
            "Vui lòng nhập tiêu đề và nội dung tiếng Anh.";

        return;
    }

    setSaving(
        "readingForm",
        true,
        "Lưu bài đọc"
    );

    try {
        const result =
            id
                ? await supabaseClient
                    .from(
                        "english_readings"
                    )
                    .update(payload)
                    .eq("id", id)

                : await supabaseClient
                    .from(
                        "english_readings"
                    )
                    .insert(payload);

        if (result.error) {
            throw result.error;
        }

        closeArticleForm();

        await loadTopicAndArticles();

    } catch (error) {
        console.error(
            "Không thể lưu bài đọc:",
            error
        );

        getElement(
            "readingFormMessage"
        ).textContent =
            error.message ||
            "Không thể lưu bài đọc.";

    } finally {
        setSaving(
            "readingForm",
            false,
            "Lưu bài đọc"
        );
    }
}


async function deleteArticle(
    article
) {
    const accepted =
        window.confirm(
            `Xóa bài đọc “${article.title}”?`
        );

    if (!accepted) {
        return;
    }

    try {
        const result =
            await supabaseClient
                .from(
                    "english_readings"
                )
                .delete()
                .eq(
                    "id",
                    article.id
                );

        if (result.error) {
            throw result.error;
        }

        await loadTopicAndArticles();

    } catch (error) {
        console.error(
            "Không thể xóa bài đọc:",
            error
        );

        window.alert(
            `Không thể xóa bài đọc: ${error.message
            }`
        );
    }
}

/* =========================
   CHANGE ARTICLE ORDER
========================= */

async function moveArticle(
    currentIndex,
    direction
) {
    const targetIndex =
        currentIndex + direction;


    if (
        targetIndex < 0 ||
        targetIndex >=
        articles.length
    ) {
        return;
    }


    const currentArticle =
        articles[currentIndex];

    const targetArticle =
        articles[targetIndex];


    const currentOrder =
        Number(
            currentArticle.sort_order
        ) || currentIndex + 1;


    const targetOrder =
        Number(
            targetArticle.sort_order
        ) || targetIndex + 1;


    try {
        const [
            currentResult,
            targetResult
        ] = await Promise.all([
            supabaseClient
                .from(
                    "english_readings"
                )
                .update({
                    sort_order:
                        targetOrder
                })
                .eq(
                    "id",
                    currentArticle.id
                ),

            supabaseClient
                .from(
                    "english_readings"
                )
                .update({
                    sort_order:
                        currentOrder
                })
                .eq(
                    "id",
                    targetArticle.id
                )
        ]);


        if (currentResult.error) {
            throw currentResult.error;
        }


        if (targetResult.error) {
            throw targetResult.error;
        }


        await loadTopicAndArticles();

    } catch (error) {
        console.error(
            "Không thể đổi thứ tự:",
            error
        );


        window.alert(
            `Không thể đổi thứ tự: ${error.message
            }`
        );
    }
}


/* =========================
   HELPERS
========================= */

function openModal(id) {
    const modal =
        getElement(id);

    modal.hidden = false;

    modal.classList.remove(
        "hidden"
    );

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "modal-open"
    );
}


function closeModal(id) {
    const modal =
        getElement(id);

    modal.hidden = true;

    modal.classList.add(
        "hidden"
    );

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    const visibleModal =
        document.querySelector(
            ".reading-form-modal:not(.hidden)"
        );

    if (!visibleModal) {
        document.body.classList.remove(
            "modal-open"
        );
    }
}


function setHidden(
    id,
    hidden
) {
    const element =
        getElement(id);

    element.hidden =
        hidden;

    element.classList.toggle(
        "hidden",
        hidden
    );
}


function setSaving(
    formId,
    saving,
    normalText
) {
    const button =
        document.querySelector(
            `#${formId} button[type="submit"]`
        );

    button.disabled =
        saving;

    button.textContent =
        saving
            ? "Đang lưu..."
            : normalText;
}


function showMessage(
    containerId,
    message,
    error = false
) {
    const container =
        getElement(containerId);

    const element =
        document.createElement(
            "article"
        );

    element.className =
        error
            ? "reading-list-message reading-list-error"
            : "reading-list-message";

    element.textContent =
        message;

    container.replaceChildren(
        element
    );
}


function escapeHtml(value) {
    const element =
        document.createElement(
            "div"
        );

    element.textContent =
        String(value ?? "");

    return element.innerHTML;
}