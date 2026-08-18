const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const FILE = path.join(__dirname, "../data/suggestions.json");

function ensureFile() {
    if (!fs.existsSync(path.dirname(FILE))) {
        fs.mkdirSync(path.dirname(FILE), { recursive: true });
    }
    
    // Check if file doesn't exist OR if it is empty (0 bytes)
    if (!fs.existsSync(FILE) || fs.readFileSync(FILE, "utf8").trim() === "") {
        fs.writeFileSync(
            FILE,
            JSON.stringify({ suggestions: [] }, null, 4)
        );
    }   
}

function load() {
    ensureFile();
    try {
        const content = fs.readFileSync(FILE, "utf8");
        return JSON.parse(content);
    } catch (err) {
        // If JSON is corrupted, reset it cleanly
        const defaultData = { suggestions: [] };
        save(defaultData);
        return defaultData;
    }
}

function save(data) {
    ensureFile();
    fs.writeFileSync(FILE, JSON.stringify(data, null, 4));
}

function generateId() {
    return crypto.randomBytes(6).toString("hex");
}

function create(data) {
    const db = load();

    const suggestion = {
        id: generateId(),
        status: "pending",
        createdAt: Date.now(),
        reviewedAt: null,
        reviewedBy: null,
        denialReason: null,
        ...data,
    };

    db.suggestions.push(suggestion);
    save(db);

    return suggestion;
}

function get(id) {
    return load().suggestions.find(s => s.id === id) ?? null;
}

function getByThread(threadId) {
    return load().suggestions.find(s => s.threadId === threadId) ?? null;
}

function update(id, updates) {
    const db = load();
    const suggestion = db.suggestions.find(s => s.id === id);
    if (!suggestion) return null;

    Object.assign(suggestion, updates);
    save(db);
    
    return suggestion;
}

function remove(id) {
    const db = load();

    db.suggestions = db.suggestions.filter(s => s.id !== id);
    save(db);
}

function all() {
    return load().suggestions;
}

function getByMessage(messageId) {
    return load().suggestions.find(s => s.messageId === messageId) ?? null;
}

module.exports = {
    create,
    get,
    getByThread,
    getByMessage,
    update,
    remove,
    all,
};