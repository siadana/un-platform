// db.js
// قاعدة بيانات SQLite محلية بالكامل (ملف واحد، بلا سيرفر منفصل، بلا XAMPP)
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data', 'platform.db'));

db.pragma('journal_mode = WAL');

// جدول المشاركين: كل مشارك معرّف بـ UUID فريد فقط (بلا إيمايل، بلا رقم إجباري)
db.exec(`
CREATE TABLE IF NOT EXISTS participants (
  uuid TEXT PRIMARY KEY,
  label TEXT,                  -- تسمية اختيارية (مثال: "مشارك رقم 12") بلا معلومات شخصية
  whatsapp_number TEXT,        -- اختياري: يُضاف فقط إذا المشارك حب يستلم تذكيرات
  checked_in INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_uuid TEXT NOT NULL,
  answers_json TEXT NOT NULL,
  submitted_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (participant_uuid) REFERENCES participants(uuid)
);
`);

module.exports = db;
