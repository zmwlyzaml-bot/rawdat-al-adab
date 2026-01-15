const express = require('express');
const axios = require('axios');
const path = require('path');
const requestIp = require('request-ip');
const NodeCache = require('node-cache');

const app = express();
const port = process.env.PORT || 3000;

const cache = new NodeCache({ stdTTL: 3600 });
let visitors = new Set();

app.use(requestIp.mw());
app.use(express.static(path.join(__dirname)));

const CHANNELS = ['Rawwda', 'QQ_Y8I', 'gazl30', 'for47sev'];

async function fetchTexts() {
    // نصوص أدبية افتراضية لضمان عمل الموقع فوراً
    return [
        "وَمَا كُنْتُ مِمَّنْ يَدْخُلُ الْعِشْقُ قَلْبَهُ وَلَكِنَّ مَنْ يُبْصِرْ جُفُونَكِ يَعْشَقِ.",
        "أُعلِّلُ النَّفْسَ بالآمالِ أرقُبُها، ما أَضْيَقَ العَيْشَ لولا فُسْحَةُ الأَمَلِ.",
        "وإذا أتتك مذمتي من ناقص، فهي الشهادة لي بأني كامل.",
        "على قدر أهل العزم تأتي العزائم، وتأتي على قدر الكرام المكارم.",
        "الخَيْلُ وَاللّيْلُ وَالبَيْداءُ تَعرِفُني، وَالسّيْفُ وَالرّمحُ وَالقِرْطاسُ وَالقَلَمُ.",
        "أنا الذي نظر الأعمى إلى أدبي، وأسمعت كلماتي من به صمم."
    ];
}

app.get('/api/texts', async (req, res) => {
    let texts = cache.get("texts");
    if (!texts) {
        texts = await fetchTexts();
        cache.set("texts", texts);
    }
    res.json(texts);
});

app.get('/api/visit', (req, res) => {
    const clientIp = req.clientIp;
    if (clientIp && clientIp !== '::1' && clientIp !== '127.0.0.1') {
        visitors.add(clientIp);
    }
    res.json({ count: Math.max(visitors.size, 1) });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
