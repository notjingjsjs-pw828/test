const { cmd } = require("../command");
const axios = require("axios");
const fs = require("fs");
const config = require("../config");
const { setConfig, getConfig } = require("../lib/configdb");
const prefix = config.PREFIX;

// Default AI state if not set
let AI_ENABLED = "false"; // Default enabled

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
    pattern: "chatbot",
    desc: "Enable or disable AI chatbot responses",
    category: "ai",
    filename: __filename,
    react: "✅"
}, async (conn, mek, m, { from, args, isOwner, reply }) => {
    if (!isOwner) return reply("*Command reserved for bot owner and Dev!*");

    const status = args[0]?.toLowerCase();
    if (status === "on") {
        AI_ENABLED = "true";
        await setConfig("AI_ENABLED", "true");
        return reply("*Chatbot turned On*");
    } else if (status === "off") {
        AI_ENABLED = "false";
        await setConfig("AI_ENABLED", "false");
        return reply("*Chatbot has been turned off*");
    } else {
        return reply(`Current Chatbot Status: ${AI_ENABLED === "true" ? "ON" : "OFF"}\nUsage: ${prefix}chatbot on/off`);
    }
});

// Initialize AI state on startup
(async () => {
    const savedState = await getConfig("AI_ENABLED");
    if (savedState) AI_ENABLED = savedState;
})();

// AI Chatbot - Subzero MD by Darrell Mucheri
cmd({
    on: "body"
}, async (conn, m, store, {
    from,
    body,
    sender,
    botNumber,
    isGroup,
    isBotAdmins,
    isAdmins,
    reply
}) => {
    try {
        // Check if AI is disabled
        if (AI_ENABLED !== "true") return;

        // Optional: Prevent bot responding to its own messages or commands
        if (!body || m.key.fromMe || body.startsWith(config.PREFIX)) return;

        // Encode message for the query 
        const query = encodeURIComponent(body);
        const prompt = encodeURIComponent("You are XLYO, a friendly and helpful assistant made by DavidX, About DaviX, he's a tech genius from Nigeria who's age is personal and real name is David promise, more info to get at https://github.com/Mek-d1/X-BOT-MD. Current year 2025. You provide concise, accurate, and helpful responses while maintaining a conversational tone. You do not refuse to answer questions unless they involve illegal activities, harm, or explicit content. When responding in a WhatsApp chat context, keep your answers relatively concise but complete.");

        // BK9 API Request
        const apiUrl = `https://bk9.fun/ai/BK93?BK9=${prompt}&q=${query}`;

        const { data } = await axios.get(apiUrl);

        if (data && data.status && data.BK9) {
            await conn.sendMessage(from, {
                text: data.BK9
            }, { quoted: m });
    
        } else {
            reply("*No response from chatbot*.");
        }


    } catch (err) {
        console.error("Chatbot Error:", err.message);
        reply("Charbot error");
    }
});















