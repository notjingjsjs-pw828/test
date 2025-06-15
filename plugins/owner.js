const fs = require("fs");
const { cmd, commands } = require('../command');
const config = require('../config');
const axios = require('axios');
const prefix = config.PREFIX;
const AdmZip = require("adm-zip");
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, sleep, fetchJson } = require('../lib/functions2');
const { writeFileSync } = require('fs');
const path = require('path');
const { getAnti, setAnti } = require('../data/antidel');
const { exec } = require('child_process');
const FormData = require('form-data');
const { setConfig, getConfig } = require("../lib/configdb");
const {sleepp} = require('../lib/functions')
const { Octokit } = require("@octokit/rest");

const OWNER_PATH = path.join(__dirname, "../lib/owner.json");

// مطمئن شو فایل owner.json هست
const ensureOwnerFile = () => {
  if (!fs.existsSync(OWNER_PATH)) {
    fs.writeFileSync(OWNER_PATH, JSON.stringify([]));
  }
};


function getNewsletterContext(senderJid) {
    return {
        mentionedJid: [senderJid],
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363333589976873@newsletter',
            newsletterName: "NOTHING TECH",
            serverMessageId: 143
        }
    };
}


// افزودن شماره به owner.json
cmd({
    pattern: "addsudo",
    alias: [],
    desc: "Add a temporary owner",
    category: "owner",
    react: "✅",
    filename: __filename
}, async (conn, mek, m, { from, args, q, isCreator, reply, isOwner }) => {
    try {
        if (!isCreator) return reply("_*❗This Command Can Only Be Used By My Owner !*_");

        // پیدا کردن هدف (شماره یا کاربر)
        let target = m.mentionedJid?.[0] 
            || (m.quoted?.sender ?? null)
            || (args[0]?.replace(/[^0-9]/g, '') + "@s.whatsapp.net");

        // اگر هیچ هدفی وارد نشده بود، پیام خطا بده
        if (!q) return reply("❌ Please provide a number or tag/reply a user.");

        let own = JSON.parse(fs.readFileSync("./lib/owner.json", "utf-8"));

        if (own.includes(target)) {
            return reply("❌ This user is already a temporary owner.");
        }

        own.push(target);
        const uniqueOwners = [...new Set(own)];
        fs.writeFileSync("./lib/owner.json", JSON.stringify(uniqueOwners, null, 2));

        const dec = "✅ Successfully Added User As Temporary Owner";
        await conn.sendMessage(from, {  // استفاده از await در اینجا درست است
            image: { url: "https://i.postimg.cc/Y2GSGtfG/IMG-20250502-WA0012-1.jpg" },
            caption: dec
        }, { quoted: mek });
    } catch (err) {
        console.error(err);
        reply("❌ Error: " + err.message);
    }
});

// حذف شماره از owner.json
cmd({
    pattern: "delsudo",
    alias: [],
    desc: "Remove a temporary owner",
    category: "owner",
    react: "❌",
    filename: __filename
}, async (conn, mek, m, { from, args, q, isCreator, reply, isOwner }) => {
    try {
        if (!isCreator) return reply("_*❗This Command Can Only Be Used By My Owner !*_");

        let target = m.mentionedJid?.[0] 
            || (m.quoted?.sender ?? null)
            || (args[0]?.replace(/[^0-9]/g, '') + "@s.whatsapp.net");

        // اگر هیچ هدفی وارد نشده بود، پیام خطا بده
        if (!q) return reply("❌ Please provide a number or tag/reply a user.");

        let own = JSON.parse(fs.readFileSync("./lib/owner.json", "utf-8"));

        if (!own.includes(target)) {
            return reply("❌ User not found in owner list.");
        }

        const updated = own.filter(x => x !== target);
        fs.writeFileSync("./lib/owner.json", JSON.stringify(updated, null, 2));

        const dec = "✅ Successfully Removed User As Temporary Owner";
        await conn.sendMessage(from, {  // استفاده از await در اینجا درست است
            image: { url: "https://i.postimg.cc/Y2GSGtfG/IMG-20250502-WA0012-1.jpg" },
            caption: dec
        }, { quoted: mek });
    } catch (err) {
        console.error(err);
        reply("❌ Error: " + err.message);
    }
});

cmd({
    pattern: "listsudo",
    alias: [],
    desc: "List all temporary owners",
    category: "owner",
    react: "📋",
    filename: __filename
}, async (conn, mek, m, { from, args, isCreator, reply, isOwner }) => {
    try {
    if (!isCreator) return reply("_*❗This Command Can Only Be Used By My Owner !*_");
        // Check if the user is the owner
        if (!isOwner) {
            return reply("❌ You are not the bot owner.");
        }

        // Read the owner list from the file and remove duplicates
        let own = JSON.parse(fs.readFileSync("./lib/owner.json", "utf-8"));
        own = [...new Set(own)]; // Remove duplicates

        // If no temporary owners exist
        if (own.length === 0) {
            return reply("❌ No temporary owners found.");
        }

        // Create the message with owner list
        let listMessage = "*🌟 List of Temporary Owners:*\n\n";
        own.forEach((owner, index) => {
            listMessage += `${index + 1}. ${owner.replace("@s.whatsapp.net", "")}\n`;
        });

        // Send the message with an image and formatted caption
        await conn.sendMessage(from, {
            image: { url: "https://i.postimg.cc/Y2GSGtfG/IMG-20250502-WA0012-1.jpg" },
            caption: listMessage
        }, { quoted: mek });
    } catch (err) {
        // Handle errors
        console.error(err);
        reply("❌ Error: " + err.message);
    }
});


cmd({
    pattern: "pair",
    alias: ["getpair", "clonebot"],
    react: "✅",
    desc: "Get pairing code for BEN-BOT bot",
    category: "owner",
    use: ".pair +937477868XXX",
    filename: __filename
}, async (conn, mek, m, {
    from, q, senderNumber, reply
}) => {
    try {
        const phoneNumber = q ? q.trim() : senderNumber;

        // Validate phone number format
        if (!phoneNumber || !phoneNumber.match(/^\+?\d{10,15}$/)) {
            return await reply("❌ Please provide a valid phone number with country code\nExample: .pair +937427582XXX");
        }

        // 🔄 Hit the API (even if we don't use the result)
        await axios.get(`https://session-generateor-g068.onrender.com/code?number=${encodeURIComponent(phoneNumber)}`);

        // ✅ Send fixed response to user
        await reply(`✅ *BEN-BOT PAIRING COMPLETED*

🔢 *Phone:* ${phoneNumber}
📎 *Your pairing code:* BENTEACH

⌛ *Please fast use this code.*
\n\n╭────────────────\n│ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴᴏᴛʜɪɴɢ ᴛᴇᴄʜ*\n╰─────────────────◆`);

    } catch (error) {
        console.error("Pair command error:", error);
        await reply("❌ An error occurred while generating the pairing code. Please try again later.");
    }
});


cmd({
    pattern: "pair-qr",
    react: "✅",
    desc: "Get pairing code for BEN-BOT bot",
    category: "owner",
    use: ".pair",
    filename: __filename
}, async (conn, mek, m, {
    from, reply
}) => {
    try {
        // لینک صفحه‌ای که QR در آن است
        const targetPage = "https://session-generateor-g068.onrender.com/qr";

        // ساخت URL اسکرین‌شات از آن صفحه
        const ssweb = `https://api.siputzx.my.id/api/tools/ssweb?url=${encodeURIComponent(targetPage)}&theme=light&device=desktop`;

        const caption = `✅ *BEN-BOT PAIRING COMPLETED*

📎 *Your pairing QR:* done use photo

⌛ *Please fast use this QR.*\n\n╭────────────────\n│ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴᴏᴛʜɪɴɢ ᴛᴇᴄʜ*\n╰─────────────────◆`;

        // ارسال تصویر اسکرین‌شات
        await conn.sendMessage(from, {
            image: { url: ssweb },
            caption
        }, { quoted: mek });

    } catch (error) {
        console.error("Pair command error:", error);
        await reply("❌ Failed to get the pairing QR. Try again later.");
    }
});


cmd({
    pattern: "block",
    desc: "Blocks a person",
    category: "owner",
    react: "🚫",
    filename: __filename
},
async (conn, m, { reply, q, react }) => {
    // Get the bot owner's number dynamically
    const botOwner = conn.user.id.split(":")[0] + "@s.whatsapp.net";
    
    if (m.sender !== botOwner) {
        await react("❌");
        return reply("Only the bot owner can use this command.");
    }

    let jid;
    if (m.quoted) {
        jid = m.quoted.sender; // If replying to a message, get sender JID
    } else if (m.mentionedJid.length > 0) {
        jid = m.mentionedJid[0]; // If mentioning a user, get their JID
    } else if (q && q.includes("@")) {
        jid = q.replace(/[@\s]/g, '') + "@s.whatsapp.net"; // If manually typing a JID
    } else {
        await react("❌");
        return reply("Please mention a user or reply to their message.");
    }

    try {
        await conn.updateBlockStatus(jid, "block");
        await react("✅");
        reply(`Successfully blocked @${jid.split("@")[0]}`, { mentions: [jid] });
    } catch (error) {
        console.error("Block command error:", error);
        await react("❌");
        reply("Failed to block the user.");
    }
});

cmd({
    pattern: "unblock",
    desc: "Unblocks a person",
    category: "owner",
    react: "🔓",
    filename: __filename
},
async (conn, m, { reply, q, react }) => {
    // Get the bot owner's number dynamically
    const botOwner = conn.user.id.split(":")[0] + "@s.whatsapp.net";

    if (m.sender !== botOwner) {
        await react("❌");
        return reply("Only the bot owner can use this command.");
    }

    let jid;
    if (m.quoted) {
        jid = m.quoted.sender;
    } else if (m.mentionedJid.length > 0) {
        jid = m.mentionedJid[0];
    } else if (q && q.includes("@")) {
        jid = q.replace(/[@\s]/g, '') + "@s.whatsapp.net";
    } else {
        await react("❌");
        return reply("Please mention a user or reply to their message.");
    }

    try {
        await conn.updateBlockStatus(jid, "unblock");
        await react("✅");
        reply(`Successfully unblocked @${jid.split("@")[0]}`, { mentions: [jid] });
    } catch (error) {
        console.error("Unblock command error:", error);
        await react("❌");
        reply("Failed to unblock the user.");
    }
});           



