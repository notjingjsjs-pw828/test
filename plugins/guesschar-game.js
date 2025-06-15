const fs = require("fs");
const { cmd } = require('../command');

const dbPath = "./lib/guesschar-database.json";
const timers = {};
const startTimers = {};

const characters = [
  {
    name: "captain america",
    hints: [
      "The first Avenger, a super-soldier from World War II.",
      "He wields a shield made of Vibranium.",
      "His real name is Steve Rogers.",
      "Known for his unbreakable will and leadership.",
      "He was frozen in ice for decades before waking up in modern times."
    ]
  },
  {
    name: "iron man",
    hints: [
      "A genius billionaire who builds an armored suit.",
      "His real name is Tony Stark.",
      "He is known for his sarcastic humor.",
      "Founder of Stark Industries.",
      "He fights using advanced technology and repulsor beams."
    ]
  },
  {
    name: "thor",
    hints: [
      "The God of Thunder from Asgard.",
      "Wields the magical hammer called Mjolnir.",
      "Son of Odin, the Allfather.",
      "Controls lightning and storms.",
      "Known for his bravery and strength."
    ]
  },
  {
    name: "hulk",
    hints: [
      "A scientist who transforms when angry.",
      "His real name is Bruce Banner.",
      "Known for his incredible strength and green skin.",
      "Has a hard time controlling his rage.",
      "Sometimes called the strongest Avenger."
    ]
  },
  {
    name: "black widow",
    hints: [
      "A former Russian spy and assassin.",
      "Her real name is Natasha Romanoff.",
      "Expert in hand-to-hand combat.",
      "Known for her agility and stealth.",
      "Has a complicated past but fights for good."
    ]
  },
  {
    name: "hawkeye",
    hints: [
      "Master archer with incredible aim.",
      "His real name is Clint Barton.",
      "Uses a bow and a variety of trick arrows.",
      "Known for being loyal and brave.",
      "Part of the original Avengers team."
    ]
  },
  {
    name: "falcon",
    hints: [
      "Close friend and ally of Captain America.",
      "Uses a mechanical wing suit to fly.",
      "His real name is Sam Wilson.",
      "Known for his quick reflexes and combat skills.",
      "Eventually takes up the mantle of Captain America."
    ]
  },
  {
    name: "scarlet witch",
    hints: [
      "Wields powerful reality-altering magic.",
      "Her real name is Wanda Maximoff.",
      "Has telekinesis and energy manipulation powers.",
      "Known for emotional depth and struggles.",
      "Can change the course of battles with her powers."
    ]
  },
  {
    name: "vision",
    hints: [
      "An android created with the Mind Stone.",
      "Known for his intelligence and calm demeanor.",
      "Can phase through objects and fly.",
      "Has a synthetic body with super strength.",
      "Often serves as a moral compass for the team."
    ]
  },
  {
    name: "spiderman",
    hints: [
      "A young hero with spider-like abilities.",
      "His real name is Peter Parker.",
      "Known for witty remarks and agility.",
      "Gained powers from a radioactive spider bite.",
      "Balances life as a student and superhero."
    ]
  }
];

function loadDB() {
  if (!fs.existsSync(dbPath)) return {};
  const data = fs.readFileSync(dbPath, "utf-8");
  return JSON.parse(data || "{}");
}

