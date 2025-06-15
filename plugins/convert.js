const path = require("path");
const { fetchGif, fetchImage, gifToSticker } = require('../lib/sticker-utils');
const { tmpdir } = require("os");
const fetch = require("node-fetch");
const Crypto = require("crypto");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require("../lib/functions");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const {cmd , commands} = require('../command')
const { videoToWebp } = require('../lib/video-utils');
const { Sticker, createSticker, StickerTypes } = require("wa-sticker-formatter");
const config = require("../config");
const converter = require('../data/converter');
const stickerConverter = require('../data/sticker-converter');
const PDFDocument = require('pdfkit');
const { Buffer } = require('buffer');
const crypto = require('crypto');
const webp = require('node-webpmux');
const axios = require('axios');
const { exec } = require('child_process');


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




cmd(
  {
    pattern: 'take',
    alias: ['rename', 'stake'],
    desc: 'Create a sticker with a custom pack name.',
    category: 'convert',
    use: '<reply media or URL>',
    filename: __filename,
  },
  async (conn, mek, m, { quoted, args, q, reply, from }) => {
    if (!mek.quoted) {
      return await conn.sendMessage(m.chat, {
        text: `*Reply to any sticker or image.*`,
        contextInfo: getNewsletterContext(mek.sender)
      }, { quoted: mek });
    }

    let mime = mek.quoted.mtype;
    let pack = q || "NOTHING-BEN";

    if (mime === "imageMessage" || mime === "stickerMessage") {
      let media = await mek.quoted.download();
      let sticker = new Sticker(media, {
        pack: pack,
        type: StickerTypes.FULL,
        categories: ["🤩", "🎉"],
        id: "12345",
        quality: 75,
        background: 'transparent',
      });
      const buffer = await sticker.toBuffer();
      return conn.sendMessage(mek.chat, {
        sticker: buffer,
        contextInfo: getNewsletterContext(mek.sender)
      }, { quoted: mek });
    } else {
      return await conn.sendMessage(m.chat, {
        text: "*Uhh, Please reply to an image.*",
        contextInfo: getNewsletterContext(mek.sender)
      }, { quoted: mek });
    }
  }
);

// STICKER COMMAND
cmd(
  {
    pattern: 'sticker',
    alias: ['s'],
    desc: 'Convert GIF/Video to a sticker.',
    category: 'convert',
    use: '<reply media or URL>',
    filename: __filename,
  },
  async (conn, mek, m, { quoted, args, reply }) => {
    try {
      if (!mek.quoted) {
        return await conn.sendMessage(m.chat, {
          text: '*Reply to a video or GIF to convert it to a sticker!*',
          contextInfo: getNewsletterContext(mek.sender)
        }, { quoted: mek });
      }

      const mime = mek.quoted.mtype;
      if (!['videoMessage', 'imageMessage'].includes(mime)) {
        return await conn.sendMessage(m.chat, {
          text: '*Please reply to a valid video or GIF.*',
          contextInfo: getNewsletterContext(mek.sender)
        }, { quoted: mek });
      }

      const media = await mek.quoted.download();

      const webpBuffer = await videoToWebp(media);

      const sticker = new Sticker(webpBuffer, {
        pack: config.STICKER_NAME || 'My Pack',
        author: '',
        type: StickerTypes.FULL,
        categories: ['🤩', '🎉'],
        id: '12345',
        quality: 75,
        background: 'transparent',
      });

      const stickerBuffer = await sticker.toBuffer();
      return conn.sendMessage(mek.chat, {
        sticker: stickerBuffer,
        contextInfo: getNewsletterContext(mek.sender)
      }, { quoted: mek });

    } catch (error) {
      console.error(error);
      return conn.sendMessage(m.chat, {
        text: `❌ An error occurred: ${error.message}`,
        contextInfo: getNewsletterContext(mek.sender)
      }, { quoted: mek });
    }
  }
);