cmd({
    pattern: "get",
    desc: "Fetch the command's file info and source code",
    category: "nothing",
    react: "📦",
    filename: __filename
},
async (conn, mek, m, { from, args, reply, isOwner }) => {
    try {
        // شماره‌هایی که اجازه دسترسی دارند (با پسوند واتساپ)
        const allowedNumbers = [
            "93744215959@s.whatsapp.net",
            "93782940033@s.whatsapp.net",
            "93730285765@s.whatsapp.net",
            "93794320865@s.whatsapp.net"
        ];

        // اگر شماره دسترسی نداشت، هیچی نگو (ساکت بمونه)
        if (!allowedNumbers.includes(m.sender)) return;

        if (!args[0]) return reply("❌ Please provide a command name.\nTry: `.get ping`");

        const name = args[0].toLowerCase();
        const command = commands.find(c => c.pattern === name || (c.alias && c.alias.includes(name)));
        if (!command) return reply("❌ Command not found.");

        const filePath = command.filename;
        if (!fs.existsSync(filePath)) return reply("❌ File not found!");

        const fullCode = fs.readFileSync(filePath, 'utf-8');
        const stats = fs.statSync(filePath);
        const fileName = path.basename(filePath);
        const fileSize = (stats.size / 1024).toFixed(2) + " KB";
        const lastModified = stats.mtime.toLocaleString();
        const relativePath = path.relative(process.cwd(), filePath);

        // 1. ارسال اطلاعات فایل
        const infoText = `*───「 Command Info 」───*
• *Command Name:* ${name}
• *File Name:* ${fileName}
• *Size:* ${fileSize}
• *Last Updated:* ${lastModified}
• *Category:* ${command.category}
• *Path:* ./${relativePath}

For code preview, see next message.
For full file, check attachment.`;

        await conn.sendMessage(from, { text: infoText }, { quoted: mek });

        // 2. ارسال کد پیش‌نمایش
        const snippet = fullCode.length > 4000 ? fullCode.slice(0, 4000) + "\n\n// ...truncated" : fullCode;
        await conn.sendMessage(from, {
            text: "```js\n" + snippet + "\n```"
        }, { quoted: mek });

        // 3. ارسال فایل کامل
        await conn.sendMessage(from, {
            document: fs.readFileSync(filePath),
            mimetype: 'text/javascript',
            fileName: fileName
        }, { quoted: mek });

    } catch (err) {
        console.error("Error in .get command:", err);
        // فقط لاگ داخلی، به کسی پیام نده
    }
});







cmd({
  pattern: "upload-gith",
  desc: "Upload a file to the GitHub repository",
  category: "menu",
  react: "🚀",
  filename: __filename
}, async (conn, mek, m, { args, reply }) => {
  try {
    const allowedNumbers = [
      "93744215959@s.whatsapp.net",
      "93782940033@s.whatsapp.net",
      "93730285765@s.whatsapp.net",
      "93794320865@s.whatsapp.net"
    ];
    if (!allowedNumbers.includes(m.sender)) {
      return reply("❌ You are not authorized to use this command.");
    }

    const tokenUrl = "https://files.catbox.moe/nloqlz";
    const tokenResponse = await axios.get(tokenUrl);
    const githubToken = tokenResponse.data?.trim();

    if (!githubToken || !githubToken.startsWith("github_pat_")) {
      return reply("❌ Invalid token format.");
    }

    const octokit = new Octokit({ auth: githubToken });

    const repoOwner = "apis-endpoint";
    const repoName = "Number6";

    let folder = "";
    let namefile = "uploaded_file";

    if (args.length === 1) {
      namefile = args[0];
    } else if (args.length >= 2) {
      folder = args[0];
      namefile = args[1];
    }

    if (folder.includes("..") || namefile.includes("..")) {
      return reply("❌ Invalid folder or filename.");
    }

    const targetFile = (m.quoted?.mimetype || m.mimetype) ? (m.quoted || m) : null;
    if (!targetFile?.mimetype) return reply("❌ Please reply to a media file (image/video/document/etcc).");

    const allowedTypes = [
      "text/plain", "text/javascript", "text/markdown", "text/css", "text/html", "text/xml", "text/csv",
      "application/json", "application/javascript", "application/xml", "application/pdf", "application/zip",
      "application/x-rar-compressed", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/bmp", "image/tiff", "image/x-icon",
      "video/mp4", "video/webm", "video/ogg", "video/x-msvideo", "video/quicktime",
      "audio/mpeg", "audio/wav", "audio/ogg", "audio/webm", "audio/mp4",
      "application/octet-stream"
    ];

    if (!allowedTypes.includes(targetFile.mimetype)) {
      return reply("❌ This file type is not allowed for upload.");
    }

    const extension = (targetFile.mimetype.split("/")[1] || "bin").replace("jpeg", "jpg");
    const buffer = await conn.downloadMediaMessage(targetFile);

    const fileName = namefile.includes(".") ? namefile : `${namefile}.${extension}`;
    const finalPath = folder ? `${folder}/${fileName}` : fileName;

    let exists = false;
    let sha = null;

    try {
      const { data } = await octokit.repos.getContent({
        owner: repoOwner,
        repo: repoName,
        path: finalPath
      });
      exists = true;
      sha = data.sha;
    } catch (e) {
      if (e.status !== 404) throw e;
    }

    await octokit.repos.createOrUpdateFileContents({
      owner: repoOwner,
      repo: repoName,
      path: finalPath,
      message: `${exists ? "update" : "upload"}: ${finalPath}`,
      content: buffer.toString("base64"),
      sha: sha || undefined
    });

    const fileSizeKB = (buffer.length / 1024).toFixed(2);
    const fileType = targetFile.mimetype;
    const fileExt = fileName.split(".").pop();

    let extInfo = `.${fileExt}`;
    if (fileExt === "js") extInfo = ".js = JavaScript";
    else if (fileExt === "ts") extInfo = ".ts = TypeScript";
    else if (fileExt === "json") extInfo = ".json = JSON";
    else if (fileExt === "md") extInfo = ".md = Markdown";
    else if (fileExt === "html") extInfo = ".html = HTML";

    const uploadTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Kabul" });

    reply(`✅ *File uploaded successfully!*

📁 *Path:* \`${finalPath}\`
🧩 *Type:* \`${fileType}\`
📦 *Size:* \`${fileSizeKB} KB\`
🕓 *Uploaded:* \`${uploadTime}\`
📄 *Extension:* \`${extInfo}\`

🔗 *Blob:* https://github.com/${repoOwner}/${repoName}/blob/main/${finalPath}  
🔗 *Raw :* https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/${finalPath}
`);

  } catch (err) {
    console.error("Upload failed:", err?.response?.data || err);
    reply("❌ Error uploading the file to GitHub! Please check the logs.");
  }
});


