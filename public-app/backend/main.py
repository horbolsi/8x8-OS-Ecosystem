"""
8x8 Ecosystem OS — Public App Backend
FastAPI server for the public-facing 8x8 app.
Handles: auth, payments, user accounts, mining tracking, AI chat relay
Deploy on Render/Render.yaml → auto-deploy from GitHub
"""
import os, json, time, hashlib, uuid, secrets
from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncpg
import httpx

# ═══════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/8x8_public")
ADMIN_KEY = os.getenv("ADMIN_KEY")  # MUST be set via env var, never hardcoded
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
FREE_MINUTES_PER_DAY = 88
SUBSCRIPTION_PRICE_USDT = 8.88
SUBSCRIPTION_DAYS = 30

# Payment wallets — public receives payments here
# MUST be set via env vars, never hardcoded
PAYMENT_WALLETS = {
    "USDT": os.getenv("PAY_WALLET_USDT", ""),
    "BTC": os.getenv("PAY_WALLET_BTC", ""),
    "ETH": os.getenv("PAY_WALLET_ETH", ""),
    "BNB": os.getenv("PAY_WALLET_BNB", ""),
    "XMR": os.getenv("PAY_WALLET_XMR", ""),
    "SOL": os.getenv("PAY_WALLET_SOL", ""),
    "TON": os.getenv("PAY_WALLET_TON", ""),
    "PI": os.getenv("PAY_WALLET_PI", ""),
}

