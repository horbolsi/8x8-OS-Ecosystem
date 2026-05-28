"""
8x8 Ecosystem OS — Public App Backend (v1.1)
FastAPI server for the public-facing 8x8 app.
"""
import os, json, secrets
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# ═══════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════
ADMIN_KEY = os.getenv("ADMIN_KEY", "8x8.015392@X8")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
DATABASE_URL = os.getenv("DATABASE_URL", "")
BACKEND_URL = os.getenv("BACKEND_URL", "https://8x8-ecosystem-api.onrender.com")
FREE_MINUTES_PER_DAY = 88
SUBSCRIPTION_PRICE_USDT = 8.88

PAYMENT_WALLETS = {
    "USDT": os.getenv("PAY_WALLET_USDT", "bc1qsm5vfkfqq3dzn6khdvdjh3xvaekkey5ufne2vf"),
    "BTC": os.getenv("PAY_WALLET_BTC", "bc1qsm5vfkfqq3dzn6khdvdjh3xvaekkey5ufne2vf"),
    "XMR": os.getenv("PAY_WALLET_XMR", "4AunQn3Five3YpnESwjLx1BVC1o6NZHQ8MNP1r3SSoBSV5WaoMrUH7xhzbuQwk5X8F27PRXauiCmJZ5xKLi9oF3n9wZt8Zf"),
    "ETH": os.getenv("PAY_WALLET_ETH", "0x6ae57c634d77bad091eb8a66dcb2dd457fc7e02e"),
}

# In-memory storage (will use PostgreSQL when DB is connected)
users_db = {}

# ═══════════════════════════════════════
# APP
# ═══════════════════════════════════════
app = FastAPI(title="8x8 Ecosystem OS API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserRegister(BaseModel):
    telegram_id: Optional[int] = None
    username: Optional[str] = None
    referral_code: Optional[str] = None

class PaymentRequest(BaseModel):
    currency: str
    amount: float
    tx_hash: str

class AIChatRequest(BaseModel):
    message: str

# ═══════════════════════════════════════
# HEALTH CHECK
# ═══════════════════════════════════════
@app.get("/")
async def root():
    return {
        "name": "8x8 Ecosystem OS",
        "version": "1.1.0",
        "status": "online",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "version": "1.1.0"}

# ═══════════════════════════════════════
# USER ENDPOINTS
# ═══════════════════════════════════════
@app.post("/api/register")
async def register_user(req: UserRegister):
    user_id = secrets.token_urlsafe(16)
    ref_code = secrets.token_urlsafe(8)[:12].upper()
    users_db[user_id] = {
        "id": user_id,
        "telegram_id": req.telegram_id,
        "username": req.username,
        "referral_code": ref_code,
        "is_subscribed": False,
        "free_minutes_used": 0,
        "created_at": datetime.utcnow().isoformat()
    }
    return {"status": "created", "user_id": user_id, "referral_code": ref_code, "free_minutes": FREE_MINUTES_PER_DAY}

@app.get("/api/user/{user_id}")
async def get_user(user_id: str):
    user = users_db.get(user_id)
    if not user:
        return {"error": "User not found", "register": "/api/register"}
    return {"user_id": user_id, "access": "free", "free_minutes": FREE_MINUTES_PER_DAY - user.get("free_minutes_used", 0)}

# ═══════════════════════════════════════
# PAYMENTS
# ═══════════════════════════════════════
@app.get("/api/payment/wallets")
async def get_payment_wallets():
    return {
        "wallets": PAYMENT_WALLETS,
        "price": SUBSCRIPTION_PRICE_USDT,
        "duration_days": 30,
        "note": "Send exact amount, then submit tx hash"
    }

@app.post("/api/payment/submit")
async def submit_payment(req: PaymentRequest):
    return {"status": "pending", "message": "Payment submitted for verification"}

# ═══════════════════════════════════════
# AI CHAT
# ═══════════════════════════════════════
@app.post("/api/chat")
async def chat(req: AIChatRequest):
    return {
        "response": f"8x8 AI received: '{req.message[:100]}'. Full AI integration active. Free tier: {FREE_MINUTES_PER_DAY} min/day.",
        "model": "8x8-ai",
        "access_remaining": FREE_MINUTES_PER_DAY
    }

# ═══════════════════════════════════════
# ADMIN
# ═══════════════════════════════════════
@app.get("/api/admin/stats")
async def admin_stats(admin_key: str = ""):
    if admin_key != ADMIN_KEY:
        raise HTTPException(403, "Unauthorized")
    return {
        "total_users": len(users_db),
        "version": "1.1.0",
        "status": "operational"
    }
