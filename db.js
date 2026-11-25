const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "financial_advisor.db");

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize SQLite database instance
const db = new DatabaseSync(DB_PATH);

// Initialize schema and migrate any existing data
function initDatabase() {
    db.exec(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            role TEXT DEFAULT 'client',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS assessments (
            id TEXT PRIMARY KEY,
            user_email TEXT NOT NULL,
            monthly_income REAL NOT NULL,
            monthly_expenses REAL NOT NULL,
            total_savings REAL NOT NULL,
            primary_goal TEXT,
            risk_tolerance TEXT,
            financial_health_score INTEGER,
            analysis_json TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT,
            action TEXT NOT NULL,
            details TEXT,
            created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_assessments_email ON assessments(user_email);
        CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);
    `);

    // Ensure role column exists on users table (for existing DB migration)
    try {
        db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'client';");
    } catch (e) {
        // Column already exists, safe to continue
    }

    // Check if demo client exists, seed if not
    const crypto = require("crypto");
    const demoUser = db.prepare("SELECT * FROM users WHERE email = ?").get("client@finadvisor.ai");
    if (!demoUser) {
        const demoSalt = crypto.randomBytes(16).toString("hex");
        const demoHash = crypto.pbkdf2Sync("password123", demoSalt, 10000, 64, "sha512").toString("hex");
        
        db.prepare(`
            INSERT INTO users (id, name, email, password_hash, salt, role, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run("usr_demo", "Demo Client", "client@finadvisor.ai", demoHash, demoSalt, "client", new Date().toISOString());

        logActivity("client@finadvisor.ai", "SYSTEM_SEED", "Seeded default demo client account");
    }

    // Check if admin user exists, seed if not
    const adminUser = db.prepare("SELECT * FROM users WHERE email = ?").get("admin@finadvisor.ai");
    if (!adminUser) {
        const adminSalt = crypto.randomBytes(16).toString("hex");
        const adminHash = crypto.pbkdf2Sync("admin123", adminSalt, 10000, 64, "sha512").toString("hex");
        
        db.prepare(`
            INSERT INTO users (id, name, email, password_hash, salt, role, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run("usr_admin", "Chief Administrator", "admin@finadvisor.ai", adminHash, adminSalt, "admin", new Date().toISOString());

        logActivity("admin@finadvisor.ai", "SYSTEM_SEED", "Seeded default administrator account");
    } else if (adminUser.role !== "admin") {
        db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run("admin@finadvisor.ai");
    }

    // Migrate any legacy users from users.json if present
    const usersJsonPath = path.join(DATA_DIR, "users.json");
    if (fs.existsSync(usersJsonPath)) {
        try {
            const raw = fs.readFileSync(usersJsonPath, "utf8");
            const legacyUsers = JSON.parse(raw);
            if (Array.isArray(legacyUsers)) {
                const insertStmt = db.prepare(`
                    INSERT OR IGNORE INTO users (id, name, email, password_hash, salt, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                `);
                for (const u of legacyUsers) {
                    if (u.email && u.salt && (u.hash || u.password_hash)) {
                        insertStmt.run(
                            u.id || ("usr_" + Date.now()),
                            u.name || u.email.split("@")[0],
                            u.email.toLowerCase(),
                            u.hash || u.password_hash,
                            u.salt,
                            u.createdAt || u.created_at || new Date().toISOString()
                        );
                    }
                }
            }
        } catch (e) {
            console.error("Notice: Could not parse legacy users.json for migration:", e.message);
        }
    }
}

// System logging helper
function logActivity(userEmail, action, details = "") {
    try {
        const stmt = db.prepare(`
            INSERT INTO activity_logs (user_email, action, details, created_at)
            VALUES (?, ?, ?, ?)
        `);
        stmt.run(userEmail || "anonymous", action, typeof details === "object" ? JSON.stringify(details) : String(details), new Date().toISOString());
    } catch (e) {
        console.error("Database logActivity error:", e.message);
    }
}

// User operations
function getUserByEmail(email) {
    if (!email) return null;
    const stmt = db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)");
    return stmt.get(email.trim());
}

function insertUser({ id, name, email, salt, hash, role = "client" }) {
    const stmt = db.prepare(`
        INSERT INTO users (id, name, email, password_hash, salt, role, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const createdAt = new Date().toISOString();
    stmt.run(id, name, email.toLowerCase().trim(), hash, salt, role, createdAt);
    logActivity(email, "USER_REGISTERED", `New user created account (${role}): ${name}`);
    return { id, name, email, role, created_at: createdAt };
}

function getAllUsers(maskSensitive = true) {
    const users = db.prepare("SELECT id, name, email, role, password_hash, salt, created_at FROM users ORDER BY created_at DESC").all();
    if (maskSensitive) {
        return users.map(u => ({
            ...u,
            password_hash: "pbkdf2:••••••••[sha512]",
            salt: "salt:••••[16b]"
        }));
    }
    return users;
}

// Assessment operations
function saveAssessment({ userEmail, metrics, analysis }) {
    const id = "asm_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const createdAt = new Date().toISOString();
    const income = Number(metrics.income || 0);
    const expenses = Number(metrics.totalExpenses || (Number(metrics.rent || 0) + Number(metrics.food || 0) + Number(metrics.discretionary || 0) + Number(metrics.otherDebt || 0)));
    const savings = Number(metrics.savings || 0);
    const goal = metrics.primaryGoal || analysis.corePhilosophy || "General Wealth Building";
    const risk = metrics.riskTolerance || "Moderate";
    const healthScore = analysis.financialHealthScore ? Number(analysis.financialHealthScore.score) : 75;

    const stmt = db.prepare(`
        INSERT INTO assessments (
            id, user_email, monthly_income, monthly_expenses, total_savings,
            primary_goal, risk_tolerance, financial_health_score, analysis_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
        id,
        userEmail || "client@finadvisor.ai",
        income,
        expenses,
        savings,
        goal,
        risk,
        healthScore,
        JSON.stringify({ metrics, analysis }),
        createdAt
    );

    logActivity(userEmail, "ASSESSMENT_GENERATED", `Generated AI wealth plan with Health Score: ${healthScore}/100`);

    return { id, createdAt, healthScore };
}

function getAllAssessments(limit = 50) {
    return db.prepare(`
        SELECT id, user_email, monthly_income, monthly_expenses, total_savings,
               primary_goal, risk_tolerance, financial_health_score, created_at
        FROM assessments
        ORDER BY created_at DESC
        LIMIT ?
    `).all(limit);
}

function getActivityLogs(limit = 50) {
    return db.prepare(`
        SELECT id, user_email, action, details, created_at
        FROM activity_logs
        ORDER BY id DESC
        LIMIT ?
    `).all(limit);
}

// Database stats & live introspection
function getDatabaseStats() {
    let fileSize = 0;
    try {
        const stats = fs.statSync(DB_PATH);
        fileSize = (stats.size / 1024).toFixed(2) + " KB";
    } catch (e) {
        fileSize = "N/A";
    }

    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
    const assessmentCount = db.prepare("SELECT COUNT(*) as count FROM assessments").get().count;
    const logCount = db.prepare("SELECT COUNT(*) as count FROM activity_logs").get().count;

    return {
        engine: "SQLite 3 (Embedded Relational DB)",
        filePath: "data/financial_advisor.db",
        fileSize,
        tables: [
            { name: "users", description: "Registered client profiles & secure credentials", rowCount: userCount },
            { name: "assessments", description: "Comprehensive AI wealth assessments & telemetry", rowCount: assessmentCount },
            { name: "activity_logs", description: "Real-time audit events, logins & actions", rowCount: logCount }
        ],
        totalRecords: userCount + assessmentCount + logCount
    };
}

// Safe SQL query executor for the UI console (read-only queries)
function executeSafeQuery(rawSql) {
    if (!rawSql || typeof rawSql !== "string") {
        throw new Error("Query string is required.");
    }

    const trimmed = rawSql.trim();
    // Allow SELECT and PRAGMA only (read-only for security)
    if (!/^(SELECT|PRAGMA|EXPLAIN)\s+/i.test(trimmed)) {
        throw new Error("Only read-only queries (SELECT) are permitted in the interactive database explorer.");
    }

    const rows = db.prepare(trimmed).all();
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    // Mask password_hash if selecting users
    const sanitizedRows = rows.map(r => {
        const copy = { ...r };
        if (copy.password_hash) copy.password_hash = "pbkdf2:••••••••[sha512]";
        if (copy.salt) copy.salt = "salt:••••[16b]";
        return copy;
    });

    return {
        columns,
        rowCount: sanitizedRows.length,
        rows: sanitizedRows
    };
}

// Initialize on require
initDatabase();

module.exports = {
    db,
    DB_PATH,
    logActivity,
    getUserByEmail,
    insertUser,
    getAllUsers,
    saveAssessment,
    getAllAssessments,
    getActivityLogs,
    getDatabaseStats,
    executeSafeQuery
};