function saveDB(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function clearStartTimer(from) {
  if (startTimers[from]) {
    clearTimeout(startTimers[from]);
    delete startTimers[from];
  }
}

function clearTurnTimer(from) {
  if (timers[from]) {
    clearTimeout(timers[from]);
    delete timers[from];
  }
}

function pickRandomCharacter(used) {
  const unused = characters.filter(c => !used.includes(c.name));
  if (unused.length === 0) return null;
  return unused[Math.floor(Math.random() * unused.length)];
}

function getRandomHint(character) {
  if (!character || !character.hints || character.hints.length === 0) return "No hint available.";
  return character.hints[Math.floor(Math.random() * character.hints.length)];
}

cmd({
  pattern: "guesschar",
  desc: "Start Guess the Character Game",
  category: "game",
  filename: __filename
}, (conn, mek, m, { from, reply, sender }) => {
  const db = loadDB();
  if (db[from] && !db[from].finished) {
    return reply("⚠️ A Guess the Character game is already running.");
  }

  db[from] = {
    type: "guesschar",
    players: [sender],
    scores: {},
    usedChars: [],
    currentChar: null,
    finished: false,
    waiting: true,
    turn: 0
  };

  db[from].scores[sender] = 0;

  saveDB(db);

  reply(
    `🎮 *Guess the Character started!*\n👤 Player 1: @${sender.split("@")[0]}\n⏳ Waiting for more players (max 10)...\nSend *join-guesschar* to join.`,
    null,
    { mentions: [sender] }
  );

  clearStartTimer(from);
  startTimers[from] = setTimeout(() => {
    const db = loadDB();
    if (!db[from] || db[from].finished) return;
    const game = db[from];
    if (game.waiting) {
      game.waiting = false;
      game.currentChar = pickRandomCharacter(game.usedChars);
      if (!game.currentChar) {
        game.finished = true;
        saveDB(db);
        return conn.sendMessage(from, { text: "🎉 All characters guessed! Game over." });
      }
      game.usedChars.push(game.currentChar.name);
      saveDB(db);

      conn.sendMessage(from, {
        text: `⏳ Time's up! Starting with ${game.players.length} player(s).\n🧠 *Guess the Character Begins!*\n🎯 @${game.players[game.turn].split("@")[0]}, your turn!\n\nHint: ${getRandomHint(game.currentChar)}\n\nGuess the character name (in English).\n⏳ You have 40 seconds.`,
        mentions: game.players
      });

      clearStartTimer(from);
      clearTurnTimer(from);
      timers[from] = setTimeout(() => handleTimeout(conn, from), 40 * 1000);
    }
  }, 40000);
});

cmd({
  pattern: "cancel-guesschar",
  desc: "Cancel Guess the Character game",
  category: "game",
  filename: __filename
}, (conn, mek, m, { from, reply }) => {
  const db = loadDB();
  if (!db[from] || db[from].type !== "guesschar") return reply("❌ No Guess the Character game is running.");

  delete db[from];
  saveDB(db);

  clearStartTimer(from);
  clearTurnTimer(from);

  reply("🛑 Guess the Character game canceled.");
});

cmd({
  pattern: "join-guesschar",
  desc: "Join Guess the Character game",
  category: "game",
  filename: __filename
}, (conn, mek, m, { from, sender, reply }) => {
  const db = loadDB();
  const game = db[from];
  if (!game || game.type !== "guesschar") return reply("❌ No Guess the Character game to join.");
  if (!game.waiting) return reply("⚠️ Game already started.");
  if (game.players.includes(sender)) return reply("⚠️ You already joined.");
  if (game.players.length >= 10) return reply("⚠️ Player limit reached (10).");

  game.players.push(sender);
  if (!game.scores[sender]) game.scores[sender] = 0;

  saveDB(db);

  reply(
    `🙌 @${sender.split("@")[0]} joined the game! (${game.players.length} player(s) now)`,
    null,
    { mentions: game.players }
  );
});

cmd({
  on: "body"
}, async (conn, mek, m, { from, body, sender, reply }) => {
  const db = loadDB();
  const game = db[from];

  // Ignore if no game, finished, or still waiting
  if (!game || game.type !== "guesschar" || game.finished || game.waiting) return;

  // Ignore bot's own messages
  if (mek.key.fromMe) return;

  // Ignore if it's not the player's turn
  if (sender !== game.players[game.turn]) return;

  const guess = body.trim().toLowerCase();
  
  // Ignore empty or too short messages
  if (!guess || guess.length < 3) return;

  // ✅ Correct guess
  if (guess === game.currentChar.name.toLowerCase()) {
    game.scores[sender] = (game.scores[sender] || 0) + 1;

    await conn.sendMessage(from, {
      text: `🎉 Correct! @${sender.split("@")[0]} guessed *${game.currentChar.name.toUpperCase()}* and earned 1 point!\n\n📊 Scores:\n${Object.entries(game.scores)
        .map(([p, s]) => `@${p.split("@")[0]}: ${s}`)
        .join("\n")}`,
      mentions: game.players
    });

    // Next round
    game.currentChar = pickRandomCharacter(game.usedChars);
    if (!game.currentChar) {
      game.finished = true;
      saveDB(db);
      return conn.sendMessage(from, {
        text: `🏆 All characters guessed! Game over.\n\n📊 Final scores:\n${Object.entries(game.scores)
          .map(([p, s]) => `@${p.split("@")[0]}: ${s}`)
          .join("\n")}`,
        mentions: game.players
      });
    }

    game.usedChars.push(game.currentChar.name);
    game.turn = (game.turn + 1) % game.players.length;

    clearTurnTimer(from);
    timers[from] = setTimeout(() => handleTimeout(conn, from), 40 * 1000);

    saveDB(db);

    await conn.sendMessage(from, {
      text: `🧠 Next character!\n🎯 @${game.players[game.turn].split("@")[0]}, it's your turn!\n\n💡 Hint: ${getRandomHint(game.currentChar)}\n\nType the character name.`,
      mentions: game.players
    });

  } else {
    // ❌ Wrong guess (only once)
    await reply(`❌ Wrong guess. Try again!`);
  }
});

async function handleTimeout(conn, from) {
  const db = loadDB();
  if (!db[from]) return;
  const game = db[from];
  if (game.finished) return;

  const loser = game.players[game.turn];
  // حذف بازیکنی که تایم گذاشته
  game.players.splice(game.turn, 1);

  await conn.sendMessage(from, {
    text: `⌛ *Timeout!*\n@${loser.split("@")[0]} did not guess in time and was removed.`,
    mentions: [loser]
  });

  if (game.players.length === 0) {
    game.finished = true;
    await conn.sendMessage(from, { text: `⚠️ All players removed. Game over.` });
    clearTurnTimer(from);
    clearStartTimer(from);
    delete db[from];
    saveDB(db);
    return;
  }

  if (game.players.length === 1) {
    game.finished = true;
    await conn.sendMessage(from, {
      text: `🏆 Game over! Winner: @${game.players[0].split("@")[0]}`,
      mentions: game.players
    });
    clearTurnTimer(from);
    clearStartTimer(from);
    delete db[from];
    saveDB(db);
    return;
  }

  if (game.turn >= game.players.length) game.turn = 0;

  clearTurnTimer(from);
  timers[from] = setTimeout(() => handleTimeout(conn, from), 40 * 1000);

  saveDB(db);

  await conn.sendMessage(from, {
    text: `➡️ It's @${game.players[game.turn].split("@")[0]}'s turn.\nGuess the character name!\n⏳ You have 40 seconds.`,
    mentions: [game.players[game.turn]]
  });
}