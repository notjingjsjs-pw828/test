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


// Default values if not set in config
config.ANTICALL = config.ANTICALL || "true"; // true/block/false
config.ANTICALL_MSG = config.ANTICALL_MSG || "*No calls allowed*!";

const Anticall = async (json, conn) => {
   for (const id of json) {
      if (id.status === 'offer') {
         if (config.ANTICALL === "true") {
            let msg = await conn.sendMessage(id.from, {
               text: `${config.ANTICALL_MSG}`,
               mentions: [id.from],
            });
            await conn.rejectCall(id.id, id.from);
         } else if (config.ANTICALL === "block") {
            let msg = await conn.sendMessage(id.from, {
               text: `${config.ANTICALL_MSG}!`,
               mentions: [id.from],
            });
            await conn.rejectCall(id.id, id.from); 
            await conn.updateBlockStatus(id.from, "block");
         }
      }
   }
};

cmd({
    pattern: "anticall",
    alias: ["callblock"],
    desc: "Configure call rejection settings",
    category: "owner",
    filename: __filename,
    react: "📵"
}, async (m, conn, { args, isCreator, reply }) => {
    if (!isCreator) return reply("_*❗Only my owner can use this command*_");

    const action = args[0]?.toLowerCase();
    const validModes = ["off", "true", "block"];
    
    if (validModes.includes(action)) {
        config.ANTICALL = action;
        reply(`AntiCall Mode: ${action.toUpperCase()}\n${action === "block" ? "⚠️ Callers will be BLOCKED" : ""}`);
    } else if (args[0] === "msg") {
        config.ANTICALL_MSG = args.slice(1).join(" ");
        reply(`New rejection message set:\n${config.ANTICALL_MSG}`);
    } else {
        reply(`📵 *AntiCall Settings*\n
Current Mode: ${config.ANTICALL.toUpperCase()}
Message: ${config.ANTICALL_MSG}

Usage:
→ ${config.PREFIX}anticall true (reject calls)
→ ${config.PREFIX}anticall block (reject+block)
→ ${config.PREFIX}anticall off (disable)
→ ${config.PREFIX}anticall msg [message]`);
    }
});

module.exports = {
    Anticall,
    anticallHandler: Anticall // For backward compatibility
};
// plugins/antispam.js
const spamCount = {};

cmd({
    on: "text"
}, (m) => {
    const sender = m.sender;
    spamCount[sender] = (spamCount[sender] || 0) + 1;
    
    if (spamCount[sender] > 3) {
        m.reply("*You're spamming*!");
        conn.updateBlockStatus(sender, "block");
    }
});
