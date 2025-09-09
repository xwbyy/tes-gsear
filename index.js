import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import pino from "pino";
import chalk from "chalk";
import readline from "readline";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

// Path ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pairing Mode
const usePairingCode = true;

// Load semua plugins
const plugins = {};
const pluginFolder = path.join(__dirname, 'plugins');

// Fungsi Input Terminal
async function question(prompt) {
  process.stdout.write(prompt);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question("", (ans) => {
      rl.close();
      resolve(ans);
    });
  });
}

// Fungsi untuk memuat semua plugins
async function loadPlugins() {
  try {
    const files = await fs.readdir(pluginFolder);
    
    for (const file of files) {
      if (file.endsWith('.js')) {
        try {
          const pluginPath = `./plugins/${file}`;
          const pluginModule = await import(pluginPath + `?update=${Date.now()}`);
          const plugin = pluginModule.default;
          
          if (plugin && typeof plugin === 'function') {
            // Simpan handler berdasarkan command
            if (Array.isArray(plugin.command)) {
              plugin.command.forEach(cmd => {
                plugins[cmd] = plugin;
              });
            } else if (typeof plugin.command === 'string') {
              plugins[plugin.command] = plugin;
            } else if (plugin.command instanceof RegExp) {
              plugins[plugin.command.source] = plugin;
            }
            
            console.log(chalk.green(`✓ Plugin loaded: ${file}`));
          }
        } catch (error) {
          console.error(chalk.red(`✗ Error loading plugin ${file}:`), error);
        }
      }
    }
  } catch (error) {
    console.error(chalk.red('Error reading plugins directory:'), error);
  }
}

// Fungsi untuk mengekstrak konten pesan
function extractMessageContent(m) {
  if (!m.message) return '';
  
  const messageTypes = {
    conversation: m.message.conversation,
    imageMessage: m.message.imageMessage?.caption,
    documentMessage: m.message.documentMessage?.caption,
    videoMessage: m.message.videoMessage?.caption,
    extendedTextMessage: m.message.extendedTextMessage?.text,
    buttonsResponseMessage: m.message.buttonsResponseMessage?.selectedButtonId,
    templateButtonReplyMessage: m.message.templateButtonReplyMessage?.selectedId
  };

  for (const type in messageTypes) {
    if (messageTypes[type]) return messageTypes[type];
  }
  
  return '';
}

// Handler utama untuk memproses pesan
async function messageHandler(bot, m) {
  try {
    if (m.key.fromMe) return;

    const messageContent = extractMessageContent(m);
    if (!messageContent || messageContent.trim() === '') return;

    console.log('[Received Message] From:', m.pushName || 'Unknown', 'Content:', messageContent);

    // Cari plugin yang sesuai dengan command
    const commandMatch = messageContent.match(/^[\.\/\!]?(\w+)(?:\s+(.*))?$/);
    
    if (commandMatch) {
      const command = commandMatch[1].toLowerCase();
      const text = commandMatch[2] || '';
      
      // Cari handler untuk command ini
      let handler = null;
      
      // Cari exact match dulu
      if (plugins[command]) {
        handler = plugins[command];
      } else {
        // Cari regex match
        for (const key in plugins) {
          if (key instanceof RegExp) {
            if (key.test(command)) {
              handler = plugins[key];
              break;
            }
          } else if (typeof key === 'string' && new RegExp(key).test(command)) {
            handler = plugins[key];
            break;
          }
        }
      }
      
      if (handler) {
        // Eksekusi handler
        try {
          // Tambahkan properti yang diperlukan
          m.isGroup = m.key.remoteJid.endsWith('@g.us');
          
          await handler(m, { 
            command: command, 
            text: text,
            conn: bot,
            groupMetadata: m.isGroup ? await bot.groupMetadata(m.key.remoteJid).catch(() => null) : null
          });
          console.log(chalk.blue(`✓ Executed command: ${command}`));
        } catch (error) {
          console.error(chalk.red(`Error executing command ${command}:`), error);
          await bot.sendMessage(m.key.remoteJid, { 
            text: `Terjadi error saat menjalankan perintah: ${error.message}`,
            quoted: m 
          });
        }
        return;
      }
    }
    
    // Jika bukan command, kirim pesan default
    await bot.sendMessage(m.key.remoteJid, { 
      text: `Hai! Saya adalah bot WhatsApp.\n\nGunakan perintah:\n• .apakah [pertanyaan] - Untuk bertanya\n• .jadian - Mencari jodoh di grup\n• .menu - Menampilkan menu bot`,
      quoted: m 
    });

  } catch (error) {
    console.error('[Handler Error]', error);
  }
}

