require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.error('❌ TELEGRAM_BOT_TOKEN environment variable is missing.');
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

const HELLO_MESSAGE = `🌎⚡️🚀🌚 *Hello World!*  
Welcome to the 8x8 OS Ecosystem bot.  
Version 0.0.1 — by FlashTM8.  
Quantum‑ready. Sovereign by design.`;

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, HELLO_MESSAGE, { parse_mode: 'Markdown' });
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    if (msg.from.is_bot) return;
    bot.sendMessage(chatId, HELLO_MESSAGE, { parse_mode: 'Markdown' });
});

console.log('✅ 8x8 Hub bot is running (polling mode).');
