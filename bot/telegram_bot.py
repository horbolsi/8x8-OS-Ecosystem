"""
8x8 Ecosystem OS — Telegram Bot v1.2
Full-featured bot with all commands and mini-app support.
"""
import os, json, logging, urllib.request, urllib.parse
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
BACKEND_URL = os.getenv("BACKEND_URL", "https://eightx8-os-live.onrender.com")
ADMIN_KEY = os.getenv("ADMIN_KEY", "8x8.015392@X8")

def api(endpoint, method="GET", data=None):
    """Call backend API"""
    try:
        url = f"{BACKEND_URL}{endpoint}"
        if data:
            req = urllib.request.Request(url, data=json.dumps(data).encode(),
                headers={"Content-Type": "application/json"}, method=method)
        else:
            req = urllib.request.Request(url, method=method)
        resp = urllib.request.urlopen(req, timeout=10)
        return json.loads(resp.read())
    except Exception as e:
        logger.error(f"API error: {e}")
        return {}

def send_msg(chat_id, text, keyboard=None):
    """Send message via Telegram API"""
    url = f"https://api.telegram.org/bot{TOKEN}/sendMessage"
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
    if keyboard:
        payload["reply_markup"] = json.dumps(keyboard)
    req = urllib.request.Request(url, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req, timeout=10)
    except Exception as e:
        logger.error(f"Send error: {e}")

def get_main_keyboard():
    """Main menu keyboard"""
    return {
        "inline_keyboard": [
            [{"text": "🚀 Get Started", "callback_data": "start"}],
            [{"text": "💬 AI Chat", "callback_data": "chat"}, {"text": "📊 Status", "callback_data": "status"}],
            [{"text": "💰 Payment Wallets", "callback_data": "wallets"}, {"text": "💎 Subscribe ($8.88/mo)", "callback_data": "subscribe"}],
            [{"text": "⛏️ Mining", "callback_data": "mining"}, {"text": "🥩 Staking", "callback_data": "staking"}],
            [{"text": "🖼️ NFT Vaults", "callback_data": "nft"}],
            [{"text": "👥 Referral Program", "callback_data": "referral"}],
            [{"text": "📱 Open Web App", "web_app": {"url": "https://8x8-ecosystem.vercel.app"}}]
        ]
    }

def handle_start(chat_id, user):
    """Handle /start command"""
    name = user.get("first_name", "User")
    
    # Register user on backend
    reg = api(f"/api/register?telegram_id={user.get('id')}&username={user.get('username','')}", method="POST")
    user_id = reg.get("user_id", "unknown")
    
    text = (
        f"⚡ <b>Welcome to 8×8 Ecosystem OS!</b>\n\n"
        f"Hello <b>{name}</b>! You're now registered.\n"
        f"🆔 User ID: <code>{user_id[:12]}...</code>\n\n"
        f"🎁 <b>{88} free minutes/day</b>\n"
        f"💎 <b>$8.88/month</b> unlimited access\n"
        f"⛏️ <b>Mining</b> — earn while your phone is idle\n"
        f"🥩 <b>Staking</b> — PoW/PoS/PoStorage\n"
        f"🖼️ <b>NFT Vaults</b> — up to 8,888,888\n\n"
        f"👇 Choose an option below:"
    )
    send_msg(chat_id, text, get_main_keyboard())

def handle_chat(chat_id, user, message_text):
    """Handle /chat command"""
    if not message_text:
        send_msg(chat_id, "💬 Usage: /chat <your message>\n\nExample: /chat What is 8x8 Ecosystem?")
        return
    
    result = api(f"/api/chat?message={urllib.parse.quote(message_text)}")
    response = result.get("response", "⚡ 8x8 AI is processing your request...")
    model = result.get("model", "8x8-ai")
    
    text = f"🤖 <b>8×8 AI</b> <i>({model})</i>\n\n{response}"
    send_msg(chat_id, text)

def handle_status(chat_id, user):
    """Handle /status command"""
    result = api("/health")
    status = result.get("status", "unknown")
    version = result.get("version", "1.1.0")
    
    text = (
        f"📊 <b>8×8 Ecosystem Status</b>\n\n"
        f"✅ Backend: <b>{status.upper()}</b>\n"
        f"📦 Version: <b>{version}</b>\n"
        f"🎁 Free: <b>88 min/day</b>\n"
        f"💎 Premium: <b>$8.88/month</b>\n"
        f"⛏️ Mining: <b>Active</b>\n"
        f"🖼️ NFT Vaults: <b>8,888,888 max</b>\n\n"
        f"🕐 {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}"
    )
    send_msg(chat_id, text)

def handle_wallets(chat_id):
    """Handle /wallets command"""
    result = api("/api/payment/wallets")
    wallets = result.get("wallets", {})
    price = result.get("price", 8.88)
    
    text = (
        f"💰 <b>Payment Wallets</b>\n\n"
        f"Subscription: <b>${price} USDT/month</b>\n\n"
        f"₿ <b>BTC</b>:\n<code>{wallets.get('BTC', 'N/A')}</code>\n\n"
        f"💲 <b>USDT</b> (TRC20):\n<code>{wallets.get('USDT', 'N/A')}</code>\n\n"
        f"🔒 <b>XMR</b>:\n<code>{wallets.get('XMR', 'N/A')}</code>\n\n"
        f"💎 <b>ETH</b>:\n<code>{wallets.get('ETH', 'N/A')}</code>\n\n"
        f"⚠️ Send <b>exactly {price} USDT</b>, then use /payment &lt;tx_hash&gt;"
    )
    send_msg(chat_id, text)

def handle_subscribe(chat_id):
    """Handle /subscribe command"""
    text = (
        f"💎 <b>8×8 Premium Subscription</b>\n\n"
        f"Price: <b>$8.88 USDT/month</b>\n"
        f"Unlimited AI chat + all features\n\n"
        f"1️⃣ Send <b>exactly 8.88 USDT</b> to one of the wallets\n"
        f"2️⃣ Use /payment &lt;tx_hash&gt; to verify\n"
        f"3️⃣ Admin confirms within 24h\n\n"
        f"Use /wallets to see all addresses."
    )
    send_msg(chat_id, text)

def handle_payment(chat_id, args):
    """Handle /payment command"""
    if not args:
        send_msg(chat_id, "💰 Usage: /payment <tx_hash>\n\nExample: /payment 0xabc123...")
        return
    tx_hash = args[0]
    result = api(f"/api/payment/submit?currency=USDT&amount=8.88&tx_hash={tx_hash}", method="POST")
    status = result.get("status", "error")
    msg = result.get("message", "Payment submitted")
    send_msg(chat_id, f"💰 <b>Payment {status.upper()}</b>\n\n{msg}\n\nTx: <code>{tx_hash[:20]}...</code>")

def handle_callback(chat_id, callback_data, user):
    """Handle inline keyboard callbacks"""
    if callback_data == "start":
        handle_start(chat_id, user)
    elif callback_data == "chat":
        send_msg(chat_id, "💬 <b>AI Chat</b>\n\nType /chat <your message> to talk to 8×8 AI.\n\nExample: /chat Explain quantum computing")
    elif callback_data == "status":
        handle_status(chat_id, user)
    elif callback_data == "wallets":
        handle_wallets(chat_id)
    elif callback_data == "subscribe":
        handle_subscribe(chat_id)
    elif callback_data == "mining":
        send_msg(chat_id, "⛏️ <b>Mining</b>\n\nEarn while your phone is idle!\n\n🔋 25% power = eco mode\n⚡ 75% power = performance mode\n🚀 100% power = max earnings\n\nUse /mining <25|75|100> to set power level.")
    elif callback_data == "staking":
        send_msg(chat_id, "🥩 <b>Staking</b>\n\nAllocate your rewards:\n\n⛏️ PoW — Proof of Work (mining)\n💎 PoS — Proof of Stake\n💾 PoStorage — Storage proof\n\nUse /staking <pow> <pos> <pst>\nExample: /staking 35 40 25")
    elif callback_data == "nft":
        send_msg(chat_id, "🖼️ <b>NFT Vaults</b>\n\nMax supply: 8,888,888\nEach vault locks 0.001 PI permanently\n\nRarities: Common, Rare, Epic, Legendary\n\nUse /nft mint <type> to create a vault.")
    elif callback_data == "referral":
        send_msg(chat_id, "👥 <b>Referral Program</b>\n\nEarn commissions from your referrals:\n\n🥇 Tier 1: 5% commission\n🥈 Tier 2: 2% commission\n🥉 Tier 3: 1% commission\n\nShare your referral link to start earning!")

def handle_message(chat_id, text, user):
    """Handle regular messages"""
    if text.startswith("/start"):
        handle_start(chat_id, user)
    elif text.startswith("/chat"):
        msg = text[5:].strip()
        handle_chat(chat_id, user, msg)
    elif text.startswith("/status"):
        handle_status(chat_id, user)
    elif text.startswith("/wallets"):
        handle_wallets(chat_id)
    elif text.startswith("/subscribe"):
        handle_subscribe(chat_id)
    elif text.startswith("/payment"):
        args = text[9:].strip().split()
        handle_payment(chat_id, args)
    elif text.startswith("/help"):
        send_msg(chat_id,
            "📖 <b>8×8 Ecosystem Commands</b>\n\n"
            "/start — Welcome & register\n"
            "/chat <msg> — AI chat\n"
            "/status — System status\n"
            "/wallets — Payment addresses\n"
            "/subscribe — Premium info\n"
            "/payment <tx> — Submit payment\n"
            "/mining <25|75|100> — Set mining power\n"
            "/staking <pow> <pos> <pst> — Staking config\n"
            "/nft mint <type> — Mint NFT vault\n"
            "/referral — Referral program\n"
            "/help — This message",
            get_main_keyboard()
        )
    else:
        # Treat as chat
        handle_chat(chat_id, user, text)

def process_update(update):
    """Process a single Telegram update"""
    try:
        if "message" in update:
            msg = update["message"]
            chat_id = msg["chat"]["id"]
            user = msg.get("from", {})
            text = msg.get("text", "")
            handle_message(chat_id, text, user)
        elif "callback_query" in update:
            cq = update["callback_query"]
            chat_id = cq["message"]["chat"]["id"]
            user = cq.get("from", {})
            data = cq.get("data", "")
            handle_callback(chat_id, data, user)
            # Answer callback to remove loading state
            url = f"https://api.telegram.org/bot{TOKEN}/answerCallbackQuery"
            req = urllib.request.Request(url,
                data=json.dumps({"callback_query_id": cq["id"]}).encode(),
                headers={"Content-Type": "application/json"})
            urllib.request.urlopen(req, timeout=5)
    except Exception as e:
        logger.error(f"Process error: {e}")

def main():
    if not TOKEN:
        logger.error("No TELEGRAM_BOT_TOKEN!")
        return
    
    # Delete webhook and start polling
    url = f"https://api.telegram.org/bot{TOKEN}/deleteWebhook"
    req = urllib.request.Request(url)
    urllib.request.urlopen(req, timeout=10)
    logger.info("Bot starting (polling)...")
    
    offset = 0
    while True:
        try:
            url = f"https://api.telegram.org/bot{TOKEN}/getUpdates?offset={offset}&limit=10&timeout=30"
            req = urllib.request.Request(url)
            resp = urllib.request.urlopen(req, timeout=35)
            data = json.loads(resp.read())
            
            for update in data.get("result", []):
                offset = update["update_id"] + 1
                process_update(update)
        except Exception as e:
            logger.error(f"Poll error: {e}")
            import time
            time.sleep(5)

if __name__ == "__main__":
    main()
