(() => {
    "use strict";

    const SESSION_SIZE_KEY = "fubao_verb_session_size";
    const PAGE_SIZE = 500;

    let currentUser = null;
    let csvRows = [];
    let busy = false;
    let readingFile = false;
    let fileReadVersion = 0;

    const getElement = (id) => document.getElementById(id);

    document.addEventListener("DOMContentLoaded", initializePage);

    async function initializePage() {
        bindSettings();
        bindCsvEvents();

        try {
            const { data, error } =
                await supabaseClient.auth.getUser();

            if (error) throw error;

            if (!data?.user) {
                throw new Error("Bạn cần đăng nhập để học động từ.");
            }

            currentUser = data.user;
            await loadStatistics();
        } catch (error) {
            console.error(error);

            setPageMessage(
                error.message || "Không tải được dữ liệu.",
                true
            );
        }
    }

    // Số từ mỗi lượt
    function bindSettings() {
        const select = getElement("verbSessionSizeSelect");
        let saved = 10;

        try {
            saved = Number(localStorage.getItem(SESSION_SIZE_KEY));
        } catch (error) {
            console.warn("Không đọc được cài đặt:", error);
        }

        select.value = String(
            [5, 10, 20].includes(saved) ? saved : 10
        );

        updateStudyLinks();

        select.addEventListener("change", () => {
            try {
                localStorage.setItem(SESSION_SIZE_KEY, select.value);
            } catch (error) {
                console.warn("Không lưu được cài đặt:", error);
            }

            updateStudyLinks();
        });
    }

    function updateStudyLinks() {
        const size = getElement("verbSessionSizeSelect").value;

        getElement("newVerbModeLink").href =
            `verb-flashcard.html?mode=new&limit=${size}`;

        getElement("reviewVerbModeLink").href =
            `verb-flashcard.html?mode=review&limit=${size}`;
    }

    // Thống kê theo tài khoản đang đăng nhập
    async function loadStatistics() {
        const results = await Promise.all([
            supabaseClient
                .from("english_verbs")
                .select("id", { count: "exact", head: true }),

            supabaseClient
                .from("english_verb_progress")
                .select("verb_id", { count: "exact", head: true })
                .eq("user_id", currentUser.id)
                .eq("status", "known"),

            supabaseClient
                .from("english_verb_progress")
                .select("verb_id", { count: "exact", head: true })
                .eq("user_id", currentUser.id)
                .in("status", ["again", "learning"])
        ]);

        for (const result of results) {
            if (result.error) throw result.error;
        }

        const total = results[0].count || 0;

        getElement("totalVerbCount").textContent = total;
        getElement("knownVerbCount").textContent =
            results[1].count || 0;
        getElement("reviewVerbCount").textContent =
            results[2].count || 0;

        setPageMessage(
            total === 0
                ? "Chưa có động từ. Nhấn Import CSV để thêm."
                : ""
        );
    }

    function setPageMessage(message, isError = false) {
        const element = getElement("verbsPageMessage");
        element.textContent = message;
        element.classList.toggle("error", isError);
        element.hidden = !message;
    }

    // Mở và đóng bảng CSV
    function bindCsvEvents() {
        getElement("openVerbCsvButton")
            .addEventListener("click", openCsvModal);

        getElement("closeVerbCsvButton")
            .addEventListener("click", closeCsvModal);

        getElement("cancelVerbCsvButton")
            .addEventListener("click", closeCsvModal);

        getElement("verbCsvInput")
            .addEventListener("change", readCsvFile);

        getElement("verbCsvForm")
            .addEventListener("submit", importCsv);

        getElement("verbCsvModal")
            .addEventListener("click", (event) => {
                if (event.target === getElement("verbCsvModal")) {
                    closeCsvModal();
                }
            });

        document.addEventListener("keydown", (event) => {
            const modal = getElement("verbCsvModal");

            if (modal.hidden) return;

            if (event.key === "Escape") {
                closeCsvModal();
            }

            if (event.key === "Tab") {
                const controls = Array.from(
                    modal.querySelectorAll(
                        "button:not(:disabled), input:not(:disabled)"
                    )
                );

                if (controls.length === 0) {
                    event.preventDefault();
                    modal.querySelector(".verb-csv-panel").focus();
                    return;
                }

                const first = controls[0];
                const last = controls[controls.length - 1];

                if (
                    event.shiftKey &&
                    (
                        document.activeElement === first ||
                        !controls.includes(document.activeElement)
                    )
                ) {
                    event.preventDefault();
                    last.focus();
                } else if (
                    !event.shiftKey &&
                    (
                        document.activeElement === last ||
                        !controls.includes(document.activeElement)
                    )
                ) {
                    event.preventDefault();
                    first.focus();
                }
            }
        });
    }

    function openCsvModal() {
        csvRows = [];
        fileReadVersion += 1;
        readingFile = false;

        getElement("verbCsvForm").reset();
        getElement("verbCsvSelected").textContent = "Chưa chọn file.";
        setCsvMessage("");

        getElement("verbCsvModal").hidden = false;
        getElement("closeVerbCsvButton").focus();
    }

    function closeCsvModal() {
        if (busy) return;

        fileReadVersion += 1;
        readingFile = false;
        csvRows = [];

        getElement("verbCsvModal").hidden = true;
        getElement("openVerbCsvButton").focus();
    }

    function setCsvMessage(message, isError = false) {
        const element = getElement("verbCsvMessage");
        element.textContent = message;
        element.classList.toggle("error", isError);
    }

    // Đọc file được chọn
    async function readCsvFile(event) {
        const version = ++fileReadVersion;
        const file = event.target.files?.[0];

        csvRows = [];
        readingFile = false;
        setCsvMessage("");

        getElement("verbCsvSelected").textContent = "Chưa chọn file.";

        if (!file) return;

        if (!file.name.toLowerCase().endsWith(".csv")) {
            setCsvMessage("Vui lòng chọn file .csv.", true);
            return;
        }

        readingFile = true;
        getElement("verbCsvSelected").textContent = "Đang đọc file…";

        try {
            const text = await file.text();

            if (version !== fileReadVersion) return;

            if (text.includes("\uFFFD")) {
                throw new Error(
                    "File có ký tự lỗi. Hãy lưu CSV bằng UTF-8."
                );
            }

            const parsed = parseVerbRows(text);
            csvRows = parsed.rows;

            getElement("verbCsvSelected").textContent =
                `${file.name}: ${csvRows.length} động từ hợp lệ.`;

            setCsvMessage(
                parsed.duplicates > 0
                    ? `Đã bỏ qua ${parsed.duplicates} dòng trùng V1 trong file.`
                    : "File hợp lệ. Nhấn Thêm động từ để lưu."
            );
        } catch (error) {
            if (version !== fileReadVersion) return;

            csvRows = [];
            getElement("verbCsvSelected").textContent =
                "File chưa hợp lệ.";

            setCsvMessage(error.message, true);
        } finally {
            if (version === fileReadVersion) {
                readingFile = false;
            }
        }
    }

    // Bộ đọc CSV: hỗ trợ dấu phẩy, xuống dòng và ngoặc kép trong ô
    function parseCsv(text) {
        text = text.replace(/^\uFEFF/, "");

        const rows = [];
        let row = [];
        let value = "";
        let quoted = false;
        let closedQuote = false;

        function finishCell() {
            row.push(value);
            value = "";
            closedQuote = false;
        }

        function finishRow() {
            finishCell();

            if (row.some((cell) => cell.trim() !== "")) {
                rows.push(row);
            }

            row = [];
        }

        for (let i = 0; i < text.length; i += 1) {
            const character = text[i];

            if (quoted) {
                if (character === '"') {
                    if (text[i + 1] === '"') {
                        value += '"';
                        i += 1;
                    } else {
                        quoted = false;
                        closedQuote = true;
                    }
                } else {
                    value += character;
                }

                continue;
            }

            if (character === ",") {
                finishCell();
            } else if (character === "\n" || character === "\r") {
                finishRow();

                if (character === "\r" && text[i + 1] === "\n") {
                    i += 1;
                }
            } else if (closedQuote) {
                if (character !== " " && character !== "\t") {
                    throw new Error(
                        "CSV có ký tự không hợp lệ sau dấu ngoặc kép."
                    );
                }
            } else if (character === '"') {
                if (value !== "") {
                    throw new Error(
                        "CSV có dấu ngoặc kép nằm sai vị trí."
                    );
                }

                quoted = true;
            } else {
                value += character;
            }
        }

        if (quoted) {
            throw new Error("CSV có dấu ngoặc kép chưa đóng.");
        }

        finishRow();
        return rows;
    }

    function normalizeV1(value) {
        return String(value).trim().toLowerCase();
    }

    function parseVerbRows(text) {
        const table = parseCsv(text);

        if (table.length < 2) {
            throw new Error("CSV cần có dòng tiêu đề và dữ liệu.");
        }

        const headers = table[0].map(
            (header) => header.trim().toLowerCase()
        );

        const required = ["v1", "v2", "v3", "vietnamese"];

        for (const name of required) {
            if (headers.filter((header) => header === name).length !== 1) {
                throw new Error(
                    `CSV phải có đúng một cột "${name}".`
                );
            }
        }

        const indexes = Object.fromEntries(
            required.map((name) => [name, headers.indexOf(name)])
        );

        const seen = new Set();
        const rows = [];
        let duplicates = 0;

        for (let i = 1; i < table.length; i += 1) {
            const source = table[i];

            if (source.length !== headers.length) {
                throw new Error(
                    `Dòng dữ liệu ${i}: số ô không khớp tiêu đề. ` +
                    "Nếu nghĩa có dấu phẩy, hãy đặt cả ô trong ngoặc kép."
                );
            }

            const record = {};

            for (const name of required) {
                record[name] = source[indexes[name]].trim();

                if (!record[name]) {
                    throw new Error(
                        `Dòng dữ liệu ${i}: cột "${name}" đang trống.`
                    );
                }
            }

            const key = normalizeV1(record.v1);

            if (seen.has(key)) {
                duplicates += 1;
                continue;
            }

            seen.add(key);
            rows.push(record);
        }

        return { rows, duplicates };
    }

    // Đọc đủ danh sách V1, kể cả khi có hơn 1.000 động từ
    async function loadExistingVerbs() {
        const existing = new Set();

        for (let offset = 0; ; offset += PAGE_SIZE) {
            const { data, error } = await supabaseClient
                .from("english_verbs")
                .select("id,v1")
                .order("id")
                .range(offset, offset + PAGE_SIZE - 1);

            if (error) throw error;

            for (const verb of data || []) {
                existing.add(normalizeV1(verb.v1));
            }

            if (!data || data.length < PAGE_SIZE) break;
        }

        return existing;
    }

    function setImportBusy(value) {
        busy = value;

        for (const id of [
            "submitVerbCsvButton",
            "verbCsvInput",
            "closeVerbCsvButton",
            "cancelVerbCsvButton"
        ]) {
            getElement(id).disabled = value;
        }

        getElement("submitVerbCsvButton").textContent =
            value ? "Đang thêm…" : "Thêm động từ";

        if (value) {
            document.querySelector(".verb-csv-panel").focus();
        }
    }

    async function importCsv(event) {
        event.preventDefault();

        if (busy) return;

        if (!currentUser) {
            setCsvMessage("Bạn cần đăng nhập để thêm động từ.", true);
            return;
        }

        if (readingFile) {
            setCsvMessage("Đang đọc file, vui lòng đợi một chút.");
            return;
        }

        if (csvRows.length === 0) {
            setCsvMessage("Hãy chọn file CSV hợp lệ.", true);
            return;
        }

        const selectedRows = csvRows.slice();
        let inserted = 0;
        let skipped = 0;

        setImportBusy(true);
        setCsvMessage("Đang kiểm tra động từ đã có…");

        try {
            const existing = await loadExistingVerbs();

            const newRows = selectedRows.filter((row) => {
                if (existing.has(normalizeV1(row.v1))) {
                    skipped += 1;
                    return false;
                }

                return true;
            });

            for (let i = 0; i < newRows.length; i += 100) {
                const batch = newRows.slice(i, i + 100);

                const { error } = await supabaseClient
                    .from("english_verbs")
                    .insert(batch);

                if (error) throw error;

                inserted += batch.length;

                setCsvMessage(
                    `Đã lưu ${inserted}/${newRows.length} động từ mới…`
                );
            }

            csvRows = [];
            getElement("verbCsvInput").value = "";
            getElement("verbCsvSelected").textContent = "Đã xử lý file.";

            setCsvMessage(
                `Đã thêm ${inserted} động từ. ` +
                `Bỏ qua ${skipped} từ đã có cùng V1.`
            );
        } catch (error) {
            console.error(error);

            setCsvMessage(
                `Đã lưu ${inserted} động từ trước khi gặp lỗi: ` +
                `${error.message || "Không thể lưu dữ liệu."} ` +
                "Bạn có thể thử lại; các từ đã lưu sẽ được bỏ qua.",
                true
            );
        } finally {
            try {
                await loadStatistics();
            } catch (error) {
                setPageMessage(
                    "Chưa cập nhật được thống kê. Hãy tải lại trang.",
                    true
                );
            }

            setImportBusy(false);
        }
    }
})();