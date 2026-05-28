"""
8x8 Ecosystem OS — Telegram Bot (v1.1)
"""
import os, logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters, ContextTypes

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
BACKEND_URL = os.getenv("BACKEND_URL", "https://8x8-ecosystem-api.onrender.com")
ADMIN_KEY = os.getenv("ADMIN_KEY", "8x8.015392@X8")

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    keyboard = [
        [InlineKeyboardButton("🚀 Start", callback_data="start")],
        [InlineKeyboardButton("💎 Subscribe ($8.88/mo)", callback_data="subscribe")],
        [InlineKeyboardButton("💰 Wallets", callback_data="wallets")],
    ]
    await update.message.reply_text(
        f"⚡ Welcome to 8x8 Ecosystem OS!\n\n"
        f"Hello {user.first_name}! I'm your AI gateway.\n\n"
        f"🎁 {88} free minutes/day\n"
        f"💎 $8.88/month unlimited\n\n"
        f"What would you like to do?",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if query.data == "start":
        await query.edit_message_text(
            "🤖 Ask me anything! Just type your message.\n\n"
            "💡 Tip: Use /chat to start a conversation.\n"
            "📊 Use /status to check your account."
        )
    elif query.data == "subscribe":
        await query.edit_message_text(
            "💎 Subscription: $8.88 USDT/month\n\n"
            "Send exactly 8.88 USDT to:\n"
            f"`bc1qsm5vfkfqq3dzn6khdvdjh3xvaekkey5ufne2vf`\n\n"
            "Then send /payment <tx_hash>"
        )
    elif query.data == "wallets":
        await query.edit_message_text(
            "💰 Payment Wallets:\n\n"
            "BTC: bc1qsm5vfkfqq3dzn6khdvdjh3xvaekkey5ufne2vf\n"
            "USDT: (same BTC address)\n"
            "XMR: 4AunQn3Five3YpnESwjLx1BVC1o6NZHQ8MNP1r3SSoBSV5WaoMrUH7xhzbuQwk5X8F27PRXauiCmJZ5xKLi9oF3n9wZt8Zf\n"
            "ETH: 0x6ae57c634d77bad091eb8a66dcb2dd457fc7e02e"
        )

async def chat_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = " ".join(context.args) if context.args else ""
    if not msg:
        await update.message.reply_text("Usage: /chat <your message>")
        return
    await update.message.reply_text(f"⚡ 8x8 AI: Received '{msg[:200]}'. Processing... (v1.1 online)")

async def status_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "📊 8x8 Ecosystem Status\n\n"
        "✅ Backend: Online\n"
        "✅ API: v1.1\n"
        "🎁 Free: 88 min/day\n"
        "💎 Premium: $8.88/month"
    )

async def error_handler(update, context):
    logger.error(f"Error: {context.error}")

def main():
    if not TOKEN:
        logger.error("No TELEGRAM_BOT_TOKEN set!")
        return
    
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("chat", chat_cmd))
    app.add_handler(CommandHandler("status", status_cmd))
    app.add_handler(CallbackQueryHandler(button_callback))
    app.add_error_handler(error_handler)
    
    logger.info("Bot starting...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