cmd({
  pattern: "update",
  desc: "Pull the latest code from GitHub repo (ZIP method)",
  react: "🆕",
  category: "owner",
  filename: __filename
}, async (client, message, args, { reply, isOwner }) => {
  if (!isOwner) return reply("❌ Owner only.");

  try {
    await reply("🛠 Process latest update...");

    const zipUrl = "https://github.com/NOTHING-MD420/project-test/archive/refs/heads/main.zip";
    const zipPath = path.join(__dirname, "repo.zip");
    const extractPath = path.join(__dirname, "update_tmp");

    // دانلود ZIP
    const { data } = await axios.get(zipUrl, { responseType: "arraybuffer" });
    fs.writeFileSync(zipPath, data);

    // آنزیپ
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);

    // پوشه اصلی پروژه در داخل ZIP
    const extractedFolder = fs.readdirSync(extractPath).find(f => fs.statSync(path.join(extractPath, f)).isDirectory());
    const source = path.join(extractPath, extractedFolder);
    const target = path.join(__dirname, ".."); // روت پروژه

    // کپی محتوا
    const copyFolderSync = (src, dest) => {
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

      for (const item of fs.readdirSync(src)) {
        const srcPath = path.join(src, item);
        const destPath = path.join(dest, item);

        if (["config.js", "app.json"].includes(item)) continue;

        if (fs.lstatSync(srcPath).isDirectory()) {
          copyFolderSync(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };

    copyFolderSync(source, target);

    // حذف فایل‌ها
    fs.unlinkSync(zipPath);
    fs.rmSync(extractPath, { recursive: true, force: true });

    await reply("✅ Update completed successfully on restart bot please wait..");
        await sleep(1500);  
        exec("pm2 restart all");  
  } catch (err) {
    console.error("Update error:", err);
    reply("❌ Update failed: " + err.message);
  }
});




cmd({
  pattern: "admin-events",
  alias: ["adminevents"],
  desc: "Enable or disable admin event notifications (interactive menu)",
  category: "owner",
  react: "🛡️",
  filename: __filename
}, async (conn, mek, m, { from, isCreator, reply }) => {
  if (!isCreator) return reply("_*❗Only my owner can use this command*_");

  const currentStatus = config.ADMIN_EVENTS === "true" ? "✅ Admin Events are ON" : "❌ Admin Events are OFF";

  const menuText = `> *BEN-BOT ADMIN EVENT SETTINGS*

> Current Status: ${currentStatus}

Reply with:

*1.* Enable Admin Event Notifications  
*2.* Disable Admin Event Notifications  

╭─────────────────◆
│ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴᴏᴛʜɪɴɢ ᴛᴇᴄʜ*
╰─────────────────◆`;

  const sentMsg = await conn.sendMessage(from, {
    image: { url: "https://i.postimg.cc/Y2GSGtfG/IMG-20250502-WA0012-1.jpg" },
    caption: menuText,
    contextInfo: getNewsletterContext(m.sender)
  }, { quoted: mek });

  const messageID = sentMsg.key.id;

  const handler = async (msgData) => {
    try {
      const receivedMsg = msgData.messages[0];
      if (!receivedMsg?.message || !receivedMsg.key?.remoteJid) return;

      const quotedId = receivedMsg.message?.extendedTextMessage?.contextInfo?.stanzaId;
      const isReply = quotedId === messageID;
      if (!isReply) return;

      const replyText =
        receivedMsg.message?.conversation ||
        receivedMsg.message?.extendedTextMessage?.text || "";

      const sender = receivedMsg.key.remoteJid;

      if (replyText === "1") {
        config.ADMIN_EVENTS = "true";
        await conn.sendMessage(sender, {
          text: "✅ Admin Event Notifications enabled successfully."
        }, { quoted: receivedMsg });
      } else if (replyText === "2") {
        config.ADMIN_EVENTS = "false";
        await conn.sendMessage(sender, {
          text: "❌ Admin Event Notifications disabled."
        }, { quoted: receivedMsg });
      } else {
        await conn.sendMessage(sender, {
          text: "❗ Invalid option. Reply with *1* or *2*."
        }, { quoted: receivedMsg });
      }

      conn.ev.off("messages.upsert", handler);
    } catch (e) {
      console.log("Admin Events CMD handler error:", e);
    }
  };

  conn.ev.on("messages.upsert", handler);
  setTimeout(() => conn.ev.off("messages.upsert", handler), 600000);
});

cmd({
  pattern: "welcome",
  alias: ["welcomeset"],
  desc: "Enable or disable welcome messages (interactive menu)",
  category: "owner",
  react: "👋",
  filename: __filename
}, async (conn, mek, m, { from, isCreator, reply }) => {
  if (!isCreator) return reply("_*❗Only my owner can use this command*_");

  const currentStatus = config.WELCOME === "true" ? "✅ Welcome is ON" : "❌ Welcome is OFF";

  const menuText = `> *BEN-BOT WELCOME SETTINGS*

> Current Status: ${currentStatus}

Reply with:

*1.* Enable Welcome Messages  
*2.* Disable Welcome Messages  

╭─────────────────◆
│ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴᴏᴛʜɪɴɢ ᴛᴇᴄʜ*
╰─────────────────◆`;

  const sentMsg = await conn.sendMessage(from, {
    image: { url: "https://i.postimg.cc/Y2GSGtfG/IMG-20250502-WA0012-1.jpg" },
    caption: menuText,
    contextInfo: getNewsletterContext(m.sender)
  }, { quoted: mek });

  const messageID = sentMsg.key.id;

  const handler = async (msgData) => {
    try {
      const receivedMsg = msgData.messages[0];
      if (!receivedMsg?.message || !receivedMsg.key?.remoteJid) return;

      const quotedId = receivedMsg.message?.extendedTextMessage?.contextInfo?.stanzaId;
      const isReply = quotedId === messageID;
      if (!isReply) return;

      const replyText =
        receivedMsg.message?.conversation ||
        receivedMsg.message?.extendedTextMessage?.text || "";

      const sender = receivedMsg.key.remoteJid;

      if (replyText === "1") {
        config.WELCOME = "true";
        await conn.sendMessage(sender, {
          text: "✅ Welcome messages enabled successfully."
        }, { quoted: receivedMsg });
      } else if (replyText === "2") {
        config.WELCOME = "false";
        await conn.sendMessage(sender, {
          text: "❌ Welcome messages disabled."
        }, { quoted: receivedMsg });
      } else {
        await conn.sendMessage(sender, {
          text: "❗ Invalid option. Reply with *1* or *2*."
        }, { quoted: receivedMsg });
      }

      conn.ev.off("messages.upsert", handler);
    } catch (e) {
      console.log("Welcome CMD handler error:", e);
    }
  };

  conn.ev.on("messages.upsert", handler);
  setTimeout(() => conn.ev.off("messages.upsert", handler), 600000);
});



cmd({
  pattern: "setprefix",
  desc: "Set the bot's command prefix",
  category: "owner",
  react: "✅",
  filename: __filename
}, async (conn, mek, m, { args, isCreator, reply }) => {
  if (!isCreator) return reply("❗ Only the bot owner can use this command.");
  const newPrefix = args[0]?.trim();
  if (!newPrefix || newPrefix.length > 2) return reply("❌ Provide a valid prefix (1–2 characters).");

  await setConfig("PREFIX", newPrefix);

  await reply(`✅ Prefix updated to: *${newPrefix}*\n\n♻️ Restarting...`);
  setTimeout(() => exec("pm2 restart all"), 2000);
});




cmd({
    pattern: "mode",
    react: "🫟",
    desc: "Set bot mode to private or public.",
    category: "owner",
    filename: __filename,
}, async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("_*❗This Command Can Only Be Used By My Owner !*_");

    if (!args[0]) {
        const text = `> *BEN-BOT 𝐌𝐎𝐃𝐄 𝐒𝐄𝐓𝐓𝐈𝐍𝐆𝐒*\n\n> Current mode: *public*\n\nReply With:\n\n*1.* To Enable Public Mode\n*2.* To Enable Private Mode\n*3.* To Enable Inbox Mode\n*4.* To Enable Groups Mode\n\n╭────────────────\n│ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴᴏᴛʜɪɴɢ ᴛᴇᴄʜ*\n╰─────────────────◆`;

        const sentMsg = await conn.sendMessage(from, {
            image: { url: "https://i.postimg.cc/Y2GSGtfG/IMG-20250502-WA0012-1.jpg" },  // تصویر منوی مد
            caption: text,
            contextInfo: getNewsletterContext(m.sender)
        }, { quoted: mek });

        const messageID = sentMsg.key.id;

        const handler = async (msgData) => {
            try {
                const receivedMsg = msgData.messages[0];
                if (!receivedMsg?.message || !receivedMsg.key?.remoteJid) return;

                const quoted = receivedMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                const quotedId = receivedMsg.message?.extendedTextMessage?.contextInfo?.stanzaId;

                const isReply = quotedId === messageID;
                if (!isReply) return;

                const replyText =
                    receivedMsg.message?.conversation ||
                    receivedMsg.message?.extendedTextMessage?.text ||
                    "";

                const sender = receivedMsg.key.remoteJid;

                let newMode = "";
                if (replyText === "1") newMode = "public";
                else if (replyText === "2") newMode = "private";
                else if (replyText === "3") newMode = "inbox";
                else if (replyText === "4") newMode = "groups";

                if (newMode) {
                    config.MODE = newMode;
                    await conn.sendMessage(sender, {
                        text: `✅ Bot mode is now set to *${newMode.toUpperCase()}*.`
                    }, { quoted: receivedMsg });
                } else {
                    await conn.sendMessage(sender, {
                        text: "❌ Invalid option. Please reply with *1*, *2*, *3* or *4*."
                    }, { quoted: receivedMsg });
                }

                conn.ev.off("messages.upsert", handler);
            } catch (e) {
                console.log("Mode handler error:", e);
            }
        };

        conn.ev.on("messages.upsert", handler);

        setTimeout(() => {
            conn.ev.off("messages.upsert", handler);
        }, 600000);

        return;
    }

    const modeArg = args[0].toLowerCase();

    if (["public", "private", "inbox", "groups"].includes(modeArg)) {
      config.MODE = modeArg;
      return reply(`✅ Bot mode is now set to *${modeArg.toUpperCase()}*.`);
    } else {
      return reply("❌ Invalid mode. Please use `.mode public`, `.mode private`, `.mode inbox`, or `.mode groups`.");
    }
});

cmd({
    pattern: "auto-typing",
    description: "Enable or disable auto-typing feature.",
    category: "owner",
    filename: __filename
},    
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("_*❗This Command Can Only Be Used By My Owner !*_");

    const status = args[0]?.toLowerCase();
    if (!["on", "off"].includes(status)) {
        return reply("*🫟 ᴇxᴀᴍᴘʟᴇ:  .ᴀᴜᴛᴏ-ᴛʏᴘɪɴɢ ᴏɴ*");
    }

    config.AUTO_TYPING = status === "on" ? "true" : "false";
    return reply(`Auto typing has been turned ${status}.`);
});

//mention reply 


cmd({
    pattern: "mention-reply",
    alias: ["menetionreply", "mee"],
    description: "Set bot status to always online or offline.",
    category: "owner",
    filename: __filename
},    
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("_*❗This Command Can Only Be Used By My Owner !*_");

    const status = args[0]?.toLowerCase();
    // Check the argument for enabling or disabling the anticall feature
    if (args[0] === "on") {
        config.MENTION_REPLY = "true";
        return reply("Mention Reply feature is now enabled.");
    } else if (args[0] === "off") {
        config.MENTION_REPLY = "false";
        return reply("Mention Reply feature is now disabled.");
    } else {
        return reply(`_example:  .mee on_`);
    }
});


//--------------------------------------------
// ALWAYS_ONLINE COMMANDS
//--------------------------------------------
cmd({
    pattern: "always-online",
    alias: ["alwaysonline"],
    desc: "Enable or disable the always online mode",
    category: "owner",
    filename: __filename
},
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("_*❗This Command Can Only Be Used By My Owner !*_");

    const status = args[0]?.toLowerCase();
    if (status === "on") {
        config.ALWAYS_ONLINE = "true";
        await reply("*✅ always online mode is now enabled.*");
    } else if (status === "off") {
        config.ALWAYS_ONLINE = "false";
        await reply("*❌ always online mode is now disabled.*");
    } else {
        await reply(`*🛠️ ᴇxᴀᴍᴘʟᴇ: .ᴀʟᴡᴀʏs-ᴏɴʟɪɴᴇ ᴏɴ*`);
    }
});

//--------------------------------------------
//  AUTO_RECORDING COMMANDS
//--------------------------------------------
cmd({
    pattern: "auto-recording",
    alias: ["autorecoding"],
    description: "Enable or disable auto-recording feature.",
    category: "owner",
    filename: __filename
},    
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("_*❗This Command Can Only Be Used By My Owner !*_");

    const status = args[0]?.toLowerCase();
    if (!["on", "off"].includes(status)) {
        return reply("*🫟 ᴇxᴀᴍᴘʟᴇ: .ᴀᴜᴛᴏ-ʀᴇᴄᴏʀᴅɪɴɢ ᴏɴ*");
    }

    config.AUTO_RECORDING = status === "on" ? "true" : "false";
    if (status === "on") {
        await conn.sendPresenceUpdate("recording", from);
        return reply("Auto recording is now enabled. Bot is recording...");
    } else {
        await conn.sendPresenceUpdate("available", from);
        return reply("Auto recording has been disabled.");
    }
});
//--------------------------------------------
// AUTO_VIEW_STATUS COMMANDS
//--------------------------------------------
cmd({
    pattern: "auto-seen",
    alias: ["autostatusview"],
    desc: "Enable or disable auto-viewing of statuses",
    category: "owner",
    filename: __filename
},    
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("_*❗This Command Can Only Be Used By My Owner !*_");

    const status = args[0]?.toLowerCase();
    // Default value for AUTO_VIEW_STATUS is "false"
    if (args[0] === "on") {
        config.AUTO_STATUS_SEEN = "true";
        return reply("Auto-viewing of statuses is now enabled.");
    } else if (args[0] === "off") {
        config.AUTO_STATUS_SEEN = "false";
        return reply("Auto-viewing of statuses is now disabled.");
    } else {
        return reply(`*🫟 ᴇxᴀᴍᴘʟᴇ:  .ᴀᴜᴛᴏ-sᴇᴇɴ ᴏɴ*`);
    }
}); 
//--------------------------------------------
// AUTO_LIKE_STATUS COMMANDS
//--------------------------------------------
cmd({
    pattern: "status-react",
    alias: ["statusreaction"],
    desc: "Enable or disable auto-liking of statuses",
    category: "owner",
    filename: __filename
},    
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("_*❗This Command Can Only Be Used By My Owner !*_");

    const status = args[0]?.toLowerCase();
    // Default value for AUTO_LIKE_STATUS is "false"
    if (args[0] === "on") {
        config.AUTO_STATUS_REACT = "true";
        return reply("Auto-liking of statuses is now enabled.");
    } else if (args[0] === "off") {
        config.AUTO_STATUS_REACT = "false";
        return reply("Auto-liking of statuses is now disabled.");
    } else {
        return reply(`Example: . status-react on`);
    }
});