async function connectToWhatsApp() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(
      path.resolve(__dirname, "./LenwySesi")
    );

    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Bot Using WA v${version.join(".")}, isLatest: ${isLatest}`);

    // Load plugins terlebih dahulu
    await loadPlugins();

    const bot = makeWASocket({
      logger: pino({ level: "silent" }),
      printQRInTerminal: !usePairingCode,
      auth: state,
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      version,
      syncFullHistory: false,
      generateHighQualityLinkPreview: true
    });

    // Handle Pairing
    if (usePairingCode && !bot.authState.creds.registered) {
      try {
        const phoneNumber = await question("☘️ Masukan Nomor Yang Diawali Dengan 62 :\n");
        const code = await bot.requestPairingCode(phoneNumber.trim());
        console.log(`🎁 Pairing Code : ${code}`);
      } catch (err) {
        console.error("Failed to get pairing code:", err);
      }
    }

    bot.ev.on("creds.update", saveCreds);

    bot.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect } = update;
      
      if (connection === "close") {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
        console.log(chalk.red("❌ Koneksi Terputus, Mencoba Menyambung Ulang"));
        
        if (shouldReconnect) {
          setTimeout(connectToWhatsApp, 5000);
        }
      } else if (connection === "open") {
        console.log(chalk.green("✔ Bot Berhasil Terhubung Ke WhatsApp"));
      }
    });

    // Handle incoming messages
    bot.ev.on("messages.upsert", async ({ messages }) => {
      const m = messages[0];
      if (!m.message) return;

      try {
        await messageHandler(bot, m);
      } catch (error) {
        console.error("Error handling message:", error);
      }
    });

    // Console Log untuk monitoring
    bot.ev.on("messages.upsert", async ({ messages }) => {
      const msg = messages[0];
      if (!msg.message) return;

      const body =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";
      const sender = msg.key.remoteJid;
      const pushname = msg.pushName || "Unknown";

      const listColor = ["red", "green", "yellow", "magenta", "cyan", "white", "blue"];
      const randomColor = listColor[Math.floor(Math.random() * listColor.length)];

      console.log(
        chalk.yellow.bold("WhatsAppBot"),
        chalk.green.bold("[Message]"),
        chalk[randomColor](pushname),
        chalk[randomColor](":"),
        chalk.white(body)
      );
    });

  } catch (error) {
    console.error("Failed to connect:", error);
    setTimeout(connectToWhatsApp, 5000);
  }
}

// Start the bot
connectToWhatsApp();

// Handle process termination
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n🛑 Shutting down bot...'));
  process.exit(0);
});

// Hot reload untuk development
if (process.env.NODE_ENV === 'development') {
  const fs = await import('fs');
  const file = new URL(import.meta.url).pathname;
  
  fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(`[Hot Reload] Updating ${file}`);
    import(`${file}?update=${Date.now()}`);
  });
}

/*
SCRIPT BY © VYNAA VALERIE 
•• recode kasih credits 
•• contacts: (t.me/VynaaValerie)
•• instagram: @vynaa_valerie 
•• (github.com/VynaaValerie) 
*/