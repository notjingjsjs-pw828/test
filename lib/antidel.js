const { isJidGroup } = require('@whiskeysockets/baileys');
const { loadMessage, getAnti } = require('../data');
const config = require('../config');

const IMAGE_URL = "https://i.postimg.cc/Y2GSGtfG/IMG-20250502-WA0012-1.jpg";

// تابع برای تشخیص نوع Action
function getActionByMessageType(message) {
  if (!message) return "Message Deleted";
  if (message.imageMessage) return "Photo Deleted";
  if (message.videoMessage) return "Video Deleted";
  if (message.documentMessage) return "File Deleted";
  if (message.audioMessage) return "Audio Deleted";
  if (message.conversation || message.extendedTextMessage) return "Text Deleted";
  return "Message Deleted";
}

const DeletedText = async (conn, mek, jid, deleteInfo, isGroup, update) => {
  await conn.sendMessage(
    jid,
    {
      image: { url: IMAGE_URL },
      caption: deleteInfo,
      contextInfo: {
        mentionedJid: isGroup
          ? [update.key.participant, mek.key.participant]
          : [update.key.remoteJid],
      },
    },
    { quoted: mek }
  );
};

const DeletedMedia = async (conn, mek, jid, deleteInfo) => {
  const antideletedmek = structuredClone(mek.message);
  const messageType = Object.keys(antideletedmek)[0];

  if (!messageType) return;

  // ست کردن context
  if (antideletedmek[messageType]) {
    antideletedmek[messageType].contextInfo = {
      stanzaId: mek.key.id,
      participant: mek.sender,
      quotedMessage: mek.message,
    };
  }

  // اگر عکس یا ویدیو بود، متن رو داخل caption بزار
  if (messageType === "imageMessage" || messageType === "videoMessage") {
    antideletedmek[messageType].caption = deleteInfo;
    await conn.relayMessage(jid, antideletedmek, {});
  }

  // اگر audio یا doc بود → اول خودش رو بفرست
  else if (messageType === "audioMessage" || messageType === "documentMessage") {
    await conn.relayMessage(jid, antideletedmek, {});
    
    // بعدش عکس ثابت با توضیحات بفرست
    await conn.sendMessage(
      jid,
      {
        image: { url: IMAGE_URL },
        caption: deleteInfo,
        contextInfo: {
          mentionedJid: [mek.key.participant || mek.key.remoteJid],
        },
      },
      { quoted: mek }
    );
  }

  // حالت‌های دیگه مثل sticker یا contact...
  else {
    await conn.relayMessage(jid, antideletedmek, {});
    await conn.sendMessage(
      jid,
      {
        image: { url: IMAGE_URL },
        caption: deleteInfo,
        contextInfo: {
          mentionedJid: [mek.key.participant || mek.key.remoteJid],
        },
      },
      { quoted: mek }
    );
  }
};

const AntiDelete = async (conn, updates) => {
  for (const update of updates) {
    if (update.update.message === null) {
      const store = await loadMessage(update.key.id);
      if (!store || !store.message) continue;

      const mek = store.message;
      const isGroup = isJidGroup(store.jid);

      // ✅ جلوگیری از واکنش به پیام‌های خود ربات (در همه حالت‌ها)
      const sender = mek.key?.participant || mek.key?.remoteJid;
      const isFromBot = mek.key.fromMe || sender === conn.user.id;
      if (isFromBot) continue;

      const antiDeleteStatus = await getAnti();
      if (!antiDeleteStatus) continue;

      const deleteTime = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kabul',
      });

      let deleteInfo, jid;

      const actionType = getActionByMessageType(mek.message);

      let messageText = '';
      if (mek.message?.conversation) {
        messageText = mek.message.conversation;
      } else if (mek.message?.extendedTextMessage?.text) {
        messageText = mek.message.extendedTextMessage.text;
      } else if (mek.message?.imageMessage?.caption) {
        messageText = mek.message.imageMessage.caption;
      } else if (mek.message?.videoMessage?.caption) {
        messageText = mek.message.videoMessage.caption;
      } else {
        messageText = '[Media or Files]';
      }

      if (isGroup) {
        const groupMetadata = await conn.groupMetadata(store.jid);
        const groupName = groupMetadata.subject;
        const sender = mek.key.participant?.split('@')[0];
        const deleter = update.key.participant?.split('@')[0];

        deleteInfo = `╔═══━「 𝗡𝗢𝗧𝗛𝗜𝗡𝗚-𝗕𝗘𝗡 」━═══╗
║ 𝗦𝗲𝗻𝗱𝗲𝗿     : @${sender}
║ 𝗚𝗿𝗼𝘂𝗽      : ${groupName}
║ 𝗧𝗶𝗺𝗲       : ${deleteTime}
║ 𝗗𝗲𝗹𝗲𝘁𝗲𝗱 𝗕𝘆 : @${deleter}
║ 𝗔𝗰𝘁𝗶𝗼𝗻     : ${actionType}
║ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲   : ${messageText}
╚═══━「 𝗡𝗢𝗧𝗛𝗜𝗡𝗚-𝗕𝗘𝗡 」━═══╝`;

        jid = config.ANTI_DEL_PATH === "inbox" ? conn.user.id : store.jid;
      } else {
        const senderNumber = mek.key.remoteJid?.split('@')[0];
        const deleterNumber = update.key.remoteJid?.split('@')[0];

        deleteInfo = `╔═══━「 𝗡𝗢𝗧𝗛𝗜𝗡𝗚-𝗕𝗘𝗡 」━═══╗
║ 𝗦𝗲𝗻𝗱𝗲𝗿 : @${senderNumber}
║ 𝗧𝗶𝗺𝗲   : ${deleteTime}
║ 𝗔𝗰𝘁𝗶𝗼𝗻 : ${actionType}
║ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲 : ${messageText}
╚═══━「 𝗡𝗢𝗧𝗛𝗜𝗡𝗚-𝗕𝗘𝗡 」━═══╝`;

        jid = config.ANTI_DEL_PATH === "inbox" ? conn.user.id : update.key.remoteJid;
      }

      if (mek.message?.conversation || mek.message?.extendedTextMessage) {
        await DeletedText(conn, mek, jid, deleteInfo, isGroup, update);
      } else {
        await DeletedMedia(conn, mek, jid, deleteInfo);
      }
    }
  }
};

module.exports = {
  DeletedText,
  DeletedMedia,
  AntiDelete,
};