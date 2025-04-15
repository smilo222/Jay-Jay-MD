/*

€ Creator: king Richie 🗿
€ Base: Tama Ryuichi

*/

console.clear();
require('./settings/config');

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateMessageID,
    downloadContentFromMessage,
    makeCacheableSignalKeyStore,
    makeInMemoryStore,
    jidDecode,
    proto,
    getAggregateVotesInPollMessage,
    PHONENUMBER_MCC
} = require("@whiskeysockets/baileys");

const chalk = require('chalk');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const FileType = require('file-type');
const readline = require("readline");
const PhoneNumber = require('awesome-phonenumber');
const path = require('path');
const NodeCache = require("node-cache");
const axios = require("axios")
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetchJson, sleep } = require('./system/storage.js');
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid, addExif } = require('./system/exif.js');
const usePairingCode = true; // true pairing / false QR

const question = (text) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(text, resolve);
    });
};

//===================
async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState("./session");
    const rich = makeWASocket({
        printQRInTerminal: !usePairingCode,
        syncFullHistory: true,
        markOnlineOnConnect: true,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000,
        generateHighQualityLinkPreview: true,
        patchMessageBeforeSending: (message) => {
            const requiresPatch = !!(
                message.buttonsMessage ||
                message.templateMessage ||
                message.listMessage
            );
            if (requiresPatch) {
                message = {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadataVersion: 2,
                                deviceListMetadata: {},
                            },
                            ...message,
                        },
                    },
                };
            }

            return message;
        },
        version: (await (await fetch('https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Defaults/baileys-version.json')).json()).version,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        logger: pino({
            level: 'silent' // Set 'fatal' for production
        }),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino().child({
                level: 'silent',
                stream: 'store'
            })),
        }
    });

        
    if (!rich.authState.creds.registered) {
        const phoneNumber = await question(console.log("Please Input Your Number For jay jay md Example : 27xxxxxxxxx"));
        const code = await rich.requestPairingCode(phoneNumber.trim());
        console.log("This Your Pairing Code:");
        console.log(`${code}`);
    }

    const store = makeInMemoryStore({
        logger: pino().child({
            level: 'silent',
            stream: 'store'
        })
    });

    store.bind(rich.ev);

    //===================
    rich.ev.on('call', async (caller) => {
        console.log("INCOMING CALL");
    });

    rich.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return decode.user && decode.server && decode.user + '@' + decode.server || jid;
        } else return jid;
    };
 ///=================================//
 rich.ev.on('group-participants.update', async (update) => {
        const groupMetadata = await rich.groupMetadata(update.id);
        const groupName = groupMetadata.subject;
        const botNumber = rich.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata.participants.some(p => p.id === botNumber && p.admin);
        if (!isBotAdmin) return;

        for (let participant of update.participants) {
            let profilePic = "";
            try {
                profilePic = await rich.profilePictureUrl(participant, 'image');
            } catch (e) {
                profilePic = "https://files.catbox.moe/erru2b.jpg";
            }
            const memberCount = groupMetadata.participants.length;
            if (update.action === 'add') {
                const welcomeMessage = {
                    text: `\`\`\`WELCOME MESSAGE BY AKANE MD\`\`\`\nWelcome dear @${participant.split('@')[0]}, to  ${groupName}! YOU ARE THE ${memberCount}th member.`,
                    contextInfo: {
                        mentionedJid: [participant],
                        externalAdReply: {
                            showAdAttribution: true,
                            title: `JAY JAY-MD`,
                            body: `BY JAY`,
                            previewType: "PHOTO",
                            thumbnailUrl: profilePic,
                            sourceUrl: "t.me/Hmmletts"
                        }
                    }
                };
                await rich.sendMessage(update.id, welcomeMessage);
            } else if (update.action === 'remove') {
                const goodbyeMessage = {
                    text: `\`\`\`GOOD BYE MESSAGE BY AKANE MD\`\`\`@${participant.split('@')[0]}. leaving ${groupName}\n [ *members update* ] ${memberCount} remaining`,
                    contextInfo: {
                        mentionedJid: [participant],
                        externalAdReply: {
                            showAdAttribution: true,
                            title: `JSY JAY-MD`,
                            body: `BY JAY`,
                            previewType: "PHOTO",
                            thumbnailUrl: profilePic,
                            sourceUrl: "t.me/Hmmletts"
                        }
                    }
                };
                await rich.sendMessage(update.id, goodbyeMessage);
            }
        }
    });
    
