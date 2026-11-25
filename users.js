const crypto = require("crypto");
const db = require("./db");

function hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
}

function findUserByEmail(email) {
    if (!email) return null;
    const user = db.getUserByEmail(email);
    if (!user) return null;
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || "client",
        salt: user.salt,
        hash: user.password_hash,
        createdAt: user.created_at
    };
}

function createUser({ name, email, password }) {
    if (!email || !password) {
        throw new Error("Email and password are required.");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
        throw new Error("Please enter a valid email address.");
    }

    if (password.length < 6) {
        throw new Error("Password must be at least 6 characters long.");
    }

    const existing = findUserByEmail(normalizedEmail);
    if (existing) {
        throw new Error("An account with this email already exists. Please sign in.");
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const hash = hashPassword(password, salt);

    const newUser = {
        id: "usr_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        name: (name && name.trim()) || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        salt,
        hash
    };

    const inserted = db.insertUser(newUser);

    return {
        id: inserted.id,
        name: inserted.name,
        email: inserted.email,
        createdAt: inserted.created_at
    };
}

function authenticateUser(email, password) {
    if (!email || !password) return null;
    const user = findUserByEmail(email);
    if (!user) return null;

    const hash = hashPassword(password, user.salt);
    if (hash === user.hash) {
        db.logActivity(user.email, "USER_LOGIN", `Successful login as ${user.role || 'client'}`);
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role || "client"
        };
    } else {
        db.logActivity(email, "LOGIN_FAILED", "Invalid password attempt");
    }
    return null;
}

function getAllUsers() {
    return db.getAllUsers();
}

module.exports = {
    findUserByEmail,
    createUser,
    authenticateUser,
    getAllUsers
};
