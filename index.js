const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ['Kubo', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered) {
        const phone = process.env.PHONE_NUMBER || '255671703688';
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(phone);
                console.log('PAIRING CODE:', code);
                console.log('Weka hii code kwenye WhatsApp > Linked Devices > Link with phone number');
            } catch (e) {
                console.log('Pairing failed:', e.message);
            }
        }, 3000);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed, reconnecting:', shouldReconnect);
            if (shouldReconnect) start();
        } else if (connection === 'open') {
            console.log('Kubo Bot Imeunganishwa! ✅');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        if (text.toLowerCase() === '.ping') {
            await sock.sendMessage(from, { text: 'Pong! Kubo Bot iko online ✅' });
        }
        if (text.toLowerCase() === '.menu' || text.toLowerCase() === 'menu') {
            await sock.sendMessage(from, { text: '🤖 *KUBO BOT MENU*\n\n.ping - Angalia kama bot iko online\n.menu - Onyesha menu hii' });
        }
    });
}

start();