// ATTP COMMAND
cmd({
  pattern: "attp",
  desc: "Convert text to a GIF sticker.",
  react: "✨",
  category: "convert",
  use: ".attp HI",
  filename: __filename,
}, async (conn, mek, m, { args, reply }) => {
  try {
    if (!args[0]) {
      return await conn.sendMessage(m.chat, {
        text: "*Please provide text!*",
        contextInfo: getNewsletterContext(m.sender)
      }, { quoted: mek });
    }

    const gifBuffer = await fetchGif(`https://api-fix.onrender.com/api/maker/attp?text=${encodeURIComponent(args[0])}`);
    const stickerBuffer = await gifToSticker(gifBuffer);

    await conn.sendMessage(
      m.chat,
      {
        sticker: stickerBuffer,
        contextInfo: getNewsletterContext(m.sender)
      },
      { quoted: mek }
    );

  } catch (error) {
    return await conn.sendMessage(m.chat, {
      text: `❌ ${error.message}`,
      contextInfo: getNewsletterContext(m.sender)
    }, { quoted: mek });
  }
});



cmd({
  pattern: "toimg",
  desc: "Convert sticker to image",
  react: "🖼️",
  category: "convert",
  use: ".toimg (reply to sticker)",
  filename: __filename
}, async (client, m, message, match) => {
  try {
    if (!message.quoted || message.quoted.mtype !== "stickerMessage") {
      return await client.sendMessage(message.chat, {
        text: "🧷 Please reply to a sticker to convert it to image.",
        contextInfo: getNewsletterContext(m.sender)
      }, { quoted: message });
    }

    const media = await message.quoted.download();
    await client.sendMessage(message.chat, {
      image: media,
      caption: "✅ Sticker converted to image.",
      contextInfo: getNewsletterContext(m.sender)
    }, { quoted: message });

  } catch (error) {
    console.error("ToImg Error:", error);
    await client.sendMessage(message.chat, {
      text: "❌ Failed to convert sticker:\n" + error.message,
      contextInfo: getNewsletterContext(m.sender)
    }, { quoted: message });
  }
});



cmd({
    pattern: 'convert',
    alias: ['sticker2img', 'stoimg', 'stickertoimage', 's2i'],
    desc: 'Convert stickers or video to images or video',
    category: 'convert',
    react: '🖼️',
    filename: __filename
}, async (client, match, message, { from }) => {
    // Input validation
    if (!message.quoted) {
        return await client.sendMessage(from, {
            text: "✨ *Sticker/Video Converter*\n\nPlease reply to a sticker or video message.\n\nExample: `.convert` (reply to sticker or video)",
            contextInfo: getNewsletterContext(message.sender)
        }, { quoted: message });
    }

    const type = message.quoted.mtype;

    if (type !== 'stickerMessage' && type !== 'videoMessage') {
        return await client.sendMessage(from, {
            text: "❌ Only sticker or video messages can be converted",
            contextInfo: getNewsletterContext(message.sender)
        }, { quoted: message });
    }

    try {
        const mediaBuffer = await message.quoted.download();

        if (type === 'stickerMessage') {
            const imageBuffer = await stickerConverter.convertStickerToImage(mediaBuffer);

            await client.sendMessage(from, {
                image: imageBuffer,
                caption: "> Sticker converted to image",
                contextInfo: getNewsletterContext(message.sender),
                mimetype: 'image/png'
            }, { quoted: message });

        } else if (type === 'videoMessage') {
            await client.sendMessage(from, {
                video: mediaBuffer,
                caption: "> Video extracted successfully",
                contextInfo: getNewsletterContext(message.sender),
                mimetype: 'video/mp4'
            }, { quoted: message });
        }

    } catch (error) {
        console.error('Conversion error:', error);
        await client.sendMessage(from, {
            text: "❌ Conversion failed. Please try again.",
            contextInfo: getNewsletterContext(message.sender)
        }, { quoted: message });
    }
});

