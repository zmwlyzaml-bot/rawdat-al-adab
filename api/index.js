const path = require('path');
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const NodeCache = require('node-cache');
const requestIp = require('request-ip');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const cache = new NodeCache({ stdTTL: 3600 });
const visitors = new Set();

app.use(cors());
app.use(express.json());
app.use(requestIp.mw());

// خدمة الملفات من المجلد الرئيسي مباشرة
app.use(express.static(__dirname));

const CHANNELS = ['Rawwda', 'QQ_Y8I', 'gazl30', 'for47sev'];

function cleanText(text) {
    if (!text) return null;
    const hasUrl = /https?:\/\/[^\s]+/.test(text);
    const hasHandle = /@[a-zA-Z0-9_]+/.test(text);
    const hasSocialKeywords = /تواصل معنا|تليجرام|واتساب|انستقرام|تويتر|تابعنا|للمزيد|Telegram|WhatsApp|Instagram|X/i.test(text);
    if (hasUrl || hasHandle || hasSocialKeywords) return null;
    let cleaned = text.replace(/[0-9٠-٩]/g, '');
    cleaned = cleaned.replace(/[^\u0600-\u06FF\s\p{Emoji}\u200B-\u200D\uFEFF]/gu, '');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    if (cleaned.length < 5) return null;
    return cleaned;
}

async function fetchTelegramTexts() {
    const cachedData = cache.get('texts');
    if (cachedData) return cachedData;
    let allTexts = new Set();
    for (const channel of CHANNELS) {
        try {
            const response = await axios.get(`https://t.me/s/${channel}`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
            });
            const html = response.data;
            const messages = html.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/g);
            if (messages) {
                messages.forEach(msg => {
                    let text = msg.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
                    let cleaned = cleanText(text);
                    if (cleaned) allTexts.add(cleaned);
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

app.get('/api/texts', async (req, res) => {
    const texts = await fetchTelegramTexts();
    res.json(texts);
});

app.get('/api/visit', (req, res) => {
    const clientIp = req.clientIp;
    const isLocal = clientIp === '::1' || clientIp === '127.0.0.1' || clientIp.includes('192.168.');
    if (!isLocal) visitors.add(clientIp);
    res.json({ count: visitors.size });
});

// خدمة index.html لأي مسار آخر
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
