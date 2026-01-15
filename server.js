const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

const texts = [
    "وَمَا كُنْتُ مِمَّنْ يَدْخُلُ الْعِشْقُ قَلْبَهُ وَلَكِنَّ مَنْ يُبْصِرْ جُفُونَكِ يَعْشَقِ.",
    "أُعلِّلُ النَّفْسَ بالآمالِ أرقُبُها، ما أَضْيَقَ العَيْشَ لولا فُسْحَةُ الأَمَلِ.",
    "وإذا أتتك مذمتي من ناقص، فهي الشهادة لي بأني كامل.",
    "على قدر أهل العزم تأتي العزائم، وتأتي على قدر الكرام المكارم."
];

app.use(express.static(__dirname));

app.get('/api/texts', (req, res) => {
    res.json(texts);
});

app.get('/api/visit', (req, res) => {
    res.json({ count: 124 });
});

// استخدام regex بدلاً من النجمة لتجنب خطأ الإصدار الجديد
app.get(/^(?!\/api).+/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