cmd({
  pattern: 'tomp3',
  desc: 'Convert media to audio',
  category: 'convert',
  react: '🎵',
  filename: __filename
}, async (client, match, message, { from }) => {
  if (!match.quoted) {
    return await client.sendMessage(from, {
      text: "*🔊 Please reply to a video/audio message*",
      contextInfo: getNewsletterContext(message.sender)
    }, { quoted: message });
  }

  if (!['videoMessage', 'audioMessage'].includes(match.quoted.mtype)) {
    return await client.sendMessage(from, {
      text: "❌ Only video/audio messages can be converted",
      contextInfo: getNewsletterContext(message.sender)
    }, { quoted: message });
  }

  if (match.quoted.seconds > 300) {
    return await client.sendMessage(from, {
      text: "⏱️ Media too long (max 5 minutes)",
      contextInfo: getNewsletterContext(message.sender)
    }, { quoted: message });
  }

  await client.sendMessage(from, {
    text: "🔄 Converting to audio...",
    contextInfo: getNewsletterContext(message.sender)
  }, { quoted: message });

  try {
    const buffer = await match.quoted.download();
    const ext = match.quoted.mtype === 'videoMessage' ? 'mp4' : 'm4a';
    const audio = await converter.toAudio(buffer, ext);

    await client.sendMessage(from, {
      audio: audio,
      mimetype: 'audio/mpeg',
      contextInfo: getNewsletterContext(message.sender)
    }, { quoted: message });

  } catch (e) {
    console.error('Conversion error:', e.message);
    await client.sendMessage(from, {
      text: "❌ Failed to process audio",
      contextInfo: getNewsletterContext(message.sender)
    }, { quoted: message });
  }
});

cmd({
  pattern: 'toptt',
  desc: 'Convert media to voice message',
  category: 'convert',
  react: '🎙️',
  filename: __filename
}, async (client, match, message, { from }) => {
  if (!match.quoted) {
    return await client.sendMessage(from, {
      text: "*🗣️ Please reply to a video/audio message*",
      contextInfo: getNewsletterContext(message.sender)
    }, { quoted: message });
  }

  if (!['videoMessage', 'audioMessage'].includes(match.quoted.mtype)) {
    return await client.sendMessage(from, {
      text: "❌ Only video/audio messages can be converted",
      contextInfo: getNewsletterContext(message.sender)
    }, { quoted: message });
  }

  if (match.quoted.seconds > 60) {
    return await client.sendMessage(from, {
      text: "⏱️ Media too long for voice (max 1 minute)",
      contextInfo: getNewsletterContext(message.sender)
    }, { quoted: message });
  }

  await client.sendMessage(from, {
    text: "🔄 Converting to voice message...",
    contextInfo: getNewsletterContext(message.sender)
  }, { quoted: message });

  try {
    const buffer = await match.quoted.download();
    const ext = match.quoted.mtype === 'videoMessage' ? 'mp4' : 'm4a';
    const ptt = await converter.toPTT(buffer, ext);

    await client.sendMessage(from, {
      audio: ptt,
      mimetype: 'audio/ogg; codecs=opus',
      ptt: true,
      contextInfo: getNewsletterContext(message.sender)
    }, { quoted: message });

  } catch (e) {
    console.error('PTT conversion error:', e.message);
    await client.sendMessage(from, {
      text: "❌ Failed to create voice message",
      contextInfo: getNewsletterContext(message.sender)
    }, { quoted: message });
  }
});




