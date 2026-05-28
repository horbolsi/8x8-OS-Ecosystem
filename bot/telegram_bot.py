#!/usr/bin/env python3
"""
8x8 Ecosystem OS — Telegram Bot for Public Users
Handles: onboarding, payments, AI chat, account management
"""
import os, json, logging, httpx
from datetime import datetime
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application, CommandHandler, MessageHandler,
    CallbackQueryHandler, filters, ContextTypes
)

# ═══════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
ADMIN_KEY = os.getenv("ADMIN_KEY")  # MUST be set via env var
FREE_MINUTES = 88
SUBSCRIPTION_PRICE = 8.88

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ═══════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════
async def api(endpoint, method="GET", data=None, params=None):
    async with httpx.AsyncClient() as client:
        if method == "GET":
            r = await client.get(f"{BACKEND_URL}{endpoint}", params=params, timeout=15)
        else:
            r = await client.post(f"{BACKEND_URL}{endpoint}", json=data, timeout=15)
        return r.json() if r.status_code == 200 else {"error": r.text}

def main_menu_keyboard():
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("⚡ AI Chat", callback_data="ai_chat"),
         InlineKeyboardButton("💎 Wallet", callback_data="wallet")],
        [InlineKeyboardButton("🏛 NFT Vaults", callback_data="nft"),
         InlineKeyboardButton("📈 Market", callback_data="market")],
        [InlineKeyboardButton("💳 Subscribe ($8.88/mo)", callback_data="subscribe"),
         InlineKeyboardButton("🌐 Referral", callback_data="referral")],
        [InlineKeyboardButton("⛏ Mining", callback_data="mining"),
         InlineKeyboardButton("🔒 Staking", callback_data="staking")],
        [InlineKeyboardButton("📊 Status", callback_data="status"),
         InlineKeyboardButton("ℹ️ Help", callback_data="help")],
    ])

# ═══════════════════════════════════════
# COMMAND HANDLERS
# ═══════════════════════════════════════

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    ref = context.args[0] if context.args else None
    
    # Auto-register
    try:
        result = await api("/api/register", "POST", {
            "telegram_id": user.id,
            "username": user.username or user.first_name,
            "referral_code": ref
        })
        user_id = result.get("user_id", "")
    except Exception:
        user_id = str(user.id)
    
    welcome = f"""
⚡ <b>Welcome to 8×8 Ecosystem OS</b> ⚡

Hello <b>{user.first_name}</b>! I'm <b>FlashTM8 AI</b>, your personal ecosystem intelligence.

🆓 <b>Free Plan:</b> {FREE_MINUTES} minutes/day of AI chat access
💎 <b>Pro Plan:</b> ${SUBSCRIPTION_PRICE}/month — unlimited

🌍 <b>Features:</b>
• ⚡ AI Chat (powered by 22+ agent intelligence)
• 🏛 NFT Vault System (8,888,888 max supply)
• 📈 Trading & Market Data
• ⛏ Mining (25% idle → feeds ecosystem)
• 🔒 Staking (PoW/PoS/PoStorage)
• 🌐 Referral System (5%/2%/1% commission)

🔗 <b>Your referral code:</b> Use /referral
📱 <b>Web app:</b> Coming soon as PWA
📺 <b>Telegram:</b> Full access right here

Use the menu below or type your question anytime!
"""
    await update.message.reply_text(welcome, parse_mode="HTML", reply_markup=main_menu_keyboard())

async def status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    try:
        result = await api(f"/api/user/{user.id}")
        access = result.get("access", {})
        free_remaining = access.get("remaining", 0)
        
        status_text = f"""
📊 <b>Your 8×8 Account Status</b>

👤 User: @{result.get('username', 'Unknown')}
🆔 ID: <code>{result.get('user_id', 'N/A')[:8]}...</code>
🆔 Free minutes remaining: <b>{free_remaining:.0f}/{FREE_MINUTES}</b>
💎 Subscribed: {'✅ Yes' if result.get('is_subscribed') else '❌ No'}
⛏ Mining: {'✅ Enabled' if result.get('mining_enabled') else '❌ Disabled'}
💰 Balances: {json.dumps(result.get('balances', {}), indent=2)}

Use /subscribe to upgrade to Pro!
"""
        await update.message.reply_text(status_text, parse_mode="HTML")
    except Exception as e:
        await update.message.reply_text(f"⚠️ Error: {e}")

