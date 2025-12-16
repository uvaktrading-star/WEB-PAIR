const express = require('express');
const app = express();
const path = require('path'); // Path module එක භාවිතා කිරීම වඩාත් නිවැරදියි
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 8000;
let codeRouter = require('./pair'); // pair.js route file එක
require('events').EventEmitter.defaultMaxListeners = 500;

// 1. **BODY PARSER** මුලින්ම භාවිතා කරන්න
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 2. '/code' route එකට pair.js router එක යොදන්න (Session Logic)
// ⚠️ ඔබගේ pair.html form එකේ action="/code" විය යුතුය.
app.use('/code', codeRouter); 

// 3. Root route එකෙන් pair.html (Form එක) Serve කරන්න
app.use('/', async (req, res, next) => {
    // __path වෙනුවට path.join භාවිතා කිරීම ආරක්ෂිතයි
    res.sendFile(path.join(process.cwd(), 'pair.html')) 
});

app.listen(PORT, () => {
    console.log(`⏩ Server running on http://localhost:${PORT}`)
})

module.exports = app;
