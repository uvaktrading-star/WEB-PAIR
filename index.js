const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require("body-parser");

// Port එක Render එකෙන් දෙන එක ගන්නවා, නැත්නම් 8000 ගන්නවා
const PORT = process.env.PORT || 8000;

// 1. Middleware සැකසුම්
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// static files (css, js, images) තිබේ නම් ඒවා පෙන්වීමට
app.use(express.static(path.join(__dirname, 'public')));

// 2. Pair.js Router එක ලින්ක් කිරීම
// ⚠️ මතක ඇතුව ඔයාගේ pair.html එකේ form action එක "/code" විය යුතුයි.
let codeRouter = require('./pair'); 
app.use('/code', codeRouter);

// 3. Root Route - මුලින්ම පෙන්වන පිටුව (pair.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pair.html'));
});

// 4. සර්වර් එක ආරම්භ කිරීම
app.listen(PORT, () => {
    console.log(`
🚀 ZANTA-MD Web Pair Is Running!
🌐 URL: http://localhost:${PORT}
📅 Date: ${new Date().toLocaleString()}
    `);
});

// EventEmitter සීමාව වැඩි කිරීම (Baileys සඳහා වැදගත්)
require('events').EventEmitter.defaultMaxListeners = 500;

module.exports = app;