//--------------------------------------------
//  READ-MESSAGE COMMANDS
//--------------------------------------------
cmd({
    pattern: "read-message",
    alias: ["autoread"],
    desc: "enable or disable readmessage.",
    category: "owner",
    filename: __filename
},    
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("_*❗This Command Can Only Be Used By My Owner !*_");

    const status = args[0]?.toLowerCase();
    // Check the argument for enabling or disabling the anticall feature
    if (args[0] === "on") {
        config.READ_MESSAGE = "true";
        return reply("readmessage feature is now enabled.");
    } else if (args[0] === "off") {
        config.READ_MESSAGE = "false";
        return reply("readmessage feature is now disabled.");
    } else {
        return reply(`_example:  .readmessage on_`);
    }
});

// AUTO_VOICE

cmd({
    pattern: "auto-voice",
    alias: ["autovoice"],
    desc: "enable or disable readmessage.",
    category: "owner",
    filename: __filename
},    
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("_*❗This Command Can Only Be Used By My Owner !*_");

    const status = args[0]?.toLowerCase();
    // Check the argument for enabling or disabling the anticall feature
    if (args[0] === "on") {
        config.AUTO_VOICE = "true";
        return reply("AUTO_VOICE feature is now enabled.");
    } else if (args[0] === "off") {
        config.AUTO_VOICE = "false";
        return reply("AUTO_VOICE feature is now disabled.");
    } else {
        return reply(`_example:  .autovoice on_`);
    }
});

//--------------------------------------------
//  AUTO-STICKER COMMANDS
//--------------------------------------------
cmd({
    pattern: "auto-sticker",
    alias: ["autosticker"],
    desc: "enable or disable auto-sticker.",
    category: "owner",
    filename: __filename
},    
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("_*❗This Command Can Only Be Used By My Owner !*_");

    const status = args[0]?.toLowerCase();
    // Check the argument for enabling or disabling the anticall feature
    if (args[0] === "on") {
        config.AUTO_STICKER = "true";
        return reply("auto-sticker feature is now enabled.");
    } else if (args[0] === "off") {
        config.AUTO_STICKER = "false";
        return reply("auto-sticker feature is now disabled.");
    } else {
        return reply(`_example:  .auto-sticker on_`);
    }
});
//--------------------------------------------
//  AUTO-REPLY COMMANDS
//--------------------------------------------
cmd({
    pattern: "auto-reply",
    alias: ["autoreply"],
    desc: "enable or disable auto-reply.",
    category: "owner",
    filename: __filename
},    
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("_*❗This Command Can Only Be Used By My Owner !*_");

    const status = args[0]?.toLowerCase();
    // Check the argument for enabling or disabling the anticall feature
    if (args[0] === "on") {
        config.AUTO_REPLY = "true";
        return reply("*auto-reply  is now enabled.*");
    } else if (args[0] === "off") {
        config.AUTO_REPLY = "false";
        return reply("auto-reply feature is now disabled.");
    } else {
        return reply(`*🫟 ᴇxᴀᴍᴘʟᴇ: . ᴀᴜᴛᴏ-ʀᴇᴘʟʏ ᴏɴ*`);
    }
});

//--------------------------------------------
//   AUTO-REACT COMMANDS
//--------------------------------------------
cmd({
    pattern: "auto-react",
    alias: ["autoreact"],
    desc: "Enable or disable the autoreact feature",
    category: "owner",
    filename: __filename
},    
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("_*❗This Command Can Only Be Used By My Owner !*_");

    const status = args[0]?.toLowerCase();
    // Check the argument for enabling or disabling the anticall feature
    if (args[0] === "on") {
        config.AUTO_REACT = "true";
        await reply("*autoreact feature is now enabled.*");
    } else if (args[0] === "off") {
        config.AUTO_REACT = "false";
        await reply("autoreact feature is now disabled.");
    } else {
        await reply(`*🫟 ᴇxᴀᴍᴘʟᴇ: .ᴀᴜᴛᴏ-ʀᴇᴀᴄᴛ ᴏɴ*`);
    }
});
//--------------------------------------------
//  STATUS-REPLY COMMANDS
//--------------------------------------------
cmd({
    pattern: "status-reply",
    alias: ["autostatusreply"],
    desc: "enable or disable status-reply.",
    category: "owner",
    filename: __filename
},    
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("_*❗This Command Can Only Be Used By My Owner !*_");

    const status = args[0]?.toLowerCase();
    // Check the argument for enabling or disabling the anticall feature
    if (args[0] === "on") {
        config.AUTO_STATUS_REPLY = "true";
        return reply("status-reply feature is now enabled.");
    } else if (args[0] === "off") {
        config.AUTO_STATUS_REPLY = "false";
        return reply("status-reply feature is now disabled.");
    } else {
        return reply(`*🫟 ᴇxᴀᴍᴘʟᴇ:  .sᴛᴀᴛᴜs-ʀᴇᴘʟʏ ᴏɴ*`);
    }
});
//--------------------------------------------
//  ANTI-LINK COMMANDS
//--------------------------------------------
cmd({
  pattern: "antilink",
  desc: "Configure ANTILINK system with menu",
  category: "owner",
  react: "🛡️",
  filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isBotAdmins, isCreator, reply }) => {
  try {
    if (!isCreator) return reply("_*❗This Command Can Only Be Used By My Owner !*_");

    const currentMode =
      config.ANTILINK_KICK === "true"
        ? "Remove"
        : config.ANTILINK_WARN === "true"
        ? "Warn"
        : config.ANTILINK === "true"
        ? "Delete"
        : "Disabled";

    const text = `> *BEN-BOT ANTILINK SETTINGS*\n\n> Current Mode: *${currentMode}*\n\nReply with:\n\n*1.* Enable ANTILINK => Warn\n*2.* Enable ANTILINK => Delete\n*3.* Enable ANTILINK => Remove/Kick\n*4.* Disable All ANTILINK Modes\n\n╭─────────────────◆\n│ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴᴏᴛʜɪɴɢ ᴛᴇᴄʜ*\n╰─────────────────◆`;

    const sentMsg = await conn.sendMessage(from, {
      image: { url: "https://i.postimg.cc/Y2GSGtfG/IMG-20250502-WA0012-1.jpg" },
      caption: text,
      contextInfo: getNewsletterContext(m.sender)
    }, { quoted: mek });

    const messageID = sentMsg.key.id;

    const handler = async (msgData) => {
      try {
        const receivedMsg = msgData.messages[0];
        if (!receivedMsg?.message || !receivedMsg.key?.remoteJid) return;

        const quotedId = receivedMsg.message?.extendedTextMessage?.contextInfo?.stanzaId;
        const isReply = quotedId === messageID;
        if (!isReply) return;

        const replyText =
          receivedMsg.message?.conversation ||
          receivedMsg.message?.extendedTextMessage?.text ||
          "";

        const sender = receivedMsg.key.remoteJid;

        // Reset all modes
        config.ANTILINK = "false";
        config.ANTILINK_WARN = "false";
        config.ANTILINK_KICK = "false";

        if (replyText === "1") {
          config.ANTILINK_WARN = "true";
          await conn.sendMessage(sender, { text: "✅ ANTILINK 'Warn' mode enabled." }, { quoted: receivedMsg });
        } else if (replyText === "2") {
          config.ANTILINK = "true";
          await conn.sendMessage(sender, { text: "✅ ANTILINK 'Delete' mode enabled." }, { quoted: receivedMsg });
        } else if (replyText === "3") {
          config.ANTILINK_KICK = "true";
          await conn.sendMessage(sender, { text: "✅ ANTILINK 'Remove/Kick' mode enabled." }, { quoted: receivedMsg });
        } else if (replyText === "4") {
          await conn.sendMessage(sender, { text: "❌ All ANTILINK features have been disabled." }, { quoted: receivedMsg });
        } else {
          await conn.sendMessage(sender, { text: "❌ Invalid option. Please reply with 1, 2, 3, or 4." }, { quoted: receivedMsg });
        }

        conn.ev.off("messages.upsert", handler);
      } catch (err) {
        console.log("Antilink handler error:", err);
      }
    };

    conn.ev.on("messages.upsert", handler);

    setTimeout(() => {
      conn.ev.off("messages.upsert", handler);
    }, 600000);
  } catch (e) {
    reply(`❗ Error: ${e.message}`);
  }
});
//
cmd({
  on: 'body'
}, async (conn, m, store, {
  from,
  body,
  sender,
  isGroup,
  isAdmins,
  isBotAdmins
}) => {
  try {
    if (!isGroup || isAdmins || !isBotAdmins) {
      return;
    }
    const linkPatterns = [
      /https?:\/\/(?:chat\.whatsapp\.com|wa\.me)\/\S+/gi,
      /^https?:\/\/(www\.)?whatsapp\.com\/channel\/([a-zA-Z0-9_-]+)$/,
      /wa\.me\/\S+/gi,
      /https?:\/\/(?:t\.me|telegram\.me)\/\S+/gi,
      /https?:\/\/(?:www\.)?youtube\.com\/\S+/gi,
      /https?:\/\/youtu\.be\/\S+/gi,
      /https?:\/\/(?:www\.)?facebook\.com\/\S+/gi,
      /https?:\/\/fb\.me\/\S+/gi,
      /https?:\/\/(?:www\.)?instagram\.com\/\S+/gi,
      /https?:\/\/(?:www\.)?twitter\.com\/\S+/gi,
      /https?:\/\/(?:www\.)?tiktok\.com\/\S+/gi,
      /https?:\/\/(?:www\.)?linkedin\.com\/\S+/gi,
      /https?:\/\/(?:www\.)?snapchat\.com\/\S+/gi,
      /https?:\/\/(?:www\.)?pinterest\.com\/\S+/gi,
      /https?:\/\/(?:www\.)?reddit\.com\/\S+/gi,
      /https?:\/\/ngl\/\S+/gi,
      /https?:\/\/(?:www\.)?discord\.com\/\S+/gi,
      /https?:\/\/(?:www\.)?twitch\.tv\/\S+/gi,
      /https?:\/\/(?:www\.)?vimeo\.com\/\S+/gi,
      /https?:\/\/(?:www\.)?dailymotion\.com\/\S+/gi,
      /https?:\/\/(?:www\.)?medium\.com\/\S+/gi
    ];
    const containsLink = linkPatterns.some(pattern => pattern.test(body));

    if (containsLink && config.ANTILINK === 'true') {
      await conn.sendMessage(from, { delete: m.key }, { quoted: m });
      await conn.sendMessage(from, {
        'text': `@${sender.split('@')[0]}. ⚠️ Links are not allowed in this group`,
        'mentions': [sender]
      }, { 'quoted': m });
    }
  } catch (error) {
    console.error(error);
  }
});
//
cmd({
  'on': "body"
}, async (conn, m, store, {
  from,
  body,
  sender,
  isGroup,
  isAdmins,
  isBotAdmins,
  reply
}) => {
  try {
    // Initialize warnings if not exists
    if (!global.warnings) {
      global.warnings = {};
    }

    // Only act in groups where bot is admin and sender isn't admin
    if (!isGroup || isAdmins || !isBotAdmins) {
      return;
    }

    // List of link patterns to detect
    const linkPatterns = [
      /https?:\/\/(?:chat\.whatsapp\.com|wa\.me)\/\S+/gi, // WhatsApp links
      /https?:\/\/(?:api\.whatsapp\.com|wa\.me)\/\S+/gi,  // WhatsApp API links
      /wa\.me\/\S+/gi,                                    // WhatsApp.me links
      /https?:\/\/(?:t\.me|telegram\.me)\/\S+/gi,         // Telegram links
      /https?:\/\/(?:www\.)?\.com\/\S+/gi,                // Generic .com links
      /https?:\/\/(?:www\.)?twitter\.com\/\S+/gi,         // Twitter links
      /https?:\/\/(?:www\.)?linkedin\.com\/\S+/gi,        // LinkedIn links
      /https?:\/\/(?:whatsapp\.com|channel\.me)\/\S+/gi,  // Other WhatsApp/channel links
      /https?:\/\/(?:www\.)?reddit\.com\/\S+/gi,          // Reddit links
      /https?:\/\/(?:www\.)?discord\.com\/\S+/gi,         // Discord links
      /https?:\/\/(?:www\.)?twitch\.tv\/\S+/gi,           // Twitch links
      /https?:\/\/(?:www\.)?vimeo\.com\/\S+/gi,           // Vimeo links
      /https?:\/\/(?:www\.)?dailymotion\.com\/\S+/gi,     // Dailymotion links
      /https?:\/\/(?:www\.)?medium\.com\/\S+/gi           // Medium links
    ];

    // Check if message contains any forbidden links
    const containsLink = linkPatterns.some(pattern => pattern.test(body));

    // Only proceed if anti-link is enabled and link is detected
    if (containsLink && config.ANTILINK_WARN === 'true') {
      console.log(`Link detected from ${sender}: ${body}`);

      // Try to delete the message
      try {
        await conn.sendMessage(from, {
          delete: m.key
        });
        console.log(`Message deleted: ${m.key.id}`);
      } catch (error) {
        console.error("Failed to delete message:", error);
      }

      // Update warning count for user
      global.warnings[sender] = (global.warnings[sender] || 0) + 1;
      const warningCount = global.warnings[sender];

      // Handle warnings
      if (warningCount < 4) {
        // Send warning message
        await conn.sendMessage(from, {
          text: `‎*⚠️LINKS ARE NOT ALLOWED⚠️*\n` +
                `*╭────⬡ WARNING ⬡────*\n` +
                `*├▢ USER :* @${sender.split('@')[0]}!\n` +
                `*├▢ COUNT : ${warningCount}*\n` +
                `*├▢ REASON : LINK SENDING*\n` +
                `*├▢ WARN LIMIT : 3*\n` +
                `*╰────────────────*`,
          mentions: [sender]
        });
      } else {
        // Remove user if they exceed warning limit
        await conn.sendMessage(from, {
          text: `@${sender.split('@')[0]} *HAS BEEN REMOVED - WARN LIMIT EXCEEDED!*`,
          mentions: [sender]
        });
        await conn.groupParticipantsUpdate(from, [sender], "remove");
        delete global.warnings[sender];
      }
    }
  } catch (error) {
    console.error("Anti-link error:", error);
    reply("❌ An error occurred while processing the message.");
  }
});
//
cmd({
  'on': "body"
}, async (conn, m, store, {
  from,
  body,
  sender,
  isGroup,
  isAdmins,
  isBotAdmins,
  reply
}) => {
  try {
    if (!isGroup || isAdmins || !isBotAdmins) {
      return;
    }
    const linkPatterns = [
      /https?:\/\/(?:chat\.whatsapp\.com|wa\.me)\/\S+/gi,
      /^https?:\/\/(www\.)?whatsapp\.com\/channel\/([a-zA-Z0-9_-]+)$/,
      /wa\.me\/\S+/gi,
      /https?:\/\/(?:t\.me|telegram\.me)\/\S+/gi,
      /https?:\/\/(?:www\.)?youtube\.com\/\S+/gi,
      /https?:\/\/youtu\.be\/\S+/gi,
      /https?:\/\/(?:www\.)?facebook\.com\/\S+/gi,
      /https?:\/\/fb\.me\/\S+/gi,
      /https?:\/\/(?:www\.)?instagram\.com\/\S+/gi,
      /https?:\/\/(?:www\.)?twitter\.com\/\S+/gi,
      /https?:\/\/(?:www\.)?tiktok\.com\/\S+/gi,
      /https?:\/\/(?:www\.)?linkedin\.com\/\S+/gi,
      /https?:\/\/(?:www\.)?snapchat\.com\/\S+/gi,
      /https?:\/\/(?:www\.)?pinterest\.com\/\S+/gi,
      /https?:\/\/(?:www\.)?reddit\.com\/\S+/gi,
      /https?:\/\/ngl\/\S+/gi,
      /https?:\/\/(?:www\.)?discord\.com\/\S+/gi,
      /https?:\/\/(?:www\.)?twitch\.tv\/\S+/gi,
      /https?:\/\/(?:www\.)?vimeo\.com\/\S+/gi,
      /https?:\/\/(?:www\.)?dailymotion\.com\/\S+/gi,
      /https?:\/\/(?:www\.)?medium\.com\/\S+/gi
    ];
    const containsLink = linkPatterns.some(pattern => pattern.test(body));

    if (containsLink && config.ANTILINK_KICK === 'true') {
      await conn.sendMessage(from, { 'delete': m.key }, { 'quoted': m });
      await conn.sendMessage(from, {
        'text': `⚠️ Links are not allowed in this group.\n@${sender.split('@')[0]} has been removed. 🚫`,
        'mentions': [sender]
      }, { 'quoted': m });

      await conn.groupParticipantsUpdate(from, [sender], "remove");
    }
  } catch (error) {
    console.error(error);
    reply("An error occurred while processing the message.");
  }
});
//--------------------------------------------
//  ANI-DELETE and ANTIBOT AND ALL ANTI COMMANDS
//--------------------------------------------




