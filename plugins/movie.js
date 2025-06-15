const fetch = require("node-fetch");
const config = require('../config');
const { ytsearch } = require('@dark-yasiya/yt-dl.js');
const { getConfig, setConfig } = require('../lib/configdb');
const axios = require("axios");
const { fetchJson } = require("../lib/functions");
const { downloadTiktok } = require("@mrnima/tiktok-downloader");
const { facebook } = require("@mrnima/facebook-downloader");
const cheerio = require("cheerio");
const { igdl } = require("ruhend-scraper");
const { cmd, commands } = require('../command');


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





cmd({
    pattern: "movie",
    desc: "Fetch detailed information about a movie.",
    category: "movie",
    react: "🎬",
    filename: __filename
},
async (conn, mek, m, { from, reply, sender, args }) => {
    try {
        const movieName = args.length > 0 ? args.join(' ') : m.text.replace(/^[\.\#\$\!]?movie\s?/i, '').trim();
        
        if (!movieName) {
            return reply("📽️ Please provide the name of the movie.\nExample: .movie Captain America", null, { contextInfo: getNewsletterContext(sender) });
        }

        const apiUrl = `https://apis.davidcyriltech.my.id/imdb?query=${encodeURIComponent(movieName)}`;
        const response = await axios.get(apiUrl);

        if (!response.data.status || !response.data.movie) {
            return reply("🚫 Movie not found. Please check the name and try again.", null, { contextInfo: getNewsletterContext(sender) });
        }

        const movie = response.data.movie;
        
        const dec = `
🎬 *${movie.title}* (${movie.year}) ${movie.rated || ''}

⭐ *IMDb:* ${movie.imdbRating || 'N/A'} | 🍅 *Rotten Tomatoes:* ${movie.ratings.find(r => r.source === 'Rotten Tomatoes')?.value || 'N/A'} | 💰 *Box Office:* ${movie.boxoffice || 'N/A'}

📅 *Released:* ${new Date(movie.released).toLocaleDateString()}
⏳ *Runtime:* ${movie.runtime}
🎭 *Genre:* ${movie.genres}

📝 *Plot:* ${movie.plot}

🎥 *Director:* ${movie.director}
✍️ *Writer:* ${movie.writer}
🌟 *Actors:* ${movie.actors}

🌍 *Country:* ${movie.country}
🗣️ *Language:* ${movie.languages}
🏆 *Awards:* ${movie.awards || 'None'}

[View on IMDb](${movie.imdbUrl})
`;

        await conn.sendMessage(
            from,
            {
                image: { 
                    url: movie.poster && movie.poster !== 'N/A' ? movie.poster : 'https://files.catbox.moe/6vrc2s.jpg'
                },
                caption: dec,
                contextInfo: getNewsletterContext(sender)
            },
            { quoted: mek }
        );

    } catch (e) {
        console.error('Movie command error:', e);
        reply(`❌ Error: ${e.message}`, null, { contextInfo: getNewsletterContext(sender) });
    }
});