const {
    default: makeWASocket,
    fetchLatestBaileysVersion,
    useMultiFileAuthState
} = require('@adiwajshing/baileys');
const fs = require('fs');
require('dotenv').config();

async function startPair() {
    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState('./session');

    const sock = makeWASocket({
        version,
        printQRInTerminal: true,
        auth: state
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection } = update;
        if (connection === 'open') {
            console.log('✅ WhatsApp connected!');

            const sessionFiles = fs.readdirSync('./session');
            let sessionData = {};
            sessionFiles.forEach(file => {
                const content = fs.readFileSync(`./session/${file}`, 'utf8');
                sessionData[file] = content;
            });

            // Send session automatically to OWNER_NUMBER from .env
            const owner = process.env.OWNER_NUMBER;
            if(owner) {
                await sock.sendMessage(`${owner}@s.whatsapp.net`, {
                    text: '📌 Your session files:\n\n' + JSON.stringify(sessionData, null, 2)
                });
                console.log('📌 Session sent to OWNER_NUMBER automatically!');
            } else {
                console.log('⚠️ OWNER_NUMBER not set in .env. Cannot send session.');
            }
        }
    });
}

startPair();