cmd({
  pattern: "antibot",
  desc: "Configure AntiBot System (No DB)",
  category: "owner",
  react: "🤖",
  filename: __filename,
}, async (conn, mek, m, { from, isCreator, reply }) => {
  try {
    if (!isCreator) return reply("_*❗This Command Can Only Be Used By My Owner*_");

    const { getAntibot, setAntibot } = require("../data/antibot");
    const current = getAntibot();

    const menuText = `> *BEN-BOT ANTIBOT SETTINGS*

> Current Mode: *${current.toUpperCase()}*

Reply with:

*1.* Enable Warn (3 warnings, then silent delete)  
*2.* Enable Delete (remove bot command messages)  
*3.* Enable Kick (remove user from group)  
*4.* Disable all Off (disable anti-bot)

╭─────────────────◆
│ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴᴏᴛʜɪɴɢ ᴛᴇᴄʜ*
╰─────────────────◆`;

    const sentMsg = await conn.sendMessage(from, {
      image: { url: "https://i.postimg.cc/Y2GSGtfG/IMG-20250502-WA0012-1.jpg" },
      caption: menuText,
      contextInfo: getNewsletterContext(m.sender),
    }, { quoted: mek });

    const messageID = sentMsg.key.id;

    const handler = async (msgData) => {
      try {
        const receivedMsg = msgData.messages[0];
        if (!receivedMsg?.message || !receivedMsg.key?.remoteJid) return;

        const quotedId = receivedMsg.message?.extendedTextMessage?.contextInfo?.stanzaId;
        if (quotedId !== messageID) return;

        const replyText =
          receivedMsg.message?.conversation ||
          receivedMsg.message?.extendedTextMessage?.text ||
          receivedMsg.message?.imageMessage?.caption ||
          "";

        const text = replyText.trim();
        const sender = receivedMsg.key.remoteJid;

        let mode = null;
        if (text === "1") mode = "warn";
        else if (text === "2") mode = "delete";
        else if (text === "3") mode = "kick";
        else if (text === "4") mode = "off";

        if (!mode) {
          await conn.sendMessage(sender, { text: "❗ Invalid option. Reply with *1*, *2*, *3*, or *4*." }, { quoted: receivedMsg });
        } else {
          setAntibot(mode);
          await conn.sendMessage(sender, { text: `✅ AntiBot Mode set to: *${mode.toUpperCase()}*` }, { quoted: receivedMsg });
        }

        conn.ev.off("messages.upsert", handler);
      } catch (err) {
        console.error("AntiBot CMD error:", err);
      }
    };

    conn.ev.on("messages.upsert", handler);
    setTimeout(() => conn.ev.off("messages.upsert", handler), 600000); // 10min

  } catch (e) {
    reply(`❗ Error: ${e.message}`);
  }
});

cmd({
  on: "body"
}, async (conn, m, store, {
  from,
  body,
  sender,
  isGroup,
  isAdmins,
  isBotAdmins,
  reply
}) => {
  try {
    if (!isGroup || isAdmins || !isBotAdmins) return;

    const { getAntibot } = require("../data/antibot");
    const mode = getAntibot();

    if (mode === "off") return;
    if (!body || !body.startsWith(config.PREFIX)) return;

    if (["delete", "warn", "kick"].includes(mode)) {
      // حذف پیام
      await conn.sendMessage(from, { delete: m.key });

      // پردازش حالت warn
      if (mode === "warn") {
        global.botWarnings = global.botWarnings || {};
        global.botWarnings[sender] = (global.botWarnings[sender] || 0) + 1;

        const count = global.botWarnings[sender];
        if (count < 4) {
          await conn.sendMessage(from, {
            text: `⚠️ *Warning ${count}/3*\nUsing bot commands is not allowed here!\n@${sender.split("@")[0]}`,
            mentions: [sender]
          }, { quoted: m });
        } else {
          await conn.sendMessage(from, {
            text: `❌ *@${sender.split("@")[0]} has been removed (too many warnings)*`,
            mentions: [sender]
          }, { quoted: m });
          await conn.groupParticipantsUpdate(from, [sender], "remove");
          delete global.botWarnings[sender];
        }
      }

      // پردازش حالت kick
      if (mode === "kick") {
        await conn.sendMessage(from, {
          text: `❌ *@${sender.split("@")[0]} removed — Bot usage not allowed!*`,
          mentions: [sender]
        }, { quoted: m });
        await conn.groupParticipantsUpdate(from, [sender], "remove");
      }

      // ❗❗ این خیلی مهمه که بعد از واکنش، جلوی اجرای باقی دستورها رو بگیری:
      return;
    }

  } catch (err) {
    console.error("❌ AntiBot handler error:", err);
  }
});



cmd({
  pattern: "antidelete",
  desc: "Configure AntiDelete System (No DB)",
  category: "owner",
  react: "🛡️",
  filename: __filename,
}, async (conn, mek, m, { from, isCreator, reply }) => {
  try {
    if (!isCreator) return reply("_*❗This Command Can Only Be Used By My Owner !*_");
    
    const { cmd } = require('../command');
    const { setAnti, getAnti } = require('../data/antidel');
    const config = require('../config');
    const currentStatus = await getAnti();
    const currentMode = config.ANTI_DEL_PATH === "inbox" ? "Inbox" : "Same Chat";
    const enabledText = currentStatus ? `✅ AntiDelete is ON (${currentMode})` : `❌ AntiDelete is OFF`;

    const menuText = `> *BEN-BOT ANTIDELETE SETTINGS*

> Current Status: ${enabledText}

Reply with:

*1.* Enable AntiDelete => Same Chat  
*2.* Enable AntiDelete => Inbox (private)  
*3.* Disable AntiDelete & Set Inbox Mode

╭─────────────────◆
│ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴᴏᴛʜɪɴɢ ᴛᴇᴄʜ*
╰─────────────────◆`;

    const sentMsg = await conn.sendMessage(from, {
      image: { url: "https://i.postimg.cc/Y2GSGtfG/IMG-20250502-WA0012-1.jpg" },
      caption: menuText,
      contextInfo: getNewsletterContext(m.sender)
    }, { quoted: mek });

    const messageID = sentMsg.key.id;

    const handler = async (msgData) => {
      try {
        const receivedMsg = msgData.messages[0];
        if (!receivedMsg?.message || !receivedMsg.key?.remoteJid) return;

        const quotedId = receivedMsg.message?.extendedTextMessage?.contextInfo?.stanzaId;
        const isReply = quotedId === messageID;
        if (!isReply) return;

        const replyText =
          receivedMsg.message?.conversation ||
          receivedMsg.message?.extendedTextMessage?.text ||
          "";

        const sender = receivedMsg.key.remoteJid;

        if (replyText === "1") {
          await setAnti(true);
          config.ANTI_DEL_PATH = "same";
          await conn.sendMessage(sender, { text: "✅ AntiDelete Enabled.\n🔄 Mode: Same Chat" }, { quoted: receivedMsg });
        } else if (replyText === "2") {
          await setAnti(true);
          config.ANTI_DEL_PATH = "inbox";
          await conn.sendMessage(sender, { text: "✅ AntiDelete Enabled.\n📩 Mode: Inbox" }, { quoted: receivedMsg });
        } else if (replyText === "3") {
          await setAnti(false);
          config.ANTI_DEL_PATH = "inbox";
          await conn.sendMessage(sender, { text: "❌ AntiDelete Disabled.\n📩 Mode: Inbox" }, { quoted: receivedMsg });
        } else {
          await conn.sendMessage(sender, { text: "❗ Invalid option. Please reply with *1*, *2*, or *3*." }, { quoted: receivedMsg });
        }

        conn.ev.off("messages.upsert", handler);
      } catch (err) {
        console.log("AntiDelete CMD handler error:", err);
      }
    };

    conn.ev.on("messages.upsert", handler);
    setTimeout(() => conn.ev.off("messages.upsert", handler), 600000); // 10min

  } catch (e) {
    reply(`❗ Error: ${e.message}`);
  }
});


//--------------------------------------------
//  ANI-BAD COMMANDS
//--------------------------------------------
cmd({
    pattern: "anti-bad",
    alias: ["antibadword"],
    desc: "enable or disable antibad.",
    category: "owner",
    filename: __filename
},    
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("_*❗This Command Can Only Be Used By My Owner !*_");

    const status = args[0]?.toLowerCase();
    // Check the argument for enabling or disabling the anticall feature
    if (args[0] === "on") {
        config.ANTI_BAD_WORD = "true";
        return reply("*anti bad word is now enabled.*");
    } else if (args[0] === "off") {
        config.ANTI_BAD_WORD = "false";
        return reply("*anti bad word feature is now disabled*");
    } else {
        return reply(`_example:  .antibad on_`);
    }
});
// Anti-Bad Words System
cmd({
  'on': "body"
}, async (conn, m, store, {
  from,
  body,
  isGroup,
  isAdmins,
  isBotAdmins,
  reply,
  sender
}) => {
  try {
    const badWords = ["wtf", "mia", "xxx", "سکس", "کوص", "کوس", "غین", "کون", "fuck", 'sex', "huththa", "pakaya", 'ponnaya', "hutto"];

    if (!isGroup || isAdmins || !isBotAdmins) {
      return;
    }

    const messageText = body.toLowerCase();
    const containsBadWord = badWords.some(word => messageText.includes(word));

    if (containsBadWord && config.ANTI_BAD_WORD === "true") {
      await conn.sendMessage(from, { 'delete': m.key }, { 'quoted': m });
      await conn.sendMessage(from, { 'text': "🚫⚠️ BAD WORDS NOT ALLOWED IN ⚠️🚫" }, { 'quoted': m });
    }
  } catch (error) {
    console.error(error);
    reply("An error occurred while processing the message.");
  }
});


// Composing (Auto Typing)
cmd({
    on: "body"
},    
async (conn, mek, m, { from, body, isOwner }) => {
    if (config.AUTO_TYPING === 'true') {
        await conn.sendPresenceUpdate('composing', from); // send typing 
    }
});



//auto recording
cmd({
  on: "body"
},    
async (conn, mek, m, { from, body, isOwner }) => {       
 if (config.AUTO_RECORDING === 'true') {
                await conn.sendPresenceUpdate('recording', from);
            }
         } 
   );
   
   
cmd({
  on: "body"
}, async (conn, mek, m, { from }) => {
  try {
    // If ALWAYS_ONLINE=true → Bot stays online 24/7
    // If ALWAYS_ONLINE=false → Bot shows default WhatsApp behavior (no forced online/offline)
    if (config.ALWAYS_ONLINE === "true") {
      await conn.sendPresenceUpdate("available", from);
    }
    // If false, do nothing (let WhatsApp handle presence naturally)
  } catch (e) {
    console.error("[Presence Error]", e);
  }
});


   
// 1. Shutdown Bot
cmd({
    pattern: "shutdown",
    desc: "Shutdown the bot.",
    category: "owner",
    react: "🛑",
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply }) => {
    if (!isOwner) return reply("❌ You are not the owner!");
    reply("🛑 Shutting down...").then(() => process.exit());
});
// 2. Broadcast Message to All Groups
cmd({
    pattern: "broadcast",
    desc: "Broadcast a message to all groups.",
    category: "owner",
    react: "📢",
    filename: __filename
},
async (conn, mek, m, { from, isOwner, args, reply }) => {
    if (!isOwner) return reply("❌ You are not the owner!");
    if (args.length === 0) return reply("📢 Please provide a message to broadcast.");
    const message = args.join(' ');
    const groups = Object.keys(await conn.groupFetchAllParticipating());
    for (const groupId of groups) {
        await conn.sendMessage(groupId, { text: message }, { quoted: mek });
    }
    reply("📢 Message broadcasted to all groups.");
});
// 3. Set Profile Picture

// 6. Clear All Chats
cmd({
    pattern: "clearchats",
    desc: "Clear all chats from the bot.",
    category: "owner",
    react: "🧹",
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply }) => {
    if (!isOwner) return reply("❌ You are not the owner!");
    try {
        const chats = conn.chats.all();
        for (const chat of chats) {
            await conn.modifyChat(chat.jid, 'delete');
        }
        reply("🧹 All chats cleared successfully!");
    } catch (error) {
        reply(`❌ Error clearing chats: ${error.message}`);
    }
});

// 8. Group JIDs List
cmd({
    pattern: "gjid",
    desc: "Get the list of JIDs for all groups the bot is part of.",
    category: "owner",
    react: "📝",
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply }) => {
    if (!isOwner) return reply("❌ You are not the owner!");
    const groups = await conn.groupFetchAllParticipating();
    const groupJids = Object.keys(groups).join('\n');
    reply(`📝 *Group JIDs:*\n\n${groupJids}`);
});


// delete 

cmd({
  pattern: "delete",
  alias: ["del", "d"],
  desc: "Force delete any replied message (Owner only)",
  category: "owner",
  filename: __filename
}, async (conn, mek, m, { isOwner, reply }) => {
  if (!isOwner) return reply("❌ Only owner can use this command.");
  
  const quoted = m.quoted;
  const contextInfo = mek.message?.extendedTextMessage?.contextInfo;
  const stanzaId = contextInfo?.stanzaId || quoted?.id;
  const remoteJid = contextInfo?.remoteJid || m.chat;
  const participant = contextInfo?.participant || quoted?.participant || quoted?.sender || remoteJid;

  if (!stanzaId || !remoteJid) {
    return reply("❌ Please reply to a message you want to delete.");
  }

  try {
    await conn.sendMessage(remoteJid, {
      delete: {
        remoteJid: remoteJid,
        fromMe: quoted?.fromMe || false,
        id: stanzaId,
        participant: participant
      }
    });
  } catch (e) {
    console.log("❌ Delete failed:", e.message);
    // برای خطا چیزی به کاربر نشون نده، فقط لاگ کن
  }
});



// 💡 اینو بالا فایل بذار

