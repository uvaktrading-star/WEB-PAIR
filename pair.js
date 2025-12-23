const express = require('express');
const fs = require('fs');
const path = require('path'); // path module එක එකතු කළා
const { exec } = require("child_process");
let router = express.Router();
const pino = require("pino");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    jidNormalizedUser
} = require("@whiskeysockets/baileys");
const { upload } = require('./mega');

// Folder එක මකාදැමීමේදී Error එකක් ආවොත් නතර නොවීමට හදල තියෙන්නේ
function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    let num = req.query.number;

    async function DanuwaPair() {
        // --- 🛠️ මෙන්න මෙතනයි වැදගත්ම වෙනස ---
        // 'session' folder එක නැත්නම් මුලින්ම ඒක හදනවා.
        const sessionDir = path.join(__dirname, '../session'); 
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }

        // Auth state එකට folder එකේ path එක ලබා දෙනවා.
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        // ---------------------------------------

        try {
            let DanuwaPairWeb = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS("Safari"),
            });

            if (!DanuwaPairWeb.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await DanuwaPairWeb.requestPairingCode(num);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            DanuwaPairWeb.ev.on('creds.update', saveCreds);
            DanuwaPairWeb.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;
                if (connection === "open") {
                    try {
                        await delay(10000);
                        
                        // Path එක dynamic ලෙස ලබාගැනීම
                        const credsPath = path.join(sessionDir, 'creds.json');
                        if (!fs.existsSync(credsPath)) throw new Error("creds.json not found!");

                        function randomMegaId(length = 6, numberLength = 4) {
                            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                            let result = '';
                            for (let i = 0; i < length; i++) {
                                result += characters.charAt(Math.floor(Math.random() * characters.length));
                            }
                            const number = Math.floor(Math.random() * Math.pow(10, numberLength));
                            return `${result}${number}`;
                        }

                        const mega_url = await upload(fs.createReadStream(credsPath), `${randomMegaId()}.json`);
                        const string_session = mega_url.replace('https://mega.nz/file/', '');
                        const sid = string_session;

                        const user_jid = jidNormalizedUser(DanuwaPairWeb.user.id);
                        await DanuwaPairWeb.sendMessage(user_jid, { text: sid });

                    } catch (e) {
                        console.log("Error in sending session: " + e);
                        exec('pm2 restart danuwa');
                    }

                    await delay(5000);
                    removeFile(sessionDir);
                    process.exit(0);
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode !== 401) {
                    await delay(10000);
                    DanuwaPair();
                }
            });
        } catch (err) {
            console.log("Error in DanuwaPair: " + err);
            removeFile(sessionDir);
            if (!res.headersSent) {
                await res.send({ code: "Service Unavailable" });
            }
        }
    }
    return await DanuwaPair();
});

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
    // Render එකේදී pm2 restart එකක් අවශ්‍ය නැහැ, Render එකම auto restart කරනවා.
});

module.exports = router;