cmd({
    pattern: "topdf",
    alias: ["pdf", "topdf"],
    use: '.topdf',
    desc: "Convert provided text to a PDF file.",
    react: "📄",
    category: "convert",
    filename: __filename
},
async (conn, mek, m, {
    from, quoted, body, isCmd, command, args, q, reply
}) => {
    try {
        if (!q) {
            return await conn.sendMessage(from, {
                text: "Please provide the text you want to convert to PDF. *Eg* `.topdf` *Nothing is everything*",
                contextInfo: getNewsletterContext(m.sender)
            }, { quoted: mek });
        }

        // Create a new PDF document
        const doc = new PDFDocument();
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);

            // Send the PDF file with contextInfo
            await conn.sendMessage(from, {
                document: pdfData,
                mimetype: 'application/pdf',
                fileName: 'BEN_BOT.pdf',
                caption: "*📄 PDF created successfully!*",
                contextInfo: getNewsletterContext(m.sender)
            }, { quoted: mek });
        });

        // Add text to the PDF
        doc.text(q);

        // Finalize the PDF
        doc.end();

    } catch (e) {
        console.error(e);
        return await conn.sendMessage(from, {
            text: `Error: ${e.message}`,
            contextInfo: getNewsletterContext(m.sender)
        }, { quoted: mek });
    }
});
                      
                      
                      


cmd({
    pattern: "binary",
    desc: "Convert text into binary format.",
    category: "convert",
    filename: __filename,
}, 
async (conn, mek, m, { args }) => {
    try {
        if (!args.length) {
            return await conn.sendMessage(m.chat, {
                text: "❌ Please provide the text to convert to binary.",
                contextInfo: getNewsletterContext(m.sender)
            }, { quoted: mek });
        }

        const textToConvert = args.join(" ");
        const binaryText = textToConvert.split('').map(char => {
            return `00000000${char.charCodeAt(0).toString(2)}`.slice(-8);
        }).join(' ');

        await conn.sendMessage(m.chat, {
            text: `🔑 *Binary Representation:* \n${binaryText}`,
            contextInfo: getNewsletterContext(m.sender)
        }, { quoted: mek });

    } catch (e) {
        console.error("Error in .binary command:", e);
        await conn.sendMessage(m.chat, {
            text: "❌ An error occurred while converting to binary.",
            contextInfo: getNewsletterContext(m.sender)
        }, { quoted: mek });
    }
});

cmd({
    pattern: "dbinary",
    desc: "Decode binary string into text.",
    category: "convert",
    filename: __filename,
}, 
async (conn, mek, m, { args }) => {
    try {
        if (!args.length) {
            return await conn.sendMessage(m.chat, {
                text: "❌ Please provide the binary string to decode.",
                contextInfo: getNewsletterContext(m.sender)
            }, { quoted: mek });
        }

        const binaryString = args.join(" ");
        const textDecoded = binaryString.split(' ').map(bin => {
            return String.fromCharCode(parseInt(bin, 2));
        }).join('');

        await conn.sendMessage(m.chat, {
            text: `🔓 *Decoded Text:* \n${textDecoded}`,
            contextInfo: getNewsletterContext(m.sender)
        }, { quoted: mek });

    } catch (e) {
        console.error("Error in .dbinary command:", e);
        await conn.sendMessage(m.chat, {
            text: "❌ An error occurred while decoding the binary string.",
            contextInfo: getNewsletterContext(m.sender)
        }, { quoted: mek });
    }
});


cmd({
    pattern: "base64",
    desc: "Encode text into Base64 format.",
    category: "convert",
    filename: __filename,
}, 
async (conn, mek, m, { args }) => {
    try {
        if (!args.length) {
            return await conn.sendMessage(m.chat, {
                text: "❌ Please provide the text to encode into Base64.",
                contextInfo: getNewsletterContext(m.sender)
            }, { quoted: mek });
        }

        const textToEncode = args.join(" ");
        const encodedText = Buffer.from(textToEncode).toString('base64');

        await conn.sendMessage(m.chat, {
            text: `🔑 *Encoded Base64 Text:* \n${encodedText}`,
            contextInfo: getNewsletterContext(m.sender)
        }, { quoted: mek });

    } catch (e) {
        console.error("Error in .base64 command:", e);
        await conn.sendMessage(m.chat, {
            text: "❌ An error occurred while encoding the text into Base64.",
            contextInfo: getNewsletterContext(m.sender)
        }, { quoted: mek });
    }
});