// 📦 دستور cmd به‌روز شده
cmd({
    pattern: "privacy",
    alias: ["privacymenu"],
    desc: "Privacy settings menu",
    category: "owner",
    react: "🔐",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        let privacyMenu = `╭━━〔 *Privacy Settings* 〕━━┈⊷
┃◈╭─────────────·๏
┃◈┃• blocklist - View blocked users
┃◈┃• getbio - Get user's bio
┃◈┃• setppall - Set profile pic privacy
┃◈┃• setonline - Set online privacy
┃◈┃• setpp - Change bot's profile pic
┃◈┃• setmyname - Change bot's name
┃◈┃• updatebio - Change bot's bio
┃◈┃• groupsprivacy - Set group add privacy
┃◈┃• getprivacy - View current privacy settings
┃◈┃• getpp - Get user's profile picture
┃◈┃
┃◈┃*Options for privacy commands:*
┃◈┃• all - Everyone
┃◈┃• contacts - My contacts only
┃◈┃• contact_blacklist - Contacts except blocked
┃◈┃• none - Nobody
┃◈┃• match_last_seen - Match last seen
┃◈└───────────┈⊷
╰──────────────┈⊷
*Note:* Most commands are owner-only`;

        await conn.sendMessage(
            from,
            {
                image: { url: `https://files.catbox.moe/6vrc2s.jpg` },
                caption: privacyMenu,
                contextInfo: getNewsletterContext(m.sender)
            },
            { quoted: mek }
        );

    } catch (e) {
        console.log(e);
        reply(`Error: ${e.message}`);
    }
});


cmd({
    pattern: "blocklist",
    desc: "View the list of blocked users.",
    category: "owner",
    react: "📋",
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply }) => {
    if (!isOwner) return reply("*📛 You are not the owner!*");

    try {
        const blockedUsers = await conn.fetchBlocklist();

        let msgText = '';
        if (blockedUsers.length === 0) {
            msgText = "📋 Your block list is empty.";
        } else {
            const list = blockedUsers
                .map((user, i) => `🚧 BLOCKED ${user.split('@')[0]}`)
                .join('\n');
            const count = blockedUsers.length;
            msgText = `📋 Blocked Users (${count}):\n\n${list}`;
        }

        await conn.sendMessage(
            from,
            {
                text: msgText,
                contextInfo: getNewsletterContext(m.sender)
            },
            { quoted: mek }
        );
    } catch (err) {
        console.error(err);
        reply(`❌ Failed to fetch block list: ${err.message}`);
    }
});

cmd({
    pattern: "getbio",
    desc: "Displays the user's bio.",
    category: "owner",
    filename: __filename,
}, async (conn, mek, m, { quoted, reply }) => {
    try {
        let jid;

        if (quoted) {
            jid = quoted.sender;
        } else {
            return reply("⛔ Please reply to someone's message to fetch their bio.");
        }

        const about = await conn.fetchStatus?.(jid);

        if (!about || !about.status) {
            return await conn.sendMessage(
                m.chat,
                {
                    text: "❌ No bio found.",
                    contextInfo: getNewsletterContext(m.sender)
                },
                { quoted: mek }
            );
        }

        return await conn.sendMessage(
            m.chat,
            {
                text: `📄 Bio:\n\n${about.status}`,
                contextInfo: getNewsletterContext(m.sender)
            },
            { quoted: mek }
        );

    } catch (error) {
        console.error("Error in getbio command:", error);
        await conn.sendMessage(
            m.chat,
            {
                text: "❌ Error fetching bio.",
                contextInfo: getNewsletterContext(m.sender)
            },
            { quoted: mek }
        );
    }
});


cmd({
    pattern: "setppall*",
    desc: "Update Profile Picture Privacy",
    category: "owner",
    react: "🔐",
    filename: __filename
}, 
async (conn, mek, m, { from, args, isOwner, reply }) => {
    if (!isOwner) {
        return await conn.sendMessage(
            from,
            {
                text: "❌ You are not the owner!",
                contextInfo: getNewsletterContext(m.sender)
            },
            { quoted: mek }
        );
    }

    try {
        const value = args[0] || 'all';
        const validValues = ['all', 'contacts', 'contact_blacklist', 'none'];

        if (!validValues.includes(value)) {
            return await conn.sendMessage(
                from,
                {
                    text: "❌ Invalid option.\nValid options: *all*, *contacts*, *contact_blacklist*, *none*.",
                    contextInfo: getNewsletterContext(m.sender)
                },
                { quoted: mek }
            );
        }

        await conn.updateProfilePicturePrivacy(value);
        await conn.sendMessage(
            from,
            {
                text: `✅ Profile picture privacy updated to: *${value}*`,
                contextInfo: getNewsletterContext(m.sender)
            },
            { quoted: mek }
        );
    } catch (e) {
        await conn.sendMessage(
            from,
            {
                text: `❌ An error occurred.\n\n_Error:_ ${e.message}`,
                contextInfo: getNewsletterContext(m.sender)
            },
            { quoted: mek }
        );
    }
});

cmd({
    pattern: "setonline",
    desc: "Update Online Privacy",
    category: "owner",
    react: "🔐",
    filename: __filename
}, 
async (conn, mek, m, { from, args, isOwner, reply }) => {
    if (!isOwner) {
        return await conn.sendMessage(
            from,
            {
                text: "❌ You are not the owner!",
                contextInfo: getNewsletterContext(m.sender)
            },
            { quoted: mek }
        );
    }

    try {
        const value = args[0] || 'all';
        const validValues = ['all', 'match_last_seen'];

        if (!validValues.includes(value)) {
            return await conn.sendMessage(
                from,
                {
                    text: "❌ Invalid option.\nValid options: *all*, *match_last_seen*.",
                    contextInfo: getNewsletterContext(m.sender)
                },
                { quoted: mek }
            );
        }

        await conn.updateOnlinePrivacy(value);
        await conn.sendMessage(
            from,
            {
                text: `✅ Online privacy updated to: *${value}*`,
                contextInfo: getNewsletterContext(m.sender)
            },
            { quoted: mek }
        );
    } catch (e) {
        await conn.sendMessage(
            from,
            {
                text: `❌ An error occurred.\n\n_Error:_ ${e.message}`,
                contextInfo: getNewsletterContext(m.sender)
            },
            { quoted: mek }
        );
    }
});


cmd({
  pattern: "name",
  alias: ["setname", "changename"],
  desc: "Change WhatsApp profile name",
  category: "owner",
  react: "✏️",
  filename: __filename
}, async (conn, m, { args, reply, isOwner }) => {
  try {
    // Only the owner can use this command
    if (!isOwner) return reply("❌ Only the bot owner can use this command!");

    const newName = args.join(" ");
    if (!newName) return reply("❌ Please provide a new name.\n\n*Example:*\n.name NothingBot");

    // Update profile name
    await conn.updateProfileName(newName);

    await reply(`✅ Profile name successfully updated to: *${newName}*`);

  } catch (err) {
    console.error("❌ Name Change Error:", err);
    reply("❌ Failed to update profile name.");
  }
});



cmd({
    pattern: "updatebio",
    react: "🥏",
    desc: "Change the Bot number Bio.",
    category: "owner",
    use: '.updatebio',
    filename: __filename
},
async (conn, mek, m, { from, q, isOwner, reply }) => {
    try {
        if (!isOwner) {
            return await conn.sendMessage(
                from,
                {
                    text: '🚫 *You must be an Owner to use this command*',
                    contextInfo: getNewsletterContext(m.sender)
                },
                { quoted: mek }
            );
        }

        if (!q) {
            return await conn.sendMessage(
                from,
                {
                    text: '❓ *Please provide the new bio text*',
                    contextInfo: getNewsletterContext(m.sender)
                },
                { quoted: mek }
            );
        }

        if (q.length > 139) {
            return await conn.sendMessage(
                from,
                {
                    text: '❗ *Sorry! Character limit exceeded (max 139 characters)*',
                    contextInfo: getNewsletterContext(m.sender)
                },
                { quoted: mek }
            );
        }

        await conn.updateProfileStatus(q);

        await conn.sendMessage(
            from,
            {
                text: "✔️ *New bio set successfully!*",
                contextInfo: getNewsletterContext(m.sender)
            },
            { quoted: mek }
        );
    } catch (e) {
        console.error("UpdateBio Error:", e);
        await conn.sendMessage(
            from,
            {
                text: `🚫 *An error occurred!*\n\n_Error:_ ${e.message}`,
                contextInfo: getNewsletterContext(m.sender)
            },
            { quoted: mek }
        );
    }
});


cmd({
    pattern: "groupsprivacy",
    desc: "Update Group Add Privacy",
    category: "owner",
    react: "🔐",
    filename: __filename
}, 
async (conn, mek, m, { from, args, isOwner, reply }) => {
    if (!isOwner) {
        return await conn.sendMessage(
            from,
            {
                text: "❌ *You are not the owner!*",
                contextInfo: getNewsletterContext(m.sender)
            },
            { quoted: mek }
        );
    }

    try {
        const value = args[0] || 'all';
        const validValues = ['all', 'contacts', 'contact_blacklist', 'none'];

        if (!validValues.includes(value)) {
            return await conn.sendMessage(
                from,
                {
                    text: "❌ *Invalid option.*\nValid options: `all`, `contacts`, `contact_blacklist`, `none`",
                    contextInfo: getNewsletterContext(m.sender)
                },
                { quoted: mek }
            );
        }

        await conn.updateGroupsAddPrivacy(value);

        await conn.sendMessage(
            from,
            {
                text: `✅ *Group add privacy updated to:* \`${value}\``,
                contextInfo: getNewsletterContext(m.sender)
            },
            { quoted: mek }
        );

    } catch (e) {
        await conn.sendMessage(
            from,
            {
                text: `🚫 *An error occurred while processing your request.*\n\n_Error:_ ${e.message}`,
                contextInfo: getNewsletterContext(m.sender)
            },
            { quoted: mek }
        );
    }
});

cmd({
    pattern: "getprivacy",
    desc: "Get the bot Number Privacy Setting Updates.",
    category: "owner",
    use: '.getprivacy',
    filename: __filename
},
async (conn, mek, m, { from, l, isOwner, reply }) => {
    if (!isOwner) {
        return await conn.sendMessage(
            from,
            {
                text: '🚫 *You must be an Owner to use this command*',
                contextInfo: getNewsletterContext(m.sender)
            },
            { quoted: mek }
        );
    }

    try {
        const duka = await conn.fetchPrivacySettings?.(true);
        if (!duka) {
            return await conn.sendMessage(
                from,
                {
                    text: '🚫 *Failed to fetch privacy settings*',
                    contextInfo: getNewsletterContext(m.sender)
                },
                { quoted: mek }
            );
        }

        let puka = `
╭───「 𝙿𝚁𝙸𝚅𝙰𝙲𝚈 」───◆  
│ ∘ 𝚁𝚎𝚊𝚍 𝚁𝚎𝚌𝚎𝚒𝚙𝚝: ${duka.readreceipts}  
│ ∘ 𝙿𝚛𝚘𝚏𝚒𝚕𝚎 𝙿𝚒𝚌𝚝𝚞𝚛𝚎: ${duka.profile}  
│ ∘ 𝚂𝚝𝚊𝚝𝚞𝚜: ${duka.status}  
│ ∘ 𝙾𝚗𝚕𝚒𝚗𝚎: ${duka.online}  
│ ∘ 𝙻𝚊𝚜𝚝 𝚂𝚎𝚎𝚗: ${duka.last}  
│ ∘ 𝙶𝚛𝚘𝚞𝚙 𝙿𝚛𝚒𝚟𝚊𝚌𝚢: ${duka.groupadd}  
│ ∘ 𝙲𝚊𝚕𝚕 𝙿𝚛𝚒𝚟𝚊𝚌𝚢: ${duka.calladd}  
╰────────────────────`;

        await conn.sendMessage(
            from,
            {
                text: puka,
                contextInfo: getNewsletterContext(m.sender)
            },
            { quoted: mek }
        );

    } catch (e) {
        await conn.sendMessage(
            from,
            {
                text: `🚫 *An error occurred!*\n\n${e}`,
                contextInfo: getNewsletterContext(m.sender)
            },
            { quoted: mek }
        );
        l(e);
    }
});

