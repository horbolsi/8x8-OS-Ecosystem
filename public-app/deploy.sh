#!/bin/bash
# Push public-app to GitHub repo for Render deployment
cd /root/8x8-os

# Ensure git is configured
git config user.email "8x8@ecosystem.io" 2>/dev/null || true
git config user.name "FlashTM8" 2>/dev/null || true

# Add public-app files
git add public-app/
git commit -m "feat: 8x8 Public App v1.0

- FastAPI backend (auth, payments, AI chat, mining, staking, NFT)
- Telegram bot (onboarding, payments, AI chat)
- PWA frontend (mobile-first, dark theme, gold/red)
- Auto-installer script (Termix one-liner)
- Render deployment config (auto-deploy from GitHub)
- Neon PostgreSQL schema

Features:
- 88 min free/day + $8.88/month unlimited subscription
- Multi-chain payment (USDT/BTC/ETH/XMR/SOL/TON/BNB/PI)
- AI chat via user's own API keys + OpenRouter fallback
- Mining (25% idle / 75% active) feeds ecosystem
- NFT vault system (8,888,888 max, 0.001 PI locked)
- Staking (PoW/PoS/PoStorage)
- Referral system (5%/2%/1%)
- Market data (CoinGecko live prices)" 2>/dev/null || true

echo ""
echo "═══════════════════════════════════════════════════"
echo "  8x8 Public App ready for deployment!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  Backend:  /root/8x8-os/public-app/backend/main.py"
echo "  Bot:      /root/8x8-os/public-app/bot/telegram_bot.py"
echo "  Frontend: /root/8x8-os/public-app/frontend/index.html"
echo "  Installer:/root/8x8-os/public-app/installer/install.sh"
echo "  Deploy:   /root/8x8-os/public-app/render.yaml"
echo ""
echo "  To deploy:"
echo "  1. Push to GitHub: cd /root/8x8-os && git push"
echo "  2. Connect repo to Render.com"
echo "  3. Set TELEGRAM_BOT_TOKEN in Render env vars"
echo "  4. Auto-deploys!"
echo ""