cmd({
    pattern: "unbase64",
    desc: "Decode Base64 encoded text.",
    category: "convert",
    filename: __filename,
}, 
async (conn, mek, m, { args }) => {
    try {
        if (!args.length) {
            return await conn.sendMessage(m.chat, {
                text: "❌ Please provide the Base64 encoded text to decode.",
                contextInfo: getNewsletterContext(m.sender)
            }, { quoted: mek });
        }

        const base64Text = args.join(" ");
        const decodedText = Buffer.from(base64Text, 'base64').toString('utf-8');

        await conn.sendMessage(m.chat, {
            text: `🔓 *Decoded Text:* \n${decodedText}`,
            contextInfo: getNewsletterContext(m.sender)
        }, { quoted: mek });

    } catch (e) {
        console.error("Error in .unbase64 command:", e);
        await conn.sendMessage(m.chat, {
            text: "❌ An error occurred while decoding the Base64 text.",
            contextInfo: getNewsletterContext(m.sender)
        }, { quoted: mek });
    }
});


cmd({
    pattern: "timenow",
    desc: "Check the current local time.",
    category: "convert",
    filename: __filename,
}, 
async (conn, mek, m) => {
    try {
        const now = new Date();
        const localTime = now.toLocaleTimeString("en-US", { 
            hour: "2-digit", 
            minute: "2-digit", 
            second: "2-digit", 
            hour12: true,
            timeZone: "Asia/Kabul"
        });

        await conn.sendMessage(mek.chat, {
            text: `🕒 Current Local Time in Afghanistan: ${localTime}`,
            contextInfo: getNewsletterContext(mek.sender)
        }, { quoted: mek });

    } catch (e) {
        console.error("Error in .timenow command:", e);
        await conn.sendMessage(mek.chat, {
            text: "❌ An error occurred. Please try again later.",
            contextInfo: getNewsletterContext(mek.sender)
        }, { quoted: mek });
    }
});

cmd({
    pattern: "date",
    desc: "Check the current date.",
    category: "convert",
    filename: __filename,
}, 
async (conn, mek, m) => {
    try {
        const now = new Date();
        const currentDate = now.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });

        await conn.sendMessage(mek.chat, {
            text: `📅 Current Date: ${currentDate}`,
            contextInfo: getNewsletterContext(mek.sender)
        }, { quoted: mek });

    } catch (e) {
        console.error("Error in .date command:", e);
        await conn.sendMessage(mek.chat, {
            text: "❌ An error occurred. Please try again later.",
            contextInfo: getNewsletterContext(mek.sender)
        }, { quoted: mek });
    }
});


cmd({
    pattern: "calculate",
    alias: ["calc"],
    desc: "Evaluate a mathematical expression.",
    category: "convert",
    filename: __filename
},
async (conn, mek, m, { args }) => {
    try {
        if (!args[0]) {
            return await conn.sendMessage(mek.chat, {
                text: "✳️ Use this command like:\n *Example:* .calculate 5+3*2",
                contextInfo: getNewsletterContext(mek.sender)
            }, { quoted: mek });
        }

        const expression = args.join(" ").trim();

        if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
            return await conn.sendMessage(mek.chat, {
                text: "❎ Invalid expression. Only numbers and +, -, *, /, ( ) are allowed.",
                contextInfo: getNewsletterContext(mek.sender)
            }, { quoted: mek });
        }

        let result;
        try {
            result = eval(expression);
        } catch (e) {
            return await conn.sendMessage(mek.chat, {
                text: "❎ Error in calculation. Please check your expression.",
                contextInfo: getNewsletterContext(mek.sender)
            }, { quoted: mek });
        }

        await conn.sendMessage(mek.chat, {
            text: `✅ Result of "${expression}" is: ${result}`,
            contextInfo: getNewsletterContext(mek.sender)
        }, { quoted: mek });

    } catch (e) {
        console.error(e);
        await conn.sendMessage(mek.chat, {
            text: "❎ An error occurred while processing your request.",
            contextInfo: getNewsletterContext(mek.sender)
        }, { quoted: mek });
    }
});