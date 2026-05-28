"""
8x8 Ecosystem OS — Public App Backend (v1.1)
FastAPI server for the public-facing 8x8 app.
"""
import os, json, secrets, logging
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ADMIN_KEY = os.getenv("ADMIN_KEY", "8x8.015392@X8")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
BACKEND_URL = os.getenv("BACKEND_URL", "https://8x8-os-live.onrender.com")
FREE_MINUTES_PER_DAY = 88

PAYMENT_WALLETS = {
    "USDT": "bc1qsm5vfkfqq3dzn6khdvdjh3xvaekkey5ufne2vf",
    "BTC": "bc1qsm5vfkfqq3dzn6khdvdjh3xvaekkey5ufne2vf",
    "XMR": "4AunQn3Five3YpnESwjLx1BVC1o6NZHQ8MNP1r3SSoBSV5WaoMrUH7xhzbuQwk5X8F27PRXauiCmJZ5xKLi9oF3n9wZt8Zf",
    "ETH": "0x6ae57c634d77bad091eb8a66dcb2dd457fc7e02e",
}

users_db = {}

app = FastAPI(title="8x8 Ecosystem OS API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RegisterReq:
    def __init__(self, telegram_id=None, username=None, referral_code=None):
        self.telegram_id = telegram_id
        self.username = username
        self.referral_code = referral_code

@app.get("/")
async def root():
    return {"name": "8x8 Ecosystem OS", "version": "1.1.0", "status": "online"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/api/register")
async def register(telegram_id: int = None, username: str = None):
    user_id = secrets.token_urlsafe(16)
    ref_code = secrets.token_urlsafe(8)[:12].upper()
    users_db[user_id] = {"id": user_id, "telegram_id": telegram_id, "username": username, "referral_code": ref_code}
    return {"status": "created", "user_id": user_id, "referral_code": ref_code, "free_minutes": FREE_MINUTES_PER_DAY}

@app.get("/api/user/{user_id}")
async def get_user(user_id: str):
    user = users_db.get(user_id)
    if not user:
        return {"error": "User not found"}
    return {"user_id": user_id, "access": "free"}

@app.get("/api/payment/wallets")
async def get_wallets():
    return {"wallets": PAYMENT_WALLETS, "price": 8.88, "duration_days": 30}

@app.post("/api/payment/submit")
async def submit_payment(currency: str = "", amount: float = 0, tx_hash: str = ""):
    return {"status": "pending"}

@app.post("/api/chat")
async def chat(message: str = ""):
    return {"response": f"8x8 AI online. Received: '{message[:100]}'", "model": "8x8-ai"}

@app.get("/api/admin/stats")
async def admin_stats(admin_key: str = ""):
    if admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403)
    return {"total_users": len(users_db), "version": "1.1.0"}
