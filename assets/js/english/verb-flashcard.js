(() => {
    "use strict";

    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode") === "review" ? "review" : "new";
    const requestedLimit = Number(params.get("limit"));
    const sessionLimit = [5, 10, 20].includes(requestedLimit)
        ? requestedLimit
        : 10;

    const PAGE_SIZE = 500;
    const getElement = (id) => document.getElementById(id);

    let user = null;
    let queue = [];
    let currentIndex = 0;
    let flipped = false;
    let saving = false;

    const progressById = new Map();
    const repeatedIds = new Set();

    const results = {
        again: 0,
        learning: 0,
        known: 0
    };

    document.addEventListener("DOMContentLoaded", initialize);

    window.addEventListener("pagehide", stopSpeech);

    async function initialize() {
        bindEvents();

        getElement("verbStudyTitle").textContent =
            mode === "review" ? "Ôn động từ" : "Học động từ mới";

        try {
            const { data, error } =
                await supabaseClient.auth.getUser();

            if (error) throw error;

            if (!data?.user) {
                throw new Error("Bạn cần đăng nhập để học động từ.");
            }

            user = data.user;

            const [verbs, progress] = await Promise.all([
                loadAllVerbs(),
                loadAllProgress()
            ]);

            for (const item of progress) {
                progressById.set(item.verb_id, item);
            }

            const eligible = verbs.filter((verb) => {
                const saved = progressById.get(verb.id);

                if (mode === "new") {
                    return !saved;
                }

                return saved &&
                    ["again", "learning"].includes(saved.status);
            });

            shuffle(eligible);
            queue = eligible.slice(0, sessionLimit);

            setMessage("");

            if (queue.length === 0) {
                showEmptyState();
                return;
            }

            getElement("verbStudySession").hidden = false;
            renderCard();
        } catch (error) {
            console.error("Không tải được động từ:", error);

            setMessage(
                error.message || "Không tải được dữ liệu. Hãy tải lại trang.",
                true
            );
        }
    }

    async function loadAllVerbs() {
        const rows = [];

        for (let offset = 0; ; offset += PAGE_SIZE) {
            const { data, error } = await supabaseClient
                .from("english_verbs")
                .select("id,v1,v2,v3,vietnamese")
                .order("id")
                .range(offset, offset + PAGE_SIZE - 1);

            if (error) throw error;

            rows.push(...(data || []));

            if (!data || data.length < PAGE_SIZE) break;
        }

        return rows;
    }

    async function loadAllProgress() {
        const rows = [];

        for (let offset = 0; ; offset += PAGE_SIZE) {
            const { data, error } = await supabaseClient
                .from("english_verb_progress")
                .select("verb_id,status,review_count,last_reviewed_at")
                .eq("user_id", user.id)
                .order("verb_id")
                .range(offset, offset + PAGE_SIZE - 1);

            if (error) throw error;

            rows.push(...(data || []));

            if (!data || data.length < PAGE_SIZE) break;
        }

        return rows;
    }

    function shuffle(items) {
        for (let i = items.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
        }
    }

    function bindEvents() {
        getElement("flipVerbButton").addEventListener("click", flipCard);

        // Chạm vào nội dung thẻ cũng lật được.
        getElement("verbStudyCard").addEventListener("click", (event) => {
            if (event.target.closest("button, a")) return;
            flipCard();
        });

        document.querySelectorAll("[data-speak-form]").forEach((button) => {
            button.addEventListener("click", () => {
                speakForm(button.dataset.speakForm);
            });
        });

        document.querySelectorAll("[data-verb-result]").forEach((button) => {
            button.addEventListener("click", () => {
                saveAnswer(button.dataset.verbResult);
            });
        });
    }

    function renderCard() {
        stopSpeech();

        const verb = queue[currentIndex];

        getElement("verbFrontV1").textContent = verb.v1;
        getElement("verbFrontMeaning").textContent = verb.vietnamese;

        getElement("verbBackV1").textContent = verb.v1;
        getElement("verbBackV2").textContent = verb.v2;
        getElement("verbBackV3").textContent = verb.v3;
        getElement("verbBackMeaning").textContent = verb.vietnamese;

        getElement("verbStudyCounter").textContent =
            `${currentIndex + 1} / ${queue.length}`;

        const progress = getElement("verbStudyProgress");
        progress.max = queue.length;
        progress.value = currentIndex;

        flipped = false;
        updateFaces();
    }

    function flipCard() {
        if (saving || !queue[currentIndex]) return;

        flipped = !flipped;
        updateFaces();

        getElement("flipVerbButton").focus();
    }

    function updateFaces() {
        getElement("verbFrontFace").hidden = flipped;
        getElement("verbBackFace").hidden = !flipped;
        getElement("verbAnswerActions").hidden = !flipped;

        const button = getElement("flipVerbButton");

        button.textContent = flipped
            ? "Xem lại V1 và nghĩa"
            : "Xem V2 và V3";

        button.setAttribute("aria-expanded", String(flipped));
    }

    function stopSpeech() {
        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }
    }

    function speakForm(form) {
        const verb = queue[currentIndex];

        if (!verb || saving || !["v1", "v2", "v3"].includes(form)) {
            return;
        }

        if (!("speechSynthesis" in window)) {
            setMessage("Thiết bị này chưa hỗ trợ đọc phát âm.", true);
            return;
        }

        stopSpeech();

        // Ví dụ learned/learnt: đọc lần lượt hai dạng.
        const text = verb[form].split("/").join(", ");
        const utterance = new SpeechSynthesisUtterance(text);

        utterance.lang = "en-US";
        utterance.rate = 0.8;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onerror = (event) => {
            if (["canceled", "interrupted"].includes(event.error)) return;

            setMessage(
                "Chưa phát âm được. Bạn thử nhấn nút nghe lại nhé.",
                true
            );
        };

        window.speechSynthesis.speak(utterance);
    }

    function setSaving(value) {
        saving = value;

        document.querySelectorAll(
            "[data-verb-result], [data-speak-form], #flipVerbButton"
        ).forEach((button) => {
            button.disabled = value;
        });

        getElement("verbStudySession")
            .setAttribute("aria-busy", String(value));
    }

    async function saveAnswer(status) {
        if (
            saving ||
            !flipped ||
            !user ||
            !Object.prototype.hasOwnProperty.call(results, status)
        ) {
            return;
        }

        const verb = queue[currentIndex];
        if (!verb) return;

        stopSpeech();
        setSaving(true);
        setMessage("Đang lưu…");

        let advanced = false;

        try {
            // Đọc lại tiến độ trước khi cập nhật.
            const { data: previous, error: readError } =
                await supabaseClient
                    .from("english_verb_progress")
                    .select("review_count")
                    .eq("user_id", user.id)
                    .eq("verb_id", verb.id)
                    .maybeSingle();

            if (readError) throw readError;

            const record = {
                user_id: user.id,
                verb_id: verb.id,
                status,
                review_count: (Number(previous?.review_count) || 0) + 1,
                last_reviewed_at: new Date().toISOString()
            };

            const { error } = await supabaseClient
                .from("english_verb_progress")
                .upsert(record, {
                    onConflict: "user_id,verb_id"
                });

            if (error) throw error;

            progressById.set(verb.id, record);
            results[status] += 1;

            // Chưa nhớ: cho gặp lại một lần ở cuối lượt.
            if (status === "again" && !repeatedIds.has(verb.id)) {
                repeatedIds.add(verb.id);
                queue.push(verb);
            }

            currentIndex += 1;
            advanced = true;
            setMessage("");

            if (currentIndex >= queue.length) {
                showResults();
            } else {
                renderCard();
            }
        } catch (error) {
            console.error("Không lưu được tiến độ:", error);

            setMessage(
                error.message ||
                    "Không lưu được tiến độ. Hãy nhấn đánh giá lại.",
                true
            );
        } finally {
            setSaving(false);

            if (advanced) {
                if (currentIndex < queue.length) {
                    getElement("flipVerbButton").focus();
                } else {
                    getElement("verbStudyResult")
                        .querySelector("a").focus();
                }
            }
        }
    }

    function showResults() {
        stopSpeech();

        getElement("verbStudySession").hidden = true;
        getElement("verbStudyResult").hidden = false;

        getElement("verbAgainCount").textContent = results.again;
        getElement("verbLearningCount").textContent = results.learning;
        getElement("verbKnownCount").textContent = results.known;

        const uniqueCount = new Set(queue.map((verb) => verb.id)).size;

        getElement("verbResultSummary").textContent =
            `Bạn đã học ${uniqueCount} động từ với ` +
            `${currentIndex} lượt đánh giá, tính cả lượt ôn lại.`;
    }

    function showEmptyState() {
        getElement("verbEmptyState").hidden = false;

        getElement("verbEmptyTitle").textContent =
            mode === "new"
                ? "Không còn động từ mới"
                : "Chưa có động từ cần ôn";

        getElement("verbEmptyDescription").textContent =
            mode === "new"
                ? "Bạn có thể thêm động từ bằng CSV hoặc chuyển sang Ôn tập."
                : "Hãy học từ mới. Những từ Chưa nhớ và Hơi nhớ sẽ xuất hiện ở đây.";
    }

    function setMessage(message, isError = false) {
        const element = getElement("verbStudyMessage");

        element.textContent = message;
        element.classList.toggle("error", isError);
        element.hidden = !message;
    }
})();