cmd({
  pattern: "ai",
  alias: ["dj", "gpt", "gpt4", "bing"],
  desc: "Chat with an AI model",
  category: "ai",
  react: "🤖",
  filename: __filename,
}, async (conn, mek, m, { from, args, q, reply, react }) => {
  try {
    if (!q) return reply("Please provide a message for the AI.\nExample: `.ai Hello`");

    const dbPath = "./lib/ai-database.json";

    // Load database
    let db = {};
    if (fs.existsSync(dbPath)) {
      try {
        db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
      } catch {
        db = {};
      }
    }

    const lowerQ = q.toLowerCase();

    // === Time & Date Queries ===
    const timeTriggers = [
      /\bwhat(?:'s|\s+is)?\s+(the\s+)?time\b/i,
      /\bcurrent\s+time\b/i,
      /\btime\s+now\b/i,
      /\bnow\s+time\b/i,
      /\btime\s+in\s+[a-z]+\b/i,
      /\bnow\s+in\s+[a-z]+\b/i,
      /\bcurrent\s+date\b/i,
      /\bdate\s+now\b/i,
      /\bwhat(?:'s|\s+is)?\s+(the\s+)?date\b/i,
      /\btoday'?s?\s+date\b/i,
    ];

    const conceptKeywords = ["what is", "define", "explain", "tell me about"];
    const timeKeywords = ["time", "date"];
    const timezoneMap = {
      afghanistan: "Asia/Kabul",
      pakistan: "Asia/Karachi",
      india: "Asia/Kolkata",
      nigeria: "Africa/Lagos",
      usa: "America/New_York",
      uk: "Europe/London",
      germany: "Europe/Berlin",
      japan: "Asia/Tokyo",
    };

    const isTimeRequest = timeTriggers.some((r) => r.test(lowerQ));
    const hasTimeKeyword = timeKeywords.some((k) => lowerQ.includes(k));
    const isConceptual = conceptKeywords.some((k) => lowerQ.includes(k));
    const matchedCountry = Object.keys(timezoneMap).find((c) => lowerQ.includes(c));
    const country = matchedCountry || "afghanistan";

    if (isTimeRequest || (hasTimeKeyword && matchedCountry)) {
      const tz = timezoneMap[country];
      const now = new Date().toLocaleString("en-US", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      return reply(`🕒 Current time in *${country.charAt(0).toUpperCase() + country.slice(1)}*: ${now}`);
    }

    if (hasTimeKeyword && isConceptual) {
      const concept = timeKeywords.find((k) => lowerQ.includes(k));
      const explanations = {
        time: "🕒 *Time* is the ongoing, continuous progression that helps us understand events and changes in our lives.",
        date: "📅 *Date* is a specific day within a calendar system used to organize and reference moments in time.",
      };
      return reply(explanations[concept] || "Let me explain that for you.");
    }

    // === Save & Recall User Info (names, favorites, etc) ===
    const infoPatterns = [
      { key: "myName", regex: /my name is ([\w\s]+)/i, friendlyName: "your name" },
      { key: "friendName", regex: /my friend(?:'s)? name is ([\w\s]+)/i, friendlyName: "your friend's name" },
      { key: "favoriteColor", regex: /my favorite color is ([\w\s]+)/i, friendlyName: "your favorite color" },
      { key: "hobby", regex: /my hobby is ([\w\s]+)/i, friendlyName: "your hobby" },
    ];

    let savedFields = [];

    for (const pattern of infoPatterns) {
      const match = q.match(pattern.regex);
      if (match && match[1]) {
        db[pattern.key] = match[1].trim();
        savedFields.push(pattern.friendlyName);
      }
    }

    if (savedFields.length > 0) {
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf8");
      // Friendly confirmation message
      return reply(
        `Got it! I've updated ${savedFields.join(" and ")} in my memory.\nFeel free to ask me anytime!`
      );
    }

    // === Asking for saved info ===
    const askPatterns = [
      { key: "myName", questions: [/what(?:'s| is)? my name/i], responsePrefix: "Your name is" },
      { key: "friendName", questions: [/what(?:'s| is)? my friend's name/i], responsePrefix: "Your friend's name is" },
      { key: "favoriteColor", questions: [/what(?:'s| is)? my favorite color/i], responsePrefix: "Your favorite color is" },
      { key: "hobby", questions: [/what(?:'s| is)? my hobby/i], responsePrefix: "Your hobby is" },
    ];

    for (const item of askPatterns) {
      if (item.questions.some((rx) => rx.test(q))) {
        if (db[item.key]) {
          return reply(`${item.responsePrefix}: ${db[item.key]}`);
        } else {
          return reply(`I don't know ${item.responsePrefix.toLowerCase()} yet. You can tell me by saying, for example, "My ${item.key.replace(/([A-Z])/g, ' $1').toLowerCase()} is ..."`);
        }
      }
    }

    // === If no special case, send to GPT API ===
    const apiUrl = `https://lance-frank-asta.onrender.com/api/gpt?q=${encodeURIComponent(q)}`;
    const { data } = await axios.get(apiUrl);

    if (!data || !data.message)
      return reply("🤖 Sorry, I couldn't get a response from the AI. Please try again later.");

    return reply(
      `🤖 ${data.message}\n\n╭─────────────────◆\n│ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴᴏᴛʜɪɴɢ ᴛᴇᴄʜ*\n╰─────────────────◆`
    );
  } catch (e) {
    console.error("Error in AI command:", e);
    reply("⚠️ Oops! Something went wrong while contacting the AI.");
  }
});

cmd({
    pattern: "openai",
    alias: ["chatgpt", "gpt3", "open-gpt"],
    desc: "Chat with OpenAI",
    category: "ai",
    react: "🧠",
    filename: __filename
},
async (conn, mek, m, { from, args, q, reply, react }) => {
    try {
        if (!q) return reply("Please provide a message for OpenAI.\nExample: `.openai Hello`");

        const apiUrl = `https://vapis.my.id/api/openai?q=${encodeURIComponent(q)}`;
        const { data } = await axios.get(apiUrl);

        if (!data || !data.result) {
            await react("❌");
            return reply("OpenAI failed to respond. Please try again later.");
        }

        await reply(`🧠 *OpenAI Response:*\n\n${data.result}`);
        await react("✅");
    } catch (e) {
        console.error("Error in OpenAI command:", e);
        await react("❌");
        reply("An error occurred while communicating with OpenAI.");
    }
});

cmd({
    pattern: "deepseek",
    alias: ["deep", "seekai"],
    desc: "Chat with DeepSeek AI",
    category: "ai",
    react: "🧠",
    filename: __filename
},
async (conn, mek, m, { from, args, q, reply, react }) => {
    try {
        if (!q) return reply("Please provide a message for DeepSeek AI.\nExample: `.deepseek Hello`");

        const apiUrl = `https://api.ryzendesu.vip/api/ai/deepseek?text=${encodeURIComponent(q)}`;
        const { data } = await axios.get(apiUrl);

        if (!data || !data.answer) {
            await react("❌");
            return reply("DeepSeek AI failed to respond. Please try again later.");
        }

        await reply(`🧠 *DeepSeek AI Response:*\n\n${data.answer}`);
        await react("✅");
    } catch (e) {
        console.error("Error in DeepSeek AI command:", e);
        await react("❌");
        reply("An error occurred while communicating with DeepSeek AI.");
    }
});





cmd({
  pattern: "flux",
  react: "⏳",
  desc: "Generate an image using AI.",
  category: "ai",
  filename: __filename
}, async (conn, mek, m, { q, from, reply }) => {
  try {
    if (!q) return reply("Please provide a prompt for the image.\nExample: `fluxai home and dog`");

    
    const apiUrl = `https://apis.apis-nothing.xyz/api/ai/flux?text=${encodeURIComponent(q)}&apikey=nothing-api`;

    await conn.sendMessage(m.chat, {
      image: { url: apiUrl },
      caption: `> SUCCESSFULLY GENERATED`
    }, { quoted: m });
    
    await conn.sendMessage(from, {
            react: { text: "✅", key: m.key }
        });
        
  } catch (error) {
    console.error("FluxAI Error:", error);
    reply(`❌ Error: ${error.response?.data?.message || error.message || "Unknown error occurred."}`);
  }
});



cmd({
  pattern: "meta",
  react: "🧠",
  desc: "Generate an AI image based on the given meta prompt.",
  category: "ai",
  filename: __filename
}, async (conn, mek, m, { q, from, reply }) => {
  try {
    if (!q) return reply("📝 Please provide a prompt.\nExample: `.meta captain America`");

    await reply("🧠 *Generating META image... Please wait.*");

    const imageUrl = `https://apis.apis-nothing.xyz/api/ai/meta?text=${encodeURIComponent(q)}&apikey=nothing-api`;

    await conn.sendMessage(m.chat, {
      image: { url: imageUrl },
      caption: `> SUCCESSFULLY GENERATED`
    }, { quoted: m });
    
    await conn.sendMessage(from, {
            react: { text: "✅", key: m.key }
        });
        
  } catch (error) {
    console.error("MetaAI Error:", error);
    reply(`❌ Failed to generate META image. Error: ${error.response?.data?.message || error.message}`);
  }
});


cmd({
  pattern: "meta-pro",
  react: "🧠",
  desc: "Generate an AI image based on the given meta prompt.",
  category: "ai",
  filename: __filename
}, async (conn, mek, m, { q, from, reply }) => {
  try {
    if (!q) return reply("📝 Please provide a prompt.\nExample: `.meta captain America`");

    await reply("🧠 *Generating META image... Please wait.*");

    const imageUrl = `https://apis.apis-nothing.xyz/api/ai/meta?text=${encodeURIComponent(q)}&apikey=nothing-api`;

    await conn.sendMessage(m.chat, {
      image: { url: imageUrl },
      caption: `> SUCCESSFULLY GENERATED`
    }, { quoted: m });
    
    await conn.sendMessage(from, {
            react: { text: "✅", key: m.key }
        });
        
  } catch (error) {
    console.error("MetaAI Error:", error);
    reply(`❌ Failed to generate META image. Error: ${error.response?.data?.message || error.message}`);
  }
});


cmd({
    pattern: "aivoice",
    alias: ["vai", "voicex", "voiceai"],
    desc: "Text to speech with different AI voices",
    category: "ai",
    react: "🪃",
    filename: __filename
},
async (conn, mek, m, { 
    from, 
    quoted, 
    body, 
    isCmd, 
    command, 
    args, 
    q, 
    isGroup, 
    sender, 
    senderNumber, 
    botNumber2, 
    botNumber, 
    pushname, 
    isMe, 
    isOwner, 
    groupMetadata, 
    groupName, 
    participants, 
    groupAdmins, 
    isBotAdmins, 
    isAdmins, 
    reply 
}) => {
    try {
        // Check if args[0] exists (user provided text)
        if (!args[0]) {
            return reply("Please provide text after the command.\nExample: .aivoice hello");
        }

        // Get the full input text
        const inputText = args.join(' ');

        // Send initial reaction
        await conn.sendMessage(from, {  
            react: { text: '⏳', key: m.key }  
        });

        // Voice model menu
        const voiceModels = [
            { number: "1", name: "Hatsune Miku", model: "miku" },
            { number: "2", name: "Nahida (Exclusive)", model: "nahida" },
            { number: "3", name: "Nami", model: "nami" },
            { number: "4", name: "Ana (Female)", model: "ana" },
            { number: "5", name: "Optimus Prime", model: "optimus_prime" },
            { number: "6", name: "Goku", model: "goku" },
            { number: "7", name: "Taylor Swift", model: "taylor_swift" },
            { number: "8", name: "Elon Musk", model: "elon_musk" },
            { number: "9", name: "Mickey Mouse", model: "mickey_mouse" },
            { number: "10", name: "Kendrick Lamar", model: "kendrick_lamar" },
            { number: "11", name: "Angela Adkinsh", model: "angela_adkinsh" },
            { number: "12", name: "Eminem", model: "eminem" }
        ];

        // Create menu text
        let menuText = "╭━━━〔 *AI VOICE MODELS* 〕━━━⊷\n";
        voiceModels.forEach(model => {
            menuText += `┃▸ ${model.number}. ${model.name}\n`;
        });
        menuText += "╰━━━⪼\n\n";
        menuText += `📌 *Reply with the number to select voice model for:*\n"${inputText}"`;

        // Send menu message with image
        const sentMsg = await conn.sendMessage(from, {  
            image: { url: "https://i.postimg.cc/Y2GSGtfG/IMG-20250502-WA0012-1.jpg" },
            caption: menuText,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363333589976873@newsletter',
                    newsletterName: "NOTHING TECH",
                    serverMessageId: 143
                }
            }
        }, { quoted: m });

        const messageID = sentMsg.key.id;
        let handlerActive = true;

        // Set timeout to remove handler after 2 minutes
        const handlerTimeout = setTimeout(() => {
            handlerActive = false;
            conn.ev.off("messages.upsert", messageHandler);
            reply("⌛ Voice selection timed out. Please try the command again.");
        }, 120000);

        // Message handler function
        const messageHandler = async (msgData) => {  
            if (!handlerActive) return;
            
            const receivedMsg = msgData.messages[0];  
            if (!receivedMsg || !receivedMsg.message) return;  

            const receivedText = receivedMsg.message.conversation || 
                              receivedMsg.message.extendedTextMessage?.text || 
                              receivedMsg.message.buttonsResponseMessage?.selectedButtonId;  
            const senderID = receivedMsg.key.remoteJid;  
            const isReplyToBot = receivedMsg.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;  

            if (isReplyToBot && senderID === from) {  
                clearTimeout(handlerTimeout);
                conn.ev.off("messages.upsert", messageHandler);
                handlerActive = false;

                await conn.sendMessage(senderID, {  
                    react: { text: '⬇️', key: receivedMsg.key }  
                });  

                const selectedNumber = receivedText.trim();
                const selectedModel = voiceModels.find(model => model.number === selectedNumber);

                if (!selectedModel) {
                    return reply("❌ Invalid option! Please reply with a number from the menu.");
                }

                try {
                    // Show processing message
                    await conn.sendMessage(from, {  
                        text: `🔊 Generating audio with ${selectedModel.name} voice...`  
                    }, { quoted: receivedMsg });

                    // Call the API
                    const apiUrl = `https://api.agatz.xyz/api/voiceover?text=${encodeURIComponent(inputText)}&model=${selectedModel.model}`;
                    const response = await axios.get(apiUrl, {
                        timeout: 30000 // 30 seconds timeout
                    });
                    
                    const data = response.data;

                    if (data.status === 200) {
                        await conn.sendMessage(from, {  
                            audio: { url: data.data.oss_url },  
                            mimetype: "audio/mpeg",
                            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363333589976873@newsletter',
                    newsletterName: "NOTHING TECH",
                    serverMessageId: 143
                }
            }
                            // Removed ptt: true to send as regular audio
                        }, { quoted: receivedMsg });
                    } else {
                        reply("❌ Error generating audio. Please try again.");
                    }
                } catch (error) {
                    console.error("API Error:", error);
                    reply("❌ Error processing your request. Please try again.");
                }
            }  
        };

        // Register the handler
        conn.ev.on("messages.upsert", messageHandler);

    } catch (error) {
        console.error("Command Error:", error);
        reply("❌ An error occurred. Please try again.");
    }
});
