// server.js
const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- API ----------

// جلب معلومات مشارك عبر UUID (بلا إيمايل ولا رقم)
app.get('/api/participant/:uuid', (req, res) => {
  const { uuid } = req.params;
  const participant = db
    .prepare('SELECT * FROM participants WHERE uuid = ?')
    .get(uuid);

  if (!participant) {
    return res.status(404).json({ error: 'QR غير صالح أو غير معروف' });
  }

  const existingResponse = db
    .prepare('SELECT id FROM responses WHERE participant_uuid = ?')
    .get(uuid);

  res.json({
    uuid: participant.uuid,
    label: participant.label,
    checked_in: !!participant.checked_in,
    already_responded: !!existingResponse,
  });
});

// تسجيل إجابات الاستبيان
app.post('/api/participant/:uuid/submit', (req, res) => {
  const { uuid } = req.params;
  const { answers } = req.body;

  const participant = db
    .prepare('SELECT * FROM participants WHERE uuid = ?')
    .get(uuid);
  if (!participant) {
    return res.status(404).json({ error: 'QR غير صالح' });
  }
  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'بيانات الاستبيان ناقصة' });
  }

  db.prepare(
    'INSERT INTO responses (participant_uuid, answers_json) VALUES (?, ?)'
  ).run(uuid, JSON.stringify(answers));

  res.json({ success: true, message: 'تم تسجيل إجاباتك، شكراً لمشاركتك!' });
});

// تسجيل حضور (check-in) عبر مسح موظف المنظمة لـ QR المشارك
app.post('/api/participant/:uuid/checkin', (req, res) => {
  const { uuid } = req.params;
  const result = db
    .prepare('UPDATE participants SET checked_in = 1 WHERE uuid = ?')
    .run(uuid);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'QR غير معروف' });
  }
  res.json({ success: true, message: 'تم تسجيل الحضور' });
});

// (اختياري) ربط رقم واتساب بمشارك موجود، لو حب يستلم تذكيرات
app.post('/api/participant/:uuid/link-whatsapp', (req, res) => {
  const { uuid } = req.params;
  const { whatsapp_number } = req.body;

  const result = db
    .prepare('UPDATE participants SET whatsapp_number = ? WHERE uuid = ?')
    .run(whatsapp_number, uuid);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'QR غير معروف' });
  }
  res.json({ success: true });
});

// لوحة إدارية بسيطة: عدد المشاركين + الإجابات + الحضور
app.get('/api/admin/stats', (req, res) => {
  const totalParticipants = db
    .prepare('SELECT COUNT(*) c FROM participants')
    .get().c;
  const totalResponses = db.prepare('SELECT COUNT(*) c FROM responses').get()
    .c;
  const totalCheckedIn = db
    .prepare('SELECT COUNT(*) c FROM participants WHERE checked_in = 1')
    .get().c;

  res.json({ totalParticipants, totalResponses, totalCheckedIn });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✔ السيرفر شغال على المنفذ ${PORT}`);
  console.log(`  محلياً:      http://localhost:${PORT}`);
  console.log(`  على الشبكة:  http://<عنوان-IP-متاعك>:${PORT}  (باش الهواتف توصل)`);
});
