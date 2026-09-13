(() => {
    "use strict";

    const PAGE_SIZE = 500;
    const requestedFilter =
        new URLSearchParams(window.location.search).get("filter");

    const filter = ["all", "known", "review"].includes(requestedFilter)
        ? requestedFilter
        : "all";

    const titles = {
        all: "Tất cả động từ",
        known: "Đã nhớ",
        review: "Cần ôn"
    };

    const statusLabels = {
        new: "Chưa học",
        again: "Chưa nhớ",
        learning: "Hơi nhớ",
        known: "Đã nhớ"
    };

    let selectedVerbs = [];

    const element = (id) => document.getElementById(id);

    document.addEventListener("DOMContentLoaded", initialize);

    async function initialize() {
        element("verbListTitle").textContent = titles[filter];
        document.title = `${titles[filter]} | FuBao`;

        document.querySelectorAll("[data-filter]").forEach((link) => {
            if (link.dataset.filter === filter) {
                link.setAttribute("aria-current", "page");
            }
        });

        element("verbSearch").addEventListener("input", renderList);

        try {
            const { data, error } = await supabaseClient.auth.getUser();

            if (error) throw error;

            if (!data?.user) {
                throw new Error("Bạn cần đăng nhập để xem danh sách.");
            }

            const [verbs, progress] = await Promise.all([
                loadRows(() => supabaseClient
                    .from("english_verbs")
                    .select("id,v1,v2,v3,vietnamese")
                    .order("id")),

                loadRows(() => supabaseClient
                    .from("english_verb_progress")
                    .select("verb_id,status")
                    .eq("user_id", data.user.id)
                    .order("verb_id"))
            ]);

            const progressById = new Map(
                progress.map((row) => [row.verb_id, row.status])
            );

            selectedVerbs = verbs
                .map((verb) => ({
                    ...verb,
                    status: progressById.get(verb.id) || "new"
                }))
                .filter((verb) => {
                    if (filter === "known") {
                        return verb.status === "known";
                    }

                    if (filter === "review") {
                        return ["again", "learning"].includes(verb.status);
                    }

                    return true;
                })
                .sort((a, b) => a.v1.localeCompare(b.v1, "en"));

            element("verbSearch").disabled = false;
            renderList();
        } catch (error) {
            console.error(error);
            element("verbListMessage").classList.add("error");
            element("verbListMessage").textContent =
                "Không tải được danh sách: " +
                (error.message || "Hãy thử tải lại trang.");
        }
    }

    async function loadRows(createQuery) {
        const rows = [];

        for (let offset = 0; ; offset += PAGE_SIZE) {
            const { data, error } = await createQuery()
                .range(offset, offset + PAGE_SIZE - 1);

            if (error) throw error;

            const page = data || [];
            rows.push(...page);

            if (page.length < PAGE_SIZE) break;
        }

        return rows;
    }

    function normalize(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .trim();
    }

    function renderList() {
        const keyword = normalize(element("verbSearch").value);

        const visible = selectedVerbs.filter((verb) =>
            [verb.v1, verb.v2, verb.v3, verb.vietnamese]
                .some((value) => normalize(value).includes(keyword))
        );

        const container = element("verbListContainer");
        container.replaceChildren();

        const message = element("verbListMessage");
        message.classList.remove("error");

        if (visible.length === 0) {
            message.textContent = keyword
                ? "Không tìm thấy động từ phù hợp."
                : filter === "known"
                    ? "Bạn chưa có động từ nào được đánh dấu Đã nhớ."
                    : filter === "review"
                        ? "Hiện chưa có động từ cần ôn."
                        : "Chưa có động từ. Hãy quay lại để import CSV.";
            return;
        }

        message.textContent = keyword
            ? `Tìm thấy ${visible.length}/${selectedVerbs.length} động từ.`
            : `${visible.length} động từ.`;

        const fragment = document.createDocumentFragment();

        for (const verb of visible) {
            const card = document.createElement("article");
            card.className = "verb-list-card";

            const forms = document.createElement("div");
            forms.className = "verb-list-forms";

            for (const key of ["v1", "v2", "v3"]) {
                const column = document.createElement("div");
                const label = document.createElement("small");
                const value = document.createElement("strong");

                label.textContent = key.toUpperCase();
                value.textContent = verb[key];

                column.append(label, value);
                forms.append(column);
            }

            const meaning = document.createElement("p");
            meaning.className = "verb-list-meaning";
            meaning.textContent = verb.vietnamese;

            const status = document.createElement("span");
            status.className = "verb-list-status";
            status.dataset.status = verb.status;
            status.textContent = statusLabels[verb.status] || "Chưa học";

            card.append(forms, meaning, status);
            fragment.append(card);
        }

        container.append(fragment);
    }
})();