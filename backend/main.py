"""8x8 Ecosystem OS — Backend v1.1 (ultra-minimal)"""
import os, json, secrets
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="8x8 Ecosystem OS", version="1.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/")
async def root():
    return {"name": "8x8 Ecosystem OS", "version": "1.1.0", "status": "online"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/api/payment/wallets")
async def wallets():
    return {"wallets": {"BTC": os.getenv("PAY_WALLET_BTC",""), "XMR": os.getenv("PAY_WALLET_XMR","")}, "price": 8.88}

@app.post("/api/register")
async def register(telegram_id: int = None, username: str = None):
    return {"status": "created", "user_id": secrets.token_urlsafe(16), "free_minutes": 88}

@app.post("/api/chat")
async def chat(message: str = ""):
    return {"response": "8x8 AI online", "model": "8x8-ai"}