async def subscribe_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    wallets = await api("/api/payment/wallets")
    w = wallets.get("wallets", {})
    
    wallet_text = "\n".join([
        f"<b>{k}:</b> <code>{v[:20]}...</code>" 
        for k, v in w.items()
    ])
    
    text = f"""
💳 <b>Upgrade to 8×8 Pro</b>

📋 <b>Price:</b> ${SUBSCRIPTION_PRICE} USDT (or equivalent)
⏰ <b>Duration:</b> 30 days unlimited

<b>Payment Wallets:</b>
{wallet_text}

1️⃣ Send <b>exactly ${SUBSCRIPTION_PRICE}</b> to any wallet above
2️⃣ Copy your transaction hash
3️⃣ Send it here: /pay TX_HASH

✅ Admin will verify and activate within 1 hour
"""
    
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("💎 Pay with BTC", callback_data="pay_btc"),
         InlineKeyboardButton("💎 Pay with XMR", callback_data="pay_xmr")],
        [InlineKeyboardButton("💎 Pay with USDT", callback_data="pay_usdt"),
         InlineKeyboardButton("💎 Pay with SOL", callback_data="pay_sol")],
    ])
    await update.message.reply_text(text, parse_mode="HTML", reply_markup=keyboard)

async def pay_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    if not context.args:
        await update.message.reply_text("Usage: /pay TX_HASH")
        return
    
    tx_hash = context.args[0]
    
    # Get user_id
    reg = await api("/api/register", "POST", {"telegram_id": user.id})
    user_id = reg.get("user_id", str(user.id))
    
    # Submit payment
    result = await api(f"/api/payment/submit?user_id={user_id}", "POST", {
        "currency": "USDT",
        "amount": SUBSCRIPTION_PRICE,
        "tx_hash": tx_hash
    })
    
    await update.message.reply_text(
        f"✅ <b>Payment Submitted!</b>\n\n"
        f"TX: <code>{tx_hash[:20]}...</code>\n"
        f"Status: <b>{result.get('status', 'pending')}</b>\n\n"
        f"Admin will verify and activate your subscription.",
        parse_mode="HTML"
    )

async def referral_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    try:
        reg = await api("/api/register", "POST", {"telegram_id": user.id})
        user_id = reg.get("user_id", str(user.id))
        
        ref = await api(f"/api/referral/{user_id}")
        
        text = f"""
🌐 <b>Your Referral Program</b>

🔗 <b>Your Code:</b> <code>{ref.get('referral_code', 'N/A')}</code>
📎 <b>Share Link:</b> https://t.me/8x8ecosystem_bot?start={ref.get('referral_code', '')}

📊 <b>Stats:</b>
• Tier 1 (Direct): {ref.get('tier1_count', 0)} — {ref.get('commission_tier1', '5%')}
• Tier 2 (Indirect): {ref.get('tier2_count', 0)} — {ref.get('commission_tier2', '2%')}
• Tier 3 (Network): {ref.get('tier3_count', 0)} — {ref.get('commission_tier3', '1%')}

💰 <b>Commission:</b> You earn % of every subscription from your referrals!
"""
        await update.message.reply_text(text, parse_mode="HTML")
    except Exception as e:
        await update.message.reply_text(f"⚠️ Error: {e}")