rich.ev.on('messages.update', async (chatUpdate) => {
try {
    for(const { key, update } of chatUpdate) {
     let forpollup = chatUpdate[0].update.pollUpdates
       //console.log(forpollup)
        if(forpollup) {
            // Payload key
            const pollCreation = await getMessage(key);
               //console.log(pollCreation)
            // Jika itu dari bot Gumdramon            
            if(pollCreation && key.fromMe) {
                const pollUpdate = await getAggregateVotesInPollMessage({
                    message: pollCreation,
                    pollUpdates: forpollup,
                });
               // console.log(pollUpdate)
                var toCmd = pollUpdate.filter(v => v.voters.length !== 0)[0]?.name;
                if (toCmd == undefined) {
                    return
                } else {
                    var prefCmd = "." + toCmd;
                    await rich.appenTextMessage(prefCmd, chatUpdate);
                    //auto delet poll update
                       rich.sendMessage(key.remoteJid,
			    {
			        delete: {
			            remoteJid: key.remoteJid,
			            fromMe: true,
			            id: key.id,
			            participant: key.participant
			        }
			    })
			    
                }
            }
        }
    }
    } catch(e) {
    console.log(e)
    }
    })
    
    rich.ev.on('messages.upsert', async chatUpdate => {
        try {
            mek = chatUpdate.messages[0];
            if (!mek.message) return;
            mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;
            if (mek.key && mek.key.remoteJid === 'status@broadcast') return;
            if (!rich.public && !mek.key.fromMe && chatUpdate.type === 'notify') return;
            if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return;
            let m = smsg(rich, mek, store);
            require("./menu/case")(rich, m, chatUpdate, store);
        } catch (error) {
            console.error("Error processing message upsert:", error);
        }
    });

    rich.getFile = async (PATH, save) => {
        let res;
        let data = Buffer.isBuffer(PATH) ? PATH : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await getBuffer(PATH)) : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0);
        let type = await FileType.fromBuffer(data) || { mime: 'application/octet-stream', ext: '.bin' };
        filename = path.join(__filename, '../' + new Date * 1 + '.' + type.ext);
        if (data && save) fs.promises.writeFile(filename, data);
        return { res, filename, size: await getSizeMedia(data), ...type, data };
    };

    rich.downloadMediaMessage = async (message) => {
        let mime = (message.msg || message).mimetype || '';
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
        const stream = await downloadContentFromMessage(message, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    };

    rich.sendText = (jid, text, quoted = '', options) => rich.sendMessage(jid, { text, ...options }, { quoted });

    rich.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
        let buffer = options && (options.packname || options.author) ? await writeExifImg(buff, options) : await imageToWebp(buff);
        await rich.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted });
        return buffer;
    };

    rich.sendVideoAsSticker = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
        let buffer = options && (options.packname || options.author) ? await writeExifVid(buff, options) : await videoToWebp(buff);
        await rich.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted });
        return buffer;
    };

    rich.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
        let quoted = message.msg ? message.msg : message;
        let mime = (message.msg || message).mimetype || '';
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
        const stream = await downloadContentFromMessage(quoted, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        let type = await FileType.fromBuffer(buffer);
        let trueFileName = attachExtension ? (filename + '.' + type.ext) : filename;
        await fs.writeFileSync(trueFileName, buffer);
        return trueFileName;
    };

    // Tambahan fungsi send media
    rich.sendMedia = async (jid, path, caption = '', quoted = '', options = {}) => {
        let { mime, data } = await rich.getFile(path, true);
        let messageType = mime.split('/')[0];
        let messageContent = {};
        
        if (messageType === 'image') {
            messageContent = { image: data, caption: caption, ...options };
        } else if (messageType === 'video') {
            messageContent = { video: data, caption: caption, ...options };
        } else if (messageType === 'audio') {
            messageContent = { audio: data, ptt: options.ptt || false, ...options };
        } else {
            messageContent = { document: data, mimetype: mime, fileName: options.fileName || 'file' };
        }

        await rich.sendMessage(jid, messageContent, { quoted });
    };
rich.sendPoll = (vb, name = '', values = [], selectableCount = 1) => {
return  rich.sendMessage(vb.chat, {poll: { name, values, selectableCount }})
};

    rich.sendPolls = async (jid, question, options) => {
        const pollMessage = {
            pollCreationMessage: {
                name: question,
                options: options.map(option => ({ optionName: option })),
                selectableCount: 1,
            },
        };

        await rich.sendMessage(jid, pollMessage);
    };

    rich.setStatus = async (status) => {
        await rich.query({
            tag: 'iq',
            attrs: { to: '@s.whatsapp.net', type: 'set', xmlns: 'status' },
            content: [{ tag: 'status', attrs: {}, content: Buffer.from(status, 'utf-8') }],
        });
        console.log(chalk.yellow(`Status updated: ${status}`));
    };

    rich.public = true;

    rich.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
        console.log(chalk.green("JAY JAY MD CONNECTED 🀄"))
        rich.newsletterFollow("120363362610026052@newsletter")
        }
    });

    rich.ev.on('error', (err) => {
        console.error(chalk.red("Error: "), err.message || err);
    });

    rich.ev.on('creds.update', saveCreds);
}
connectToWhatsApp()
