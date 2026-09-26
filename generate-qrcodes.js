// generate-qrcodes.js
// توليد عدد N من المشاركين + QR Code فريد لكل واحد
// الاستعمال:  node generate-qrcodes.js 100 http://192.168.1.10:3000
//   100  -> عدد المشاركين
//   العنوان الثاني -> رابط السيرفر (على شبكة الـ WiFi المحلية، مش localhost، باش الهاتف يقدر يوصلولو)

const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const COUNT = parseInt(process.argv[2] || '20', 10);
const BASE_URL = process.argv[3] || 'http://localhost:3000';

const outDir = path.join(__dirname, 'qrcodes');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const insert = db.prepare(
  'INSERT INTO participants (uuid, label) VALUES (?, ?)'
);

const csvRows = ['index,uuid,url'];

(async () => {
  for (let i = 1; i <= COUNT; i++) {
    const uuid = uuidv4();
    const label = `مشارك ${i}`;
    insert.run(uuid, label);

    const url = `${BASE_URL}/participant.html?uid=${uuid}`;
    const filePath = path.join(outDir, `participant_${i}.png`);
    await QRCode.toFile(filePath, url, { width: 400, margin: 2 });

    csvRows.push(`${i},${uuid},${url}`);
    console.log(`✔ تم توليد QR للمشارك ${i} -> ${filePath}`);
  }

  fs.writeFileSync(path.join(outDir, 'mapping.csv'), csvRows.join('\n'));
  console.log(`\nتم توليد ${COUNT} مشارك بنجاح.`);
  console.log(`الصور موجودة في: ${outDir}`);
  console.log(`جدول المطابقة (للتنظيم الداخلي فقط): ${path.join(outDir, 'mapping.csv')}`);
})();
