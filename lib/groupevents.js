const { isJidGroup } = require('@whiskeysockets/baileys');
const config = require('../config');

const getContextInfo = (m) => ({
    mentionedJid: [m.sender],
    forwardingScore: 999,
    isForwarded: true,
});

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

const ppUrls = [
    'https://i.ibb.co/KhYC4FY/1221bc0bdd2354b42b293317ff2adbcf-icon.png',
    'https://i.ibb.co/KhYC4FY/1221bc0bdd2354b42b293317ff2adbcf-icon.png',
    'https://i.ibb.co/KhYC4FY/1221bc0bdd2354b42b293317ff2adbcf-icon.png',
];

const GroupEvents = async (conn, update) => {
    try {
        const isGroup = isJidGroup(update.id);
        if (!isGroup) return;

        const metadata = await conn.groupMetadata(update.id);
        const participants = update.participants;
        const desc = metadata.desc || "No Description";
        const groupMembersCount = metadata.participants.length;

        let ppUrl;
        try {
            ppUrl = await conn.profilePictureUrl(update.id, 'image');
        } catch {
            ppUrl = ppUrls[Math.floor(Math.random() * ppUrls.length)];
        }

        for (const num of participants) {
            const userName = num.split("@")[0];
            const timestamp = new Date().toLocaleString();

            if (update.action === "add" && config.WELCOME === "true") {
                const WelcomeText = `Hey @${userName} 👋\n` +
                    `Welcome to *${metadata.subject}*! 🎉\n` +
                    `You're member number ${groupMembersCount} here. 🙏\n` +
                    `Joined at: *${timestamp}*\n` +
                    `Please take a moment to check out the group description so everything's clear:\n` +
                    `${desc}\n\n` +
                    `*ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴᴏᴛʜɪɴɢ ᴛᴇᴄʜ*`;

                await conn.sendMessage(update.id, {
                    image: { url: ppUrl },
                    caption: WelcomeText,
                    mentions: [num],
                    contextInfo: getNewsletterContext(num),
                });

            } else if (update.action === "remove" && config.WELCOME === "true") {
                const GoodbyeText = `Hey @${userName}, looks like you’re heading out. 👋\n` +
                    `We’ll miss you around here!\n` +
                    `Left at: *${timestamp}*\n` +
                    `Now the group has ${groupMembersCount} members. 👍\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴᴏᴛʜɪɴɢ ᴛᴇᴄʜ*`;

                await conn.sendMessage(update.id, {
                    image: { url: ppUrl },
                    caption: GoodbyeText,
                    mentions: [num],
                    contextInfo: getNewsletterContext(num),
                });

            } else if (update.action === "demote" && config.ADMIN_EVENTS === "true") {
                const demoter = update.author.split("@")[0];
                await conn.sendMessage(update.id, {
                    image: { url: 'https://i.postimg.cc/Y2GSGtfG/IMG-20250502-WA0012-1.jpg' },
                    caption: `@${demoter} removed @${userName} from *admin*. 👀\n` +
                             `Take your responsibility seriously and lead with strength! ⚔️\n\n` +
                             `🕒 *Time:* ${timestamp}\n` +
                             `👥 *Group:* ${metadata.subject}\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴᴏᴛʜɪɴɢ ᴛᴇᴄʜ*`,
                    mentions: [update.author, num],
                    contextInfo: getNewsletterContext(num),
                });

            } else if (update.action === "promote" && config.ADMIN_EVENTS === "true") {
                const promoter = update.author.split("@")[0];
                await conn.sendMessage(update.id, {
                    image: { url: 'https://i.postimg.cc/Y2GSGtfG/IMG-20250502-WA0012-1.jpg' },
                    caption: `Hey @${promoter}, you're now an *admin*! 🛡️\n` +
                             `Handle your responsibility with care and lead the way! 🎉\n\n` +
                             `🕒 *Time:* ${timestamp}\n` +
                             `👥 *Group:* ${metadata.subject}\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴᴏᴛʜɪɴɢ ᴛᴇᴄʜ*`,
                    mentions: [update.author, num],
                    contextInfo: getNewsletterContext(num),
                });
            }
        }
    } catch (err) {
        console.error('Group event error:', err);
    }
};

module.exports = GroupEvents;