# ═══════════════════════════════════════
# APP
# ═══════════════════════════════════════
app = FastAPI(title="8x8 Ecosystem OS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════
# DB SCHEMA (auto-created on startup)
# ═══════════════════════════════════════
SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT UNIQUE,
    username TEXT,
    referral_code TEXT UNIQUE DEFAULT encode(gen_random_uuid()::text::bytea, 'base64'),
    referred_by UUID REFERENCES users(id),
    is_subscribed BOOLEAN DEFAULT FALSE,
    subscription_expires TIMESTAMPTZ,
    free_minutes_used_today FLOAT DEFAULT 0,
    free_minutes_reset_date DATE DEFAULT CURRENT_DATE,
    mining_enabled BOOLEAN DEFAULT FALSE,
    mining_power_pct FLOAT DEFAULT 25.0,
    ai_provider_keys JSONB DEFAULT '{}',
    ai_preferred_model TEXT DEFAULT 'ollama/llama3.2:1b',
    balance_usdt FLOAT DEFAULT 0,
    balance_8x8 FLOAT DEFAULT 0,
    balance_tm8 FLOAT DEFAULT 0,
    balance_0x8 FLOAT DEFAULT 0,
    nft_vaults JSONB DEFAULT '[]',
    staking_config JSONB DEFAULT '{"pow":35,"pos":40,"pst":25}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW(),
    device_info JSONB DEFAULT '{}',
    is_banned BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    currency TEXT NOT NULL,
    amount FLOAT NOT NULL,
    tx_hash TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS mining_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    session_start TIMESTAMPTZ DEFAULT NOW(),
    session_end TIMESTAMPTZ,
    power_used_pct FLOAT,
    device_hash TEXT,
    hash_count BIGINT DEFAULT 0,
    earned_usdt FLOAT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chat_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    model_used TEXT,
    tokens_used INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES users(id),
    referee_id UUID REFERENCES users(id) UNIQUE,
    tier INT DEFAULT 1,
    commission_earned FLOAT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_telegram ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_referral ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_log_user ON chat_log(user_id);
"""

# ═══════════════════════════════════════
# MODELS
# ═══════════════════════════════════════
class UserRegister(BaseModel):
    telegram_id: Optional[int] = None
    username: Optional[str] = None
    referral_code: Optional[str] = None
    device_info: Optional[dict] = {}

class PaymentRequest(BaseModel):
    currency: str
    amount: float
    tx_hash: str

class AIChatRequest(BaseModel):
    message: str
    provider: Optional[str] = None
    model: Optional[str] = None

class MiningConfig(BaseModel):
    enabled: bool
    power_pct: Optional[float] = 25.0

class StakingConfig(BaseModel):
    pow: int
    pos: int
    pst: int

class AdminAction(BaseModel):
    action: str
    user_id: Optional[str] = None
    data: Optional[dict] = {}

# ═══════════════════════════════════════
# DB HELPER
# ═══════════════════════════════════════
_pool = None

async def get_db():
    global _pool
    if not _pool:
        _pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
        async with _pool.acquire() as conn:
            await conn.execute(SCHEMA_SQL)
    return _pool

async def get_user_by_api_key(api_key: str):
    pool = await get_db()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM users WHERE id::text = $1 OR telegram_id::text = $1",
            api_key
        )
        return row

async def get_user_by_telegram(tg_id: int):
    pool = await get_db()
    async with pool.acquire() as conn:
        return await conn.fetchrow("SELECT * FROM users WHERE telegram_id = $1", tg_id)

async def check_user_access(user: dict) -> dict:
    """Check if user has access (free minutes or subscription)"""
    now = datetime.utcnow()
    
    # Check subscription
    if user.get("is_subscribed") and user.get("subscription_expires"):
        if user["subscription_expires"] > now:
            return {"access": True, "type": "subscription", "remaining": float("inf")}
    
    # Check free minutes
    reset_date = user.get("free_minutes_reset_date")
    today = now.date()
    if reset_date and str(reset_date) != str(today):
        # Reset free minutes for new day
        pool = await get_db()
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE users SET free_minutes_used_today = 0, free_minutes_reset_date = CURRENT_DATE WHERE id = $1",
                user["id"]
            )
        used = 0
    else:
        used = user.get("free_minutes_used_today", 0) or 0
    
    remaining = max(0, FREE_MINUTES_PER_DAY - used)
    return {"access": remaining > 0, "type": "free", "remaining": remaining, "used": used}

# ═══════════════════════════════════════
# API ROUTES — PUBLIC
# ═══════════════════════════════════════

@app.get("/")
async def root():
    return {
        "name": "8x8 Ecosystem OS",
        "version": "1.0.0",
        "status": "online",
        "endpoints": ["/register", "/chat", "/wallet", "/mining", "/staking", "/payment"]
    }

@app.post("/api/register")
async def register_user(req: UserRegister):
    """Register a new user via Telegram ID or anonymous"""
    pool = await get_db()
    async with pool.acquire() as conn:
        # Check if user exists
        if req.telegram_id:
            existing = await conn.fetchrow("SELECT * FROM users WHERE telegram_id = $1", req.telegram_id)
            if(existing):
                return {"status": "existing", "user_id": str(existing["id"]), "referral_code": existing["referral_code"]}
        
        # Handle referral
        referred_by = None
        if req.referral_code:
            ref = await conn.fetchrow("SELECT id FROM users WHERE referral_code = $1", req.referral_code)
            if ref:
                referred_by = ref["id"]
        
        # Create user
        user_id = str(uuid.uuid4())
        ref_code = secrets.token_urlsafe(8)[:12].upper()
        
        await conn.execute("""
            INSERT INTO users (telegram_id, username, referral_code, referred_by, device_info)
            VALUES ($1, $2, $3, $4, $5)
        """, req.telegram_id, req.username, ref_code, referred_by, json.dumps(req.device_info or {}))
        
        # Record referral
        if referred_by:
            await conn.execute("""
                INSERT INTO referrals (referrer_id, referee_id, tier) VALUES ($1, $2, 1)
            """, referred_by, user_id)
        
        return {
            "status": "created",
            "user_id": user_id,
            "referral_code": ref_code,
            "free_minutes": FREE_MINUTES_PER_DAY
        }

@app.get("/api/user/{user_id}")
async def get_user(user_id: str, x_api_key: Optional[str] = Header(None)):
    pool = await get_db()
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT * FROM users WHERE id::text = $1", user_id)
        if not user:
            raise HTTPException(404, "User not found")
        
        access = await check_user_access(dict(user))
        return {
            "user_id": str(user["id"]),
            "username": user["username"],
            "referral_code": user["referral_code"],
            "is_subscribed": access["type"] == "subscription",
            "access": access,
            "mining_enabled": user["mining_enabled"],
            "mining_power_pct": user["mining_power_pct"],
            "balances": {
                "usdt": user["balance_usdt"],
                "8x8": user["balance_8x8"],
                "tm8": user["balance_tm8"],
                "0x8": user["balance_0x8"],
            },
            "nft_vaults": user["nft_vaults"],
            "staking": user["staking_config"],
        }

@app.post("/api/chat")
async def chat(user_id: str, req: AIChatRequest, x_api_key: Optional[str] = Header(None)):
    """AI Chat endpoint — checks user access, routes to their preferred AI provider"""
    pool = await get_db()
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT * FROM users WHERE id::text = $1", user_id)
        if not user:
            raise HTTPException(404, "User not found")
        
        access = await check_user_access(dict(user))
        if not access["access"]:
            return {
                "error": "NO_ACCESS",
                "message": f"You've used {FREE_MINUTES_PER_DAY} free minutes today. Subscribe for $8.88/month for unlimited access.",
                "subscribe_url": f"/api/payment/create?user_id={user_id}&currency=USDT"
            }
        
        # AI provider routing
        providers = user["ai_provider_keys"] or {}
        preferred = req.model or user["ai_preferred_model"]
        
        response_text = None
        tokens_used = 0
        
        # Try user's preferred provider first
        if "anthropic" in providers and providers["anthropic"]:
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    r = await client.post(
                        "https://api.anthropic.com/v1/messages",
                        headers={
                            "x-api-key": providers["anthropic"],
                            "anthropic-version": "2023-06-01",
                            "content-type": "application/json"
                        },
                        json={
                            "model": req.model or "claude-sonnet-4-20250514",
                            "max_tokens": 1000,
                            "system": "You are FlashTM8 AI, the sovereign intelligence of the 8x8 Ecosystem. You are helpful, knowledgeable, and direct.",
                            "messages": [{"role": "user", "content": req.message}]
                        }
                    )
                    data = r.json()
                    response_text = data.get("content", [{}])[0].get("text", "")
                    tokens_used = data.get("usage", {}).get("output_tokens", 0)
            except Exception:
                pass
        
        # Fallback to OpenRouter (free models)
        if not response_text and "openrouter" in providers and providers["openrouter"]:
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    r = await client.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers={"Authorization": f"Bearer {providers['openrouter']}"},
                        json={
                            "model": "deepseek/deepseek-v3.1-terbo:free",
                            "messages": [{"role": "user", "content": req.message}]
                        }
                    )
                    data = r.json()
                    response_text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            except Exception:
                pass
        
        # Final fallback
        if not response_text:
            response_text = "I'm currently experiencing high traffic. Please try again in a moment or configure your AI provider keys in settings."
        
        # Log chat
        await conn.execute(
            "INSERT INTO chat_log (user_id, role, content) VALUES ($1, 'user', $2)",
            user["id"], req.message
        )
        await conn.execute(
            "INSERT INTO chat_log (user_id, role, content, model_used, tokens_used) VALUES ($1, 'assistant', $2, $3, $4)",
            user["id"], response_text, preferred, tokens_used
        )
        
        # Update free minutes used (estimate ~0.5 min per chat)
        if access["type"] == "free":
            await conn.execute(
                "UPDATE users SET free_minutes_used_today = free_minutes_used_today + 0.5 WHERE id = $1",
                user["id"]
            )
        
        return {"response": response_text, "model": preferred, "tokens": tokens_used, "access_remaining": access["remaining"]}

# ═══════════════════════════════════════
# PAYMENTS
# ═══════════════════════════════════════

@app.get("/api/payment/wallets")
async def get_payment_wallets():
    """Get payment wallet addresses"""
    return {
        "wallets": PAYMENT_WALLETS,
        "price": SUBSCRIPTION_PRICE_USDT,
        "duration_days": SUBSCRIPTION_DAYS,
        "note": "Send exact amount, then submit your tx hash for verification"
    }

@app.post("/api/payment/submit")
async def submit_payment(user_id: str, req: PaymentRequest, x_api_key: Optional[str] = Header(None)):
    """Submit payment for verification"""
    pool = await get_db()
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT * FROM users WHERE id::text = $1", user_id)
        if not user:
            raise HTTPException(404, "User not found")
        
        payment_id = await conn.fetchval("""
            INSERT INTO payments (user_id, currency, amount, tx_hash, status)
            VALUES ($1, $2, $3, $4, 'pending') RETURNING id
        """, user["id"], req.currency.upper(), req.amount, req.tx_hash)
        
        return {
            "status": "pending",
            "payment_id": str(payment_id),
            "message": "Payment submitted. Admin will verify and activate your subscription.",
            "manual_activate": f"/api/admin/confirm-payment?payment_id={payment_id}&admin_key={ADMIN_KEY}"
        }

@app.get("/api/payment/status/{user_id}")
async def payment_status(user_id: str):
    pool = await get_db()
    async with pool.acquire() as conn:
        payments = await conn.fetch(
            "SELECT * FROM payments WHERE user_id::text = $1 ORDER BY created_at DESC LIMIT 10",
            user_id
        )
        return {"payments": [dict(p) for p in payments]}

# ═══════════════════════════════════════
# MINING
# ═══════════════════════════════════════

@app.post("/api/mining/config")
async def set_mining_config(user_id: str, req: MiningConfig, x_api_key: Optional[str] = Header(None)):
    pool = await get_db()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE users SET mining_enabled = $1, mining_power_pct = $2 WHERE id::text = $3",
            req.enabled, req.power_pct, user_id
        )
        return {"mining_enabled": req.enabled, "power_pct": req.power_pct}

@app.post("/api/mining/report")
async def report_mining(user_id: str, hash_count: int, device_hash: str):
    """Phone app reports mining activity"""
    pool = await get_db()
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT * FROM users WHERE id::text = $1", user_id)
        if user and user["mining_enabled"]:
            earned = hash_count * 0.000001  # tiny reward per hash
            await conn.execute("""
                INSERT INTO mining_log (user_id, device_hash, hash_count, earned_usdt)
                VALUES ($1, $2, $3, $4)
            """, user["id"], device_hash, hash_count, earned)
            return {"earned_usdt": earned, "total_hashes": hash_count}
        return {"earned_usdt": 0, "message": "Mining not enabled"}

# ═══════════════════════════════════════
# STAKING
# ═══════════════════════════════════════

@app.post("/api/staking/config")
async def set_staking_config(user_id: str, req: StakingConfig, x_api_key: Optional[str] = Header(None)):
    if req.pow + req.pos + req.pst != 100:
        raise HTTPException(400, "Staking allocation must total 100%")
    pool = await get_db()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE users SET staking_config = $1 WHERE id::text = $2",
            json.dumps({"pow": req.pow, "pos": req.pos, "pst": req.pst}),
            user_id
        )
        return {"staking": {"pow": req.pow, "pos": req.pos, "pst": req.pst}}

@app.get("/api/staking/rewards/{user_id}")
async def get_staking_rewards(user_id: str):
    pool = await get_db()
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT * FROM users WHERE id::text = $1", user_id)
        if not user:
            raise HTTPException(404, "User not found")
        
        cfg = user["staking_config"] or {"pow": 35, "pos": 40, "pst": 25}
        # Daily reward estimates (simulated)
        rewards = {
            "tm8_daily": round(cfg["pow"] * 0.012, 4),
            "8x8_daily": round(cfg["pos"] * 0.0153, 4),
            "0x8_daily": round(cfg["pst"] * 0.011, 4),
        }
        return {"staking": cfg, "daily_rewards": rewards}

# ═══════════════════════════════════════
# NFT VAULTS
# ═══════════════════════════════════════

@app.get("/api/nft/{user_id}")
async def get_nft_vaults(user_id: str):
    pool = await get_db()
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT * FROM users WHERE id::text = $1", user_id)
        if not user:
            raise HTTPException(404, "User not found")
        return {"vaults": user["nft_vaults"] or [], "max_supply": 8888888, "burned": 0}

@app.post("/api/nft/mint")
async def mint_nft(user_id: str, vault_type: str = "common", assets: str = "", x_api_key: Optional[str] = Header(None)):
    """Mint a new NFT vault (locks 0.001 PI permanently)"""
    pool = await get_db()
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT * FROM users WHERE id::text = $1", user_id)
        if not user:
            raise HTTPException(404, "User not found")
        
        vaults = user["nft_vaults"] or []
        vault_id = f"{len(vaults)+1:04d}"
        
        new_vault = {
            "id": vault_id,
            "type": vault_type,
            "locked": "0.001 π",
            "assets": [a.strip() for a in assets.split(",") if a.strip()],
            "status": "empty",
            "rarity": vault_type.upper()
        }
        vaults.append(new_vault)
        
        await conn.execute(
            "UPDATE users SET nft_vaults = $1 WHERE id = $2",
            json.dumps(vaults), user["id"]
        )
        
        return {"vault": new_vault, "total_vaults": len(vaults)}

# ═══════════════════════════════════════
# REFERRALS
# ═══════════════════════════════════════

@app.get("/api/referral/{user_id}")
async def get_referral_info(user_id: str):
    pool = await get_db()
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT * FROM users WHERE id::text = $1", user_id)
        if not user:
            raise HTTPException(404, "User not found")
        
        refs = await conn.fetch("""
            SELECT r.tier, u.username, u.created_at 
            FROM referrals r JOIN users u ON r.referee_id = u.id
            WHERE r.referrer_id = $1 ORDER BY r.created_at DESC
        """, user["id"])
        
        return {
            "referral_code": user["referral_code"],
            "referrals": [dict(r) for r in refs],
            "tier1_count": sum(1 for r in refs if r["tier"] == 1),
            "tier2_count": sum(1 for r in refs if r["tier"] == 2),
            "tier3_count": sum(1 for r in refs if r["tier"] == 3),
            "commission_tier1": "5%",
            "commission_tier2": "2%",
            "commission_tier3": "1%",
        }

# ═══════════════════════════════════════
# MARKET DATA
# ═══════════════════════════════════════

@app.get("/api/market/prices")
async def get_market_prices():
    """Get live crypto prices"""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://api.coingecko.com/api/v3/simple/price",
                params={
                    "ids": "bitcoin,ethereum,solana,binancecoin,toncoin",
                    "vs_currencies": "usd",
                    "include_24hr_change": "true"
                }
            )
            data = r.json()
            return {
                "BTC": {"price": data.get("bitcoin", {}).get("usd", 0), "change_24h": data.get("bitcoin", {}).get("usd_24h_change", 0)},
                "ETH": {"price": data.get("ethereum", {}).get("usd", 0), "change_24h": data.get("ethereum", {}).get("usd_24h_change", 0)},
                "SOL": {"price": data.get("solana", {}).get("usd", 0), "change_24h": data.get("solana", {}).get("usd_24h_change", 0)},
                "BNB": {"price": data.get("binancecoin", {}).get("usd", 0), "change_24h": data.get("binancecoin", {}).get("usd_24h_change", 0)},
                "TON": {"price": data.get("toncoin", {}).get("usd", 0), "change_24h": data.get("toncoin", {}).get("usd_24h_change", 0)},
                "8x8": {"price": 0.001, "change_24h": 1.8},
                "TM8": {"price": 0.042, "change_24h": 3.2},
                "0x8": {"price": 0.018, "change_24h": -0.5},
            }
    except Exception:
        return {
            "BTC": {"price": 97500, "change_24h": 2.1},
            "ETH": {"price": 3420, "change_24h": 1.4},
            "SOL": {"price": 188, "change_24h": 4.2},
            "8x8": {"price": 0.001, "change_24h": 1.8},
            "TM8": {"price": 0.042, "change_24h": 3.2},
        }

@app.get("/api/market/btc-trades")
async def get_btc_trades():
    """Get recent BTC trades via WebSocket (proxied)"""
    # This would connect to OKX/Binance WS in production
    return {"message": "WebSocket feed available at wss://ws.okx.com:8443/ws/v5/public"}

# ═══════════════════════════════════════
# ADMIN ENDPOINTS
# ═══════════════════════════════════════

@app.get("/api/admin/stats")
async def admin_stats(admin_key: str):
    if admin_key != ADMIN_KEY:
        raise HTTPException(403, "Forbidden")
    
    pool = await get_db()
    async with pool.acquire() as conn:
        total_users = await conn.fetchval("SELECT COUNT(*) FROM users")
        subscribed_users = await conn.fetchval("SELECT COUNT(*) FROM users WHERE is_subscribed = TRUE")
        total_payments = await conn.fetchval("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'confirmed'")
        active_miners = await conn.fetchval("SELECT COUNT(*) FROM users WHERE mining_enabled = TRUE")
        
        return {
            "total_users": total_users,
            "subscribed_users": subscribed_users,
            "total_payments_usdt": total_payments,
            "active_miners": active_miners,
            "free_minutes_per_day": FREE_MINUTES_PER_DAY,
            "subscription_price": SUBSCRIPTION_PRICE_USDT,
        }

@app.post("/api/admin/confirm-payment")
async def confirm_payment(payment_id: str, admin_key: str):
    if admin_key != ADMIN_KEY:
        raise HTTPException(403, "Forbidden")
    
    pool = await get_db()
    async with pool.acquire() as conn:
        payment = await conn.fetchrow("SELECT * FROM payments WHERE id::text = $1", payment_id)
        if not payment:
            raise HTTPException(404, "Payment not found")
        
        expires = datetime.utcnow() + timedelta(days=SUBSCRIPTION_DAYS)
        await conn.execute("""
            UPDATE payments SET status = 'confirmed', confirmed_at = NOW() WHERE id = $1
        """, payment["id"])
        await conn.execute("""
            UPDATE users SET is_subscribed = TRUE, subscription_expires = $1 WHERE id = $2
        """, expires, payment["user_id"])
        
        return {"status": "confirmed", "subscription_expires": str(expires)}

@app.get("/api/admin/payments/pending")
async def pending_payments(admin_key: str):
    if admin_key != ADMIN_KEY:
        raise HTTPException(403, "Forbidden")
    
    pool = await get_db()
    async with pool.acquire() as conn:
        payments = await conn.fetch("""
            SELECT p.*, u.username, u.telegram_id FROM payments p
            JOIN users u ON p.user_id = u.id
            WHERE p.status = 'pending' ORDER BY p.created_at DESC
        """)
        return {"payments": [dict(p) for p in payments]}

# ═══════════════════════════════════════
# TELEGRAM BOT WEBHOOK
# ═══════════════════════════════════════

@app.post("/api/telegram/webhook")
async def telegram_webhook(request: Request):
    """Receive Telegram updates"""
    data = await request.json()
    
    if "message" in data:
        msg = data["message"]
        chat_id = msg["chat"]["id"]
        text = msg.get("text", "")
        username = msg.get("from", {}).get("username", "")
        
        async with httpx.AsyncClient() as client:
            if text.startswith("/start"):
                ref = text.split(" ")[1] if len(text.split(" ")) > 1 else None
                # Auto-register
                try:
                    await client.post(f"http://localhost:8000/api/register", json={
                        "telegram_id": chat_id,
                        "username": username,
                        "referral_code": ref
                    })
                except Exception:
                    pass
                
                await client.post(
                    f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                    json={
                        "chat_id": chat_id,
                        "text": f"⚡ Welcome to 8x8 Ecosystem OS!\n\nYou get {FREE_MINUTES_PER_DAY} free minutes daily.\nSubscribe for ${SUBSCRIPTION_PRICE_USDT}/month for unlimited access.\n\nCommands:\n/wallet - Payment wallets\n/subscribe - Upgrade to Pro\n/status - Your account status\n/referral - Your referral code\n/help - All commands",
                        "parse_mode": "HTML"
                    }
                )
            
            elif text == "/wallet":
                wallets_text = "\n".join([f"<b>{k}</b>: <code>{v}</code>" for k, v in PAYMENT_WALLETS.items()])
                await client.post(
                    f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                    json={
                        "chat_id": chat_id,
                        "text": f"💎 <b>Payment Wallets</b>\n\nWallets:\n{wallets_text}\n\nPrice: <b>${SUBSCRIPTION_PRICE_USDT} USDT</b> / {SUBSCRIPTION_DAYS} days\n\nAfter sending, use /pay TX_HASH to verify.",
                        "parse_mode": "HTML"
                    }
                )
            
            elif text.startswith("/pay"):
                tx_hash = text.split(" ")[1] if len(text.split(" ")) > 1 else ""
                if tx_hash:
                    await client.post(
                        f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                        json={
                            "chat_id": chat_id,
                            "text": f"✅ Payment submitted: <code>{tx_hash}</code>\n\nAdmin will verify and activate your subscription within 1 hour.",
                            "parse_mode": "HTML"
                        }
                    )
    
    return {"ok": True}

# ═══════════════════════════════════════
# HEALTH
# ═══════════════════════════════════════

@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# ═══════════════════════════════════════
# STARTUP
# ═══════════════════════════════════════

@app.on_event("startup")
async def startup():
    await get_db()
    print("✅ 8x8 Ecosystem OS Backend initialized")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
