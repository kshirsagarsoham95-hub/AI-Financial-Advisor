// ==========================================================================
// FINADVISOR AI - DATABASE HUB & INTERACTIVE EXPLORER
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    // Theme initialization
    const savedTheme = localStorage.getItem("finadvisor_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);

    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            const current = document.documentElement.getAttribute("data-theme") || "dark";
            const next = current === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", next);
            localStorage.setItem("finadvisor_theme", next);
            updateThemePill(next);
        });
        updateThemePill(savedTheme);
    }

    function updateThemePill(theme) {
        const btns = document.querySelectorAll(".theme-toggle-btn");
        btns.forEach(btn => {
            btn.classList.toggle("active", btn.getAttribute("data-theme") === theme);
        });
    }

    // User session info
    async function loadUserSession() {
        try {
            const res = await fetch("/api/me");
            if (res.status === 401) {
                window.location.href = "/";
                return;
            }
            if (res.ok) {
                const data = await res.json();
                if (data.role !== "admin") {
                    alert("Access Denied: Administrator privileges required to access the Database Hub.");
                    window.location.href = "/input.html";
                    return;
                }
                const display = document.getElementById("userEmailDisplay");
                const avatar = document.getElementById("userAvatar");
                if (display && data.email) display.textContent = `${data.email} (Admin)`;
                if (avatar) avatar.textContent = "👑";
            }
        } catch (e) {
            console.warn("Session fetch error:", e);
        }
    }
    loadUserSession();

    // State
    let currentTable = "users";
    let cachedRows = [];

    // DOM Elements
    const statEngine = document.getElementById("statEngine");
    const statFileSize = document.getElementById("statFileSize");
    const statUsers = document.getElementById("statUsers");
    const statAssessments = document.getElementById("statAssessments");
    const statLogs = document.getElementById("statLogs");

    const badgeUsers = document.getElementById("badgeUsers");
    const badgeAssessments = document.getElementById("badgeAssessments");
    const badgeLogs = document.getElementById("badgeLogs");

    const tableHead = document.getElementById("tableHead");
    const tableBody = document.getElementById("tableBody");
    const filterInput = document.getElementById("filterInput");
    const btnRefreshDb = document.getElementById("btnRefreshDb");

    const sqlInput = document.getElementById("sqlInput");
    const btnRunQuery = document.getElementById("btnRunQuery");
    const queryTimer = document.getElementById("queryTimer");
    const queryResultContainer = document.getElementById("queryResultContainer");
    const querySummary = document.getElementById("querySummary");
    const queryResultHead = document.getElementById("queryResultHead");
    const queryResultBody = document.getElementById("queryResultBody");

    // Load Database Telemetry Stats
    async function loadDatabaseStats() {
        try {
            const res = await fetch("/api/database/stats");
            if (!res.ok) return;
            const { stats } = await res.json();

            if (statEngine) statEngine.textContent = stats.engine.split(" ")[0] + " " + stats.engine.split(" ")[1];
            if (statFileSize) statFileSize.textContent = stats.fileSize;

            const uTable = stats.tables.find(t => t.name === "users");
            const aTable = stats.tables.find(t => t.name === "assessments");
            const lTable = stats.tables.find(t => t.name === "activity_logs");

            if (uTable) {
                statUsers.textContent = uTable.rowCount;
                badgeUsers.textContent = uTable.rowCount;
            }
            if (aTable) {
                statAssessments.textContent = aTable.rowCount;
                badgeAssessments.textContent = aTable.rowCount;
            }
            if (lTable) {
                statLogs.textContent = lTable.rowCount;
                badgeLogs.textContent = lTable.rowCount;
            }
        } catch (e) {
            console.error("Stats load error:", e);
        }
    }

    // Load Table Data
    async function loadTable(tableName) {
        currentTable = tableName;
        tableHead.innerHTML = `<tr><th>Loading ${tableName}...</th></tr>`;
        tableBody.innerHTML = `<tr><td>Fetching rows from SQLite...</td></tr>`;

        try {
            const res = await fetch(`/api/database/table/${tableName}`);
            if (!res.ok) throw new Error("Failed to load table data");
            const data = await res.json();

            cachedRows = data.rows || [];
            renderTable(data.columns || [], cachedRows);
        } catch (e) {
            tableHead.innerHTML = `<tr><th>Error</th></tr>`;
            tableBody.innerHTML = `<tr><td style="color: #fb7185;">${e.message}</td></tr>`;
        }
    }

    // Render Table Helper
    function renderTable(columns, rows) {
        if (!columns || columns.length === 0) {
            tableHead.innerHTML = `<tr><th>Notice</th></tr>`;
            tableBody.innerHTML = `<tr><td style="color: var(--text-muted);">No records found in this table yet.</td></tr>`;
            return;
        }

        // Render Head
        tableHead.innerHTML = `<tr>${columns.map(col => `<th>${col.replace(/_/g, " ")}</th>`).join("")}</tr>`;

        // Render Rows
        if (!rows || rows.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="${columns.length}" style="text-align: center; color: var(--text-muted); padding: 24px;">No records match your filter criteria.</td></tr>`;
            return;
        }

        tableBody.innerHTML = rows.map(row => {
            return `<tr>${columns.map(col => {
                const val = row[col];
                return `<td>${formatCellValue(col, val)}</td>`;
            }).join("")}</tr>`;
        }).join("");
    }

    // Cell formatting helper
    function formatCellValue(col, val) {
        if (val === null || val === undefined) return '<span style="color: var(--text-muted);">&mdash;</span>';

        if (col === "created_at" && typeof val === "string") {
            try {
                const d = new Date(val);
                return `<span style="font-family: 'JetBrains Mono', monospace; font-size: 11.5px; color: var(--text-secondary);">${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>`;
            } catch (e) {
                return val;
            }
        }

        if (col === "financial_health_score") {
            return `<span class="db-badge-score">${val}/100</span>`;
        }

        if (col === "action") {
            return `<span class="db-badge-action">${val}</span>`;
        }

        if (col.startsWith("monthly_") || col === "total_savings") {
            return `<span style="font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #5ce1e6;">₹${Number(val).toLocaleString("en-IN")}</span>`;
        }

        if (col === "id" || col === "password_hash" || col === "salt") {
            return `<span class="db-code-cell">${val}</span>`;
        }

        if (typeof val === "object") {
            return `<span class="db-code-cell">${JSON.stringify(val)}</span>`;
        }

        return String(val);
    }

    // Filter Input
    if (filterInput) {
        filterInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                const columns = cachedRows.length > 0 ? Object.keys(cachedRows[0]) : [];
                renderTable(columns, cachedRows);
                return;
            }

            const filtered = cachedRows.filter(row => {
                return Object.values(row).some(val => {
                    return String(val).toLowerCase().includes(query);
                });
            });

            const columns = cachedRows.length > 0 ? Object.keys(cachedRows[0]) : [];
            renderTable(columns, filtered);
        });
    }

    // Tab Switching
    document.querySelectorAll(".db-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".db-tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            if (filterInput) filterInput.value = "";
            loadTable(btn.getAttribute("data-table"));
        });
    });

    // Refresh Button
    if (btnRefreshDb) {
        btnRefreshDb.addEventListener("click", () => {
            loadDatabaseStats();
            loadTable(currentTable);
        });
    }

    // Preset SQL Buttons
    document.querySelectorAll(".db-preset-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const sql = btn.getAttribute("data-sql");
            if (sqlInput && sql) {
                sqlInput.value = sql;
                executeSqlQuery();
            }
        });
    });

    // Run SQL Query
    async function executeSqlQuery() {
        const query = (sqlInput ? sqlInput.value : "").trim();
        if (!query) return;

        queryTimer.textContent = "Executing...";
        btnRunQuery.disabled = true;
        const startTime = performance.now();

        try {
            const res = await fetch("/api/database/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query })
            });

            const duration = (performance.now() - startTime).toFixed(1);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Query failed");
            }

            queryTimer.textContent = `⏱ Execution Time: ${duration}ms`;
            querySummary.textContent = `Result: ${data.rowCount} row(s) returned (${duration}ms)`;
            queryResultContainer.style.display = "block";

            // Render Result
            if (data.columns && data.columns.length > 0) {
                queryResultHead.innerHTML = `<tr>${data.columns.map(c => `<th>${c}</th>`).join("")}</tr>`;
                if (data.rows.length === 0) {
                    queryResultBody.innerHTML = `<tr><td colspan="${data.columns.length}" style="text-align: center; color: var(--text-muted); padding: 18px;">Query returned 0 rows.</td></tr>`;
                } else {
                    queryResultBody.innerHTML = data.rows.map(row => {
                        return `<tr>${data.columns.map(c => `<td>${formatCellValue(c, row[c])}</td>`).join("")}</tr>`;
                    }).join("");
                }
            } else {
                queryResultHead.innerHTML = `<tr><th>Status</th></tr>`;
                queryResultBody.innerHTML = `<tr><td style="color: #34d399;">Query completed successfully (0 columns returned).</td></tr>`;
            }

            // Also refresh stats since query might have logged an activity event
            loadDatabaseStats();

        } catch (err) {
            queryTimer.textContent = "Error";
            querySummary.textContent = `SQL Error: ${err.message}`;
            querySummary.style.color = "#fb7185";
            queryResultContainer.style.display = "block";
            queryResultHead.innerHTML = `<tr><th>Error Message</th></tr>`;
            queryResultBody.innerHTML = `<tr><td style="color: #fb7185;">${err.message}</td></tr>`;
        } finally {
            btnRunQuery.disabled = false;
        }
    }

    if (btnRunQuery) {
        btnRunQuery.addEventListener("click", executeSqlQuery);
    }

    // Initial Load
    loadDatabaseStats();
    loadTable("users");
});
