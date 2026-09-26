// whatsapp-bot.js
// شات بوت واتساب مجاني (whatsapp-web.js) - بلا Meta Business API
//
// طريقتان للربط بحساب واتساب:
//  1) مسح QR Code يظهر في التيرمينال (الافتراضي)
//  2) "Pairing Code" - كود مكوّن من 8 خانات تدخله يدوياً في تطبيق واتساب
//     (Settings > Linked Devices > Link with phone number)
//     هذي الطريقة أفضل إذا السيرفر بلا شاشة أو تحب تربط بسرعة بلا سكان
//
// الاستعمال:
//   node whatsapp-bot.js                → يعرض QR في التيرمينال
//   node whatsapp-bot.js --pair +21612345678 → يولّد Pairing Code لهذا الرقم

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const db = require('./db');

const pairArgIndex = process.argv.indexOf('--pair');
const pairNumber = pairArgIndex !== -1 ? process.argv[pairArgIndex + 1] : null;

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './data/wa-session' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

// --- طريقة 1: QR في التيرمينال (لو ما طلبناش pairing code) ---
client.on('qr', (qr) => {
  if (!pairNumber) {
    console.log('امسح هذا الـ QR بواتساب (Linked Devices):');
    qrcodeTerminal.generate(qr, { small: true });
  }
});

// --- طريقة 2: Pairing Code (كود بدل QR) ---
client.on('ready_for_pairing', async () => {
  if (pairNumber) {
    const code = await client.requestPairingCode(pairNumber.replace(/\D/g, ''));
    console.log(`\n🔑 كود الربط (Pairing Code): ${code}`);
    console.log('افتح واتساب > الأجهزة المرتبطة > ربط جهاز > ربط برقم الهاتف، وأدخل هذا الكود.\n');
  }
});

client.on('ready', () => {
  console.log('✔ شات بوت واتساب متصل وجاهز!');
});

client.on('authenticated', () => {
  console.log('✔ تم التوثيق بنجاح، جاري الاتصال...');
});

client.on('auth_failure', (msg) => {
  console.error('✘ فشل التوثيق:', msg);
});

// --- الردود التلقائية (FAQ بسيط) ---
const FAQ = {
  'الاستبيان': 'يمكنك ملء الاستبيان عبر مسح QR Code الذي استلمته عند التسجيل 📋',
  'الموعد': 'الفعالية تبدأ الساعة 9 صباحاً. نتشرف بحضورك! 🕘',
  'المكان': 'العنوان سيُرسل لكم قريباً عبر هذه القناة 📍',
};

client.on('message', async (msg) => {
  const text = msg.body.trim();

  // رد تلقائي بحسب كلمات مفتاحية
  const matchKey = Object.keys(FAQ).find((k) => text.includes(k));
  if (matchKey) {
    await msg.reply(FAQ[matchKey]);
    return;
  }

  if (text.toLowerCase() === 'مساعدة' || text.toLowerCase() === 'help') {
    await msg.reply(
      'أهلاً بك! يمكنك سؤالي عن: "الاستبيان"، "الموعد"، "المكان". أو تواصل مع فريق التنظيم.'
    );
  }
});

// دالة مساعدة: إرسال تذكير لكل من ربط رقمه (تُستدعى يدوياً أو عبر سكريبت خارجي)
async function sendReminders(messageText) {
  const numbers = db
    .prepare('SELECT whatsapp_number FROM participants WHERE whatsapp_number IS NOT NULL')
    .all();

  for (const row of numbers) {
    const chatId = row.whatsapp_number.replace(/\D/g, '') + '@c.us';
    try {
      await client.sendMessage(chatId, messageText);
      console.log(`✔ أُرسلت رسالة إلى ${row.whatsapp_number}`);
    } catch (err) {
      console.error(`✘ فشل الإرسال إلى ${row.whatsapp_number}:`, err.message);
    }
    // فاصل زمني بسيط لتفادي أي حظر من واتساب (سلوك يشبه الإنسان)
    await new Promise((r) => setTimeout(r, 2000));
  }
}

client.initialize();

module.exports = { client, sendReminders };
