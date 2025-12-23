const express = require('express');
const fs = require('fs');
const path = require('path');
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

// තාවකාලික Folder එක මකාදැමීම
function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    let num = req.query.number;
    if (!num) return res.send({ error: "Number is required" });

    // සෑම User කෙනෙකුටම අද්විතීය (Unique) Folder එකක් සෑදීම
    const uniqueSessionDir = path.join(__dirname, `../temp_session_${Date.now()}`);
    
    async function DanuwaPair() {
        if (!fs.existsSync(uniqueSessionDir)) {
            fs.mkdirSync(uniqueSessionDir, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(uniqueSessionDir);

        try {
            let DanuwaPairWeb = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                // වඩාත් ස්ථායී Browser එකක් භාවිතා කිරීම
                browser: Browsers.macOS("Chrome"), 
            });

            if (!DanuwaPairWeb.authState.creds.registered) {
                await delay(3000); // Delay එක වැඩි කළා pairing request එක හරියට යන්න
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
                        await delay(5000); // Creds සේව් වෙන්න කාලය ලබාදීම
                        const credsPath = path.join(uniqueSessionDir, 'creds.json');
                        
                        if (fs.existsSync(credsPath)) {
                            // Mega එකට Upload කිරීම
                            function randomMegaId(length = 6) {
                                return Math.random().toString(36).substring(2, 2 + length).toUpperCase();
                            }

                            const mega_url = await upload(fs.createReadStream(credsPath), `ZANTA_${randomMegaId()}.json`);
                            const string_session = mega_url.replace('https://mega.nz/file/', '');
                            
                            const user_jid = jidNormalizedUser(DanuwaPairWeb.user.id);
                            await DanuwaPairWeb.sendMessage(user_jid, { text: string_session });
                            
                            console.log(`Session generated for: ${num}`);
                        }
                    } catch (e) {
                        console.error("Upload Error:", e);
                    }

                    await delay(2000);
                    removeFile(uniqueSessionDir);
                    // මෙතන process.exit දාන්න එපා, එතකොට Render එකම Off වෙනවා. 
                    // ඒ වෙනුවට connection එක close කරන්න.
                    DanuwaPairWeb.logout(); 
                    DanuwaPairWeb.end();
                } 
                
                if (connection === "close") {
                    let reason = lastDisconnect?.error?.output?.statusCode;
                    if (reason !== 401) {
                        // අවශ්‍ය නම් නැවත උත්සාහ කරන්න
                    } else {
                        removeFile(uniqueSessionDir);
                    }
                }
            });

        } catch (err) {
            console.error("Critical Error:", err);
            removeFile(uniqueSessionDir);
            if (!res.headersSent) {
                res.send({ code: "Service Unavailable" });
            }
        }
    }

    DanuwaPair();
});

module.exports = router;