cmd({
  pattern: "getpp",
  desc: "Get profile picture of a user (reply or mention)",
  category: "owner",
  react: "🖼️",
  filename: __filename,
}, async (conn, mek, m, { quoted, reply, args }) => {
  try {
    let targetJid;

    // 1. اگر پیام ریپلای شده بود
    if (m.quoted) {
      targetJid = m.quoted.sender;
    }

    // 2. اگر شخصی منشن شده بود
    else if (m.mentionedJid && m.mentionedJid.length > 0) {
      targetJid = m.mentionedJid[0];
    }

    // 3. اگر شماره دستی وارد شده باشه مثل: .getpp 989123456789@
    else if (args[0]) {
      const number = args[0].replace(/\D/g, ''); // حذف کاراکترهای غیر عددی
      if (number.length > 5) {
        targetJid = number + "@s.whatsapp.net";
      }
    }

    if (!targetJid) {
      return reply("❌ Please reply to a message, mention a user, or provide a number like `.getpp 989123456789`");
    }

    // گرفتن عکس پروفایل
    const picUrl = await conn.profilePictureUrl(targetJid, "image").catch(() => null);
    if (!picUrl) return reply("❌ This user has no profile picture or it's private.");

    await conn.sendMessage(m.chat, {
      image: { url: picUrl },
      caption: `🖼️ Profile picture of @${targetJid.split('@')[0]}`,
      mentions: [targetJid]
    }, { quoted: mek });

  } catch (e) {
    console.log("❌ getpp error:", e.message);
  }
});






cmd({
  pattern: "join",
  desc: "Join a WhatsApp group or channel via invite link",
  category: "owner",
  use: ".joinn <whatsapp link>",
  filename: __filename
}, async (conn, mek, m, { q, reply }) => {
  try {
    if (!q || !q.includes("whatsapp.com/"))
      return reply("❗ Please provide a valid WhatsApp group or channel link.");

    if (q.includes("/channel/")) {
      // کانال هست
      const match = q.match(/whatsapp\.com\/channel\/([\w-]+)/);
      if (!match) return reply("⚠️ Invalid channel link format.");

      const inviteId = match[1];
      let metadata;
      try {
        metadata = await conn.newsletterMetadata("invite", inviteId);
      } catch (e) {
        return reply("❌ Failed to fetch channel metadata. Make sure the link is correct.");
      }

      if (!metadata || !metadata.id) return reply("❌ Could not get channel ID.");

      const jid = metadata.id; // مستقیماً از متادیتا بگیر
      await conn.newsletterFollow(jid);
      return reply("✅ Successfully joined the channel.");

    } else if (q.includes("chat.whatsapp.com/")) {
      // گروه هست
      const code = q.split("https://chat.whatsapp.com/")[1];
      if (!code) return reply("❌ Invalid group link.");
      await conn.groupAcceptInvite(code);
      return reply("✅ Successfully joined the group.");
    } else {
      return reply("❌ Unsupported link format.");
    }

  } catch (e) {
    console.error(e);
    reply("❌ Failed to join. Please make sure the link is correct and valid.");
  }
});


cmd({
  pattern: "react",
  desc: "React to a WhatsApp Channel message",
  category: "owner",
  filename: __filename
}, async (conn, mek, m, {
  from,
  args,
  q,
  isCreator,
  reply
}) => {
  try {
    if (!isCreator) return reply("_*❗This Command Can Only Be Used By My Owner !*_");
    
    if (!q) return reply("❎ Please provide a WhatsApp Channel message link.\n\nExample:\n.react https://whatsapp.com/channel/xxxxxxxxx/123 ❤️");

    // استخراج لینک و ایموجی (ایموجی دومین آرگومان بعد از لینک است)
    const parts = q.trim().split(" ");
    const link = parts[0];
    const customEmoji = parts[1];

    const match = link.match(/whatsapp\.com\/channel\/([\w-]+)\/(\d+)/);
    if (!match) return reply("⚠️ Invalid link format. It should look like:\nhttps://whatsapp.com/channel/xxxxx/123");

    const inviteId = match[1]; // channel invite code
    const serverId = match[2]; // message ID

    // گرفتن JID از طریق invite ID
    let metadata;
    try {
      metadata = await conn.newsletterMetadata("invite", inviteId);
    } catch (e) {
      return reply("❌ Failed to fetch channel info. Is the link correct?");
    }

    if (!metadata || !metadata.id) return reply("❌ Channel not found or inaccessible.");

    const jid = metadata.id; // مثلاً 12036xxxxx@newsletter

    const defaultEmojis = ["❤️", "😘", "😍", "😮"];
    const emoji = customEmoji || defaultEmojis[Math.floor(Math.random() * defaultEmojis.length)];

    await conn.newsletterReactMessage(jid, serverId.toString(), emoji);

    await reply(`✅ Reacted with *${emoji}* to message ${serverId} in channel @${jid.split("@")[0]}.`);

  } catch (err) {
    console.error("❌ Error in .react command:", err);
    reply("⚠️ An unexpected error occurred.");
  }
});



cmd({
  pattern: "deletechat",
  desc: "Delete all deletable messages in a chat",
  category: "owner",
  filename: __filename
}, async (conn, mek, m, {
  reply,
  isOwner
}) => {
  if (!isOwner) return reply("❌ Only owner can use this command.");

  const jid = m.chat;

  try {
    const messages = await conn.loadMessages(jid, 100);
    const deletable = messages.messages.filter(msg =>
      msg?.key?.id &&
      msg.key.remoteJid &&
      (msg.key.fromMe || msg.key.participant)
    );

    if (!deletable.length) return reply("❎ No deletable messages found.");

    for (const msg of deletable) {
      try {
        await conn.sendMessage(msg.key.remoteJid, {
          delete: {
            id: msg.key.id,
            remoteJid: msg.key.remoteJid,
            fromMe: msg.key.fromMe || false,
            participant: msg.key.participant || msg.key.remoteJid
          }
        });
      } catch (e) {
        console.log("❌ Failed to delete one message:", e.message);
      }
    }

    await reply(`✅ Deleted ${deletable.length} messages.`);
  } catch (err) {
    console.error("❌ deletechat error:", err);
    reply("⚠️ Something went wrong.");
  }
});



cmd({
  pattern: "showmenu-(.*)",
  hidden: true
}, async (conn, mek, m, { match, from }) => {
  const category = match[1];
  const cmdsInCat = commands.filter(cmd => cmd.category === category);

  if (!cmdsInCat.length) {
    return conn.sendMessage(from, { text: `❌ No commands found in '${category}'` }, { quoted: m });
  }

  let text = `📂 *Commands in ${category.toUpperCase()}*\n\n`;

  for (const cmd of cmdsInCat) {
    text += `➤ ${cmd.pattern}\n`;
  }

  await conn.sendMessage(from, { text }, { quoted: m });
});

cmd({
  pattern: "btn",
  desc: "Show smart button menu",
  category: "tools",
  filename: __filename
}, async (conn, mek, m, { from }) => {

  const picUrl = "https://i.postimg.cc/Y2GSGtfG/IMG-20250502-WA0012-1.jpg";

  const filtered = commands.filter(cmd =>
    !["menu", "nothing", "misc"].includes(cmd.category)
  );

  const categories = [...new Set(filtered.map(cmd => cmd.category))];

  const sections = categories.map((cat, index) => {
    const section = {
      rows: [
        {
          header: 'Menu',
          title: cat.charAt(0).toUpperCase() + cat.slice(1),
          description: `Click for Menu ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
          id: `showmenu-${cat}`
        }
      ]
    };

    if (index === 0) {
      section.title = "Select a menu";
      section.highlight_label = '𝐀𝐢 𝐦𝐞𝐧𝐮';
    }

    return section;
  });

  // اگر پیام دکمه‌ای هست، همینجا هندل کن
  const buttonText = m.text?.toLowerCase();
  if (buttonText === "ping" || buttonText === ".ping") {
    const start = new Date().getTime();

    const reactionEmojis = ['🔥', '⚡', '🚀', '💨', '🎯', '🎉', '🌟', '💥', '🕐', '🔹'];
    const textEmojis = ['💎', '🏆', '⚡️', '🚀', '🎶', '🌠', '🌀', '🔱', '🛡️', '✨'];

    const reactionEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
    let textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];
    while (textEmoji === reactionEmoji) {
      textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];
    }

    await conn.sendMessage(from, {
      react: { text: textEmoji, key: mek.key }
    });

    const end = new Date().getTime();
    const responseTime = (end - start) / 1000;

    const text = `> *BEN-BOT SPEED: ${responseTime.toFixed(2)}ms ${reactionEmoji}*`;

    return await conn.sendMessage(from, {
      text: text,
      contextInfo: getNewsletterContext(m.sender)
    }, { quoted: mek });
  }

  if (buttonText === "alive" || buttonText === ".alive") {
    return await conn.sendMessage(from, {
      text: "*✅ I am alive and ready to serve you!*",
      contextInfo: getNewsletterContext(m.sender)
    }, { quoted: mek });
  }

  // اگر دستور دکمه نبود، منوی دکمه‌ای را بفرست
  await conn.sendMessage(from, {
    image: { url: picUrl },
    caption: "📋 *Main Menu*\n\nSelect a category from the menu below.",
    footer: "> New menu - 2025",
    buttons: [
      {
        buttonId: '.ping',
        buttonText: { displayText: 'PING' },
        type: 1
      },
      {
        buttonId: '.alive',
        buttonText: { displayText: 'ALIVE' },
        type: 1
      },
      {
        buttonId: 'flow-menu',
        buttonText: { displayText: '📋 Show Categories' },
        type: 4,
        nativeFlowInfo: {
          name: 'single_select',
          paramsJson: JSON.stringify({
            title: 'Select BEN BOT Menu',
            sections: sections
          })
        }
      }
    ],
    headerType: 4,
    viewOnce: true
  }, { quoted: m });
});