const path = require('path');
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const NodeCache = require('node-cache');
const requestIp = require('request-ip');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// إعدادات التخزين المؤقت (Cache) لمدة ساعة
const cache = new NodeCache({ stdTTL: 3600 });

// تخزين الزوار في الذاكرة
const visitors = new Set();

app.use(cors());
app.use(express.json());
app.use(requestIp.mw());
app.use(express.static(path.join(__dirname, 'public')));

// إضافة مسار افتراضي لخدمة index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// قنوات تليجرام المطلوبة
const CHANNELS = ['Rawwda', 'QQ_Y8I', 'gazl30', 'for47sev'];

/**
 * دالة لتنظيف وتصفية النصوص بناءً على القواعد الصارمة
 */
function cleanText(text) {
    if (!text) return null;

    // 1. تجاهل النصوص التي تحتوي على روابط أو معرفات تواصل اجتماعي
    const hasUrl = /https?:\/\/[^\s]+/.test(text);
    const hasHandle = /@[a-zA-Z0-9_]+/.test(text);
    const hasSocialKeywords = /تواصل معنا|تليجرام|واتساب|انستقرام|تويتر|تابعنا|للمزيد|Telegram|WhatsApp|Instagram|X/i.test(text);
    
    if (hasUrl || hasHandle || hasSocialKeywords) return null;

    // 2. إزالة الأرقام (العربية والإنجليزية)
    let cleaned = text.replace(/[0-9٠-٩]/g, '');

    // 3. إزالة الرموز الزخرفية والعشوائية (مع الحفاظ على الإيموجي والحروف العربية)
    // نحافظ على الحروف العربية، المسافات، علامات الترقيم الأساسية، والإيموجي
    cleaned = cleaned.replace(/[^\u0600-\u06FF\s\p{Emoji}\u200B-\u200D\uFEFF]/gu, '');

    // 4. إزالة المسافات الزائدة
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    if (cleaned.length < 5) return null; // تجاهل النصوص القصيرة جداً بعد التنظيف

    return cleaned;
}

/**
 * جلب المنشورات من تليجرام باستخدام Bot API
 * ملاحظة: يتطلب توكن بوت تليجرام
 */
async function fetchTelegramTexts() {
    const cachedData = cache.get('texts');
    if (cachedData) return cachedData;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
        console.error('Telegram Bot Token is missing!');
        return [];
    }

    let allTexts = new Set();

    for (const channel of CHANNELS) {
        try {
            // ملاحظة: تليجرام بوت API لا يوفر طريقة مباشرة لجلب "آخر المنشورات" من قناة عامة بسهولة دون معرفة الـ message_id
            // ولكن يمكن استخدام getUpdates إذا كان البوت عضواً، أو استخدام طرق أخرى.
            // هنا سنفترض استخدام آلية جلب الرسائل (في بيئة الإنتاج يفضل استخدام مكتبة مثل GramJS أو التفاعل مع API مخصص)
            // للتبسيط ولأن المطلوب Bot API، سنحاول جلب الرسائل إذا تم توجيهها للبوت أو عبر webhook
            // ولكن بما أن القنوات عامة، سنستخدم واجهة الويب العامة لتليجرام كبديل لجلب البيانات إذا لم يتوفر الـ API
            
            // استخدام Bot API إذا توفر التوكن، وإلا استخدام الويب كبديل
            if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE') {
                // ملاحظة: جلب الرسائل من قناة يتطلب استخدام getChatHistory (غير متوفر في Bot API العادي)
                // لذا سنعتمد على الويب كطريقة أساسية لجلب البيانات من القنوات العامة
            }
            
            const response = await axios.get(`https://t.me/s/${channel}`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
            });
            const html = response.data;
            
            // استخراج النصوص من HTML مع مراعاة بنية تليجرام ويب
            const messages = html.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/g);
            
            if (messages) {
                messages.forEach(msg => {
                    // تنظيف الوسوم البرمجية والروابط داخل النص
                    let text = msg.replace(/<br\s*\/?>/gi, '\n') // تحويل <br> لسطر جديد
                                 .replace(/<[^>]*>/g, '') // إزالة باقي الوسوم
                                 .replace(/&quot;/g, '"')
                                 .replace(/&amp;/g, '&')
                                 .replace(/&lt;/g, '<')
                                 .replace(/&gt;/g, '>')
                                 .trim();
                    
                    let cleaned = cleanText(text);
                    if (cleaned) {
                        allTexts.add(cleaned);
                    }
                });
            }
        } catch (error) {
            console.error(`Error fetching from ${channel}:`, error.message);
        }
    }

    const result = Array.from(allTexts);
    cache.set('texts', result);
    return result;
}

// Endpoints

// 1. جلب النصوص المنظفة
app.get('/api/texts', async (req, res) => {
    const texts = await fetchTelegramTexts();
    res.json(texts);
});

// 2. عداد الزوار الحقيقي
app.get('/api/visit', (req, res) => {
    const clientIp = req.clientIp;

    // تجاهل localhost والـ IP الخاص بالمطور (يمكن تخصيصه)
    const isLocal = clientIp === '::1' || clientIp === '127.0.0.1' || clientIp.includes('192.168.');
    
    if (!isLocal) {
        visitors.add(clientIp);
    }

    res.json({ count: visitors.size });
});

// تشغيل السيرفر
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