# ═══════════════════════════════════════
# CALLBACK HANDLERS
# ═══════════════════════════════════════

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if query.data == "ai_chat":
        await query.message.reply_text(
            "⚡ <b>AI Chat Mode</b>\n\nJust type your question! I'm FlashTM8 AI with knowledge from 22+ agents.\n\n"
            f"You get {FREE_MINUTES} free minutes daily. Unlimited with Pro.",
            parse_mode="HTML"
        )
    elif query.data == "wallet":
        wallets = await api("/api/payment/wallets")
        w = wallets.get("wallets", {})
        wallet_text = "\n".join([f"<b>{k}:</b> <code>{v}</code>" for k, v in w.items()])
        await query.message.reply_text(
            f"💎 <b>8×8 Multi-Chain Wallets</b>\n\n{wallet_text}",
            parse_mode="HTML"
        )
    elif query.data == "nft":
        await query.message.reply_text(
            "🏛 <b>NFT Vault System</b>\n\n"
            "• Max Supply: 8,888,888\n"
            "• Each NFT locks 0.001 π permanently\n"
            "• Burn → supply ↓ → scarcity ↑ → price ↑\n"
            "• 8Pass Top Traders: 1% fee instead of 4.88%\n\n"
            "Use /nft in the app to view your vaults!",
            parse_mode="HTML"
        )
    elif query.data == "market":
        prices = await api("/api/market/prices")
        text = "📈 <b>Live Market Data</b>\n\n"
        for sym, data in prices.items():
            if isinstance(data, dict):
                price = data.get("price", 0)
                change = data.get("change_24h", 0)
                emoji = "🟢" if change >= 0 else "🔴"
                text += f"{emoji} <b>{sym}</b>: ${price:,.2f} ({change:+.1f}%)\n"
        await query.message.reply_text(text, parse_mode="HTML")
    elif query.data == "subscribe":
        await subscribe_cmd(update, context)
    elif query.data == "referral":
        await referral_cmd(update, context)
    elif query.data == "mining":
        await query.message.reply_text(
            "⛏ <b>Mining System</b>\n\n"
            "When idle: 25% of your device feeds the 8×8 ecosystem\n"
            "Active mining mode: 75% power allocation\n\n"
            "Earn rewards in 8x8, TM8, 0x8 tokens!\n"
            "Use /mining to configure.",
            parse_mode="HTML"
        )
    elif query.data == "staking":
        await query.message.reply_text(
            "🔒 <b>Staking System</b>\n\n"
            "• ⛏ PoW (Proof of Work): CPU mining → TM8\n"
            "• 🔒 PoS (Proof of Stake) Validating → 8x8\n"
            "• 💾 PoSt (Proof of Storage): Storage sharing → 0x8\n\n"
            "Allocate your power. Must total 100%.",
            parse_mode="HTML"
        )
    elif query.data == "status":
        await status(update, context)
    elif query.data == "help":
        await query.message.reply_text(
            "ℹ️ <b>8×8 Ecosystem OS — Help</b>\n\n"
            "/start — Main menu\n"
            "/status — Your account\n"
            "/subscribe — Upgrade to Pro\n"
            "/pay TX_HASH — Submit payment\n"
            "/referral — Your referral code\n"
            "/help — This help\n\n"
            "Or just type any question for FlashTM8 AI!",
            parse_mode="HTML"
        )
    elif query.data.startswith("pay_"):
        currency = query.data.replace("pay_", "").upper()
        await query.message.reply_text(
            f"💳 Pay with <b>{currency}</b>\n\n"
            f"Send exactly <b>${SUBSCRIPTION_PRICE} {currency}</b> equivalent\n"
            f"Then send: /pay YOUR_TX_HASH",
            parse_mode="HTML"
        )

# ═══════════════════════════════════════
# AI CHAT HANDLER
# ═══════════════════════════════════════

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    message = update.message.text
    
    # Get or create user
    reg = await api("/api/register", "POST", {"telegram_id": user.id})
    user_id = reg.get("user_id", str(user.id))
    
    # Send typing
    await update.message.chat.send_action("typing")
    
    # Send to backend AI
    result = await api("/api/chat?user_id={user_id}", "POST", {
        "message": message
    })
    
    if "error" in result and result["error"] == "NO_ACCESS":
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton("💳 Subscribe Now ($8.88/mo)", callback_data="subscribe")]
        ])
        await update.message.reply_text(
            f"⏰ {result.get('message', 'No access')}",
            reply_markup=keyboard
        )
    else:
        response = result.get("response", "⚡ Processing...")
        await update.message.reply_text(response, parse_mode="HTML")

# ═══════════════════════════════════════
# MAIN
# ═══════════════════════════════════════

def main():
    if not BOT_TOKEN:
        print("❌ TELEGRAM_BOT_TOKEN not set")
        return
    
    app = Application.builder().token(BOT_TOKEN).build()
    
    # Commands
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("status", status))
    app.add_handler(CommandHandler("subscribe", subscribe_cmd))
    app.add_handler(CommandHandler("pay", pay_cmd))
    app.add_handler(CommandHandler("referral", referral_cmd))
    app.add_handler(CommandHandler("help", start))
    
    # Callbacks
    app.add_handler(CallbackQueryHandler(button_callback))
    
    # AI Chat (catch-all message handler)
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    print("⚡ 8x8 Ecosystem Telegram Bot running...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
