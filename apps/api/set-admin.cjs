const os = require('os');
const path = require('path');
const dbPath = path.join(os.homedir(), '.shiyu.db');
const db = require('better-sqlite3')(dbPath);

const email = 'shiyue2026@yeah.net';
const now = Date.now();

const existing = db.prepare("SELECT id FROM users WHERE email=?").get(email);
if (existing) {
    db.prepare("UPDATE users SET role='admin' WHERE email=?").run(email);
    console.log('Updated existing user to admin:', email);
} else {
    // Also delete the previous test admin to keep things clean
    db.prepare("DELETE FROM users WHERE email='admin@shiyu.com'").run();
    db.prepare("INSERT INTO users (id, email, nickname, role, email_verified, created_at, updated_at) VALUES (?, ?, ?, 'admin', 1, ?, ?)")
        .run('admin-shiyue', email, 'Admin', now, now);
    console.log('Created new admin user:', email);
}
db.close();
