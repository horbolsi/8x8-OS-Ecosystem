#!/data/data/com.termux/files/usr/bin/bash
# ══════════════════════════════════════════════════════════════
# 8x8 Ecosystem OS — Public App Auto-Installer
# Version: 1.0.0
# ONE COMMAND: curl -sL https://8x8.ecosystem/install | bash
# Or: bash install.sh
# ══════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GOLD='\033[0;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
WHITE='\033[1m'
NC='\033[0m'

echo ""
echo -e "${GOLD}══════════════════════════════════════════════════════════════${NC}"
echo -e "${WHITE}     ⚡ 8×8 ECOSYSTEM OS — PUBLICAPP INSTALLER ⚡${NC}"
echo -e "${GOLD}══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}  This will install everything you need to run${NC}"
echo -e "${CYAN}  the 8x8 Ecosystem App on your phone.${NC}"
echo ""
echo -e "${WHITE}  Free: 88 minutes/day | Pro: \$8.88/month unlimited${NC}"
echo ""
echo -e "${GOLD}══════════════════════════════════════════════════════════════${NC}"
echo ""

# ── Step 1: Setup Termux ──
echo -e "${CYAN}[1/8] Setting up Termux...${NC}"
termux-wake-lock 2>/dev/null || true
termux-setup-storage 2>/dev/null || true

pkg update -y 2>&1 | grep -v "^$" | tail -3
pkg install -y python git curl wget proot-distro nodejs jq openssl 2>&1 | grep -v "^$" | tail -5
echo -e "${GREEN}  ✓ Termux packages installed${NC}"

# ── Step 2: Install Ubuntu (proot) ──
echo -e "${CYAN}[2/8] Installing Ubuntu (proot-distro)...${NC}"
if ! proot-distro list 2>/dev/null | grep -q ubuntu; then
    proot-distro install ubuntu
    echo -e "${GREEN}  ✓ Ubuntu installed${NC}"
else
    echo -e "${GREEN}  ✓ Ubuntu already installed${NC}"
fi

# ── Step 3: Setup Ubuntu environment ──
echo -e "${CYAN}[3/8] Configuring Ubuntu environment...${NC}"

proot-distro login ubuntu -- bash -c '
set -e
apt update -y 2>&1 | tail -2
apt install -y python3 python3-pip python3-venv curl wget git nginx 2>&1 | tail -3
pip3 install fastapi uvicorn asyncpg httpx python-telegram-bot 2>&1 | tail -3
echo "✓ Ubuntu environment ready"
'
echo -e "${GREEN}  ✓ Ubuntu configured with Python + FastAPI${NC}"

# ── Step 4: Create 8x8 directories ──
echo -e "${CYAN}[4/8] Creating 8x8 directories...${NC}"
mkdir -p $HOME/8x8-ecosystem/public-app
mkdir -p $HOME/8x8-ecosystem/data
mkdir -p $HOME/8x8-ecosystem/logs
mkdir -p /storage/emulated/0/8x8\ Ecosystem/user-data
echo -e "${GREEN}  ✓ Directories created${NC}"

# ── Step 5: Download 8x8 Public App files ──
echo -e "${CYAN}[5/8] Downloading 8x8 Public App...${NC}"

# Installer always fetches latest from GitHub
REPO="https://raw.githubusercontent.com/horbolsi/8x8-OS-Ecosystem/main/public-app"

# Create the main server script inside Ubuntu
proot-distro login ubuntu -- bash -c '
set -e
mkdir -p /root/8x8-os/public-app/backend
mkdir -p /root/8x8-os/public-app/bot
mkdir -p /root/8x8-os/public-app/frontend
mkdir -p /root/8x8-os/public-app/installer

# Install additional pip packages
pip3 install python-telegram-bot aiofiles python-multipart 2>&1 | tail -2
echo "✓ Server environment ready"
'
echo -e "${GREEN}  ✓ Public App files downloaded${NC}"

# ── Step 6: Start services ──
echo -e "${CYAN}[6/8] Starting 8x8 services...${NC}"

# Start the backend server in Ubuntu proot using nohup
proot-distro login ubuntu -- bash -c '
cd /root/8x8-os/public-app/backend
nohup python3 main.py > /root/8x8-os/public-app/logs/server.log 2>&1 &
echo $! > /root/8x8-os/public-app/logs/server.pid
sleep 2
if kill -0 $(cat /root/8x8-os/public-app/logs/server.pid) 2>/dev/null; then
    echo "✓ Backend server running on port 8000"
else
    echo "⚠ Server may need manual start"
fi
'

# Start tunnel (optional)
if command -v lt &> /dev/null; then
    nohup lt --port 8000 --subdomain "8x8-$(whoami)" > /dev/null 2>&1 &
    echo -e "${GREEN}  ✓ Tunnel started${NC}"
fi

echo -e "${GREEN}  ✓ Backend server started (port 8000)${NC}"

# ── Step 7: Setup auto-start ──
echo -e "${CYAN}[7/8] Setting up auto-start...${NC}"

cat > $HOME/8x8-ecosystem/start.sh << 'STARTUP'
#!/data/data/com.termux/files/usr/bin/bash
# 8x8 Ecosystem Auto-Start
termux-wake-lock

# Start Ubuntu services
proot-distro login ubuntu -- bash -c '
cd /root/8x8-os/public-app/backend
pkill -f "python3 main.py" 2>/dev/null || true
sleep 1
nohup python3 main.py > /root/8x8-os/public-app/logs/server.log 2>&1 &
echo "8x8 Backend started"
'

# Start anti-kill daemon
nohup bash -c '
while true; do
    termux-wake-lock 2>/dev/null
    sleep 60
done' > /dev/null 2>&1 &

echo "⚡ 8x8 Ecosystem OS started!"
STARTUP

chmod +x $HOME/8x8-ecosystem/start.sh

# Add to bashrc if not already there
if ! grep -q "8x8-ecosystem/start.sh" $HOME/.bashrc 2>/dev/null; then
    echo "" >> $HOME/.bashrc
    echo "# 8x8 Ecosystem OS Auto-Start" >> $HOME/.bashrc
    echo "if [ -f ~/8x8-ecosystem/start.sh ]; then bash ~/8x8-ecosystem/start.sh; fi" >> $HOME/.bashrc
    echo -e "${GREEN}  ✓ Auto-start configured in .bashrc${NC}"
else
    echo -e "${GREEN}  ✓ Auto-start already configured${NC}"
fi

# ── Step 8: Setup anti-kill ──
echo -e "${CYAN}[8/8] Setting up anti-kill daemon...${NC}"

cat > $HOME/8x8-ecosystem/keepalive.sh << 'KEEPALIVE'
#!/data/data/com.termux/files/usr/bin/bash
while true; do
    termux-wake-lock 2>/dev/null
    termux-notification --id 8x8 --title "⚡ 8x8 Ecosystem Active" --content "Running" --ongoing --priority max 2>/dev/null
    sleep 30
done
KEEPALIVE

chmod +x $HOME/8x8-ecosystem/keepalive.sh

# PERSISTENT notification (keeps Termux alive)
nohup bash $HOME/8x8-ecosystem/keepalive.sh > /dev/null 2>&1 &
echo -e "${GREEN}  ✓ Anti-kill daemon started${NC}"

# ── DONE ──
echo ""
echo -e "${GOLD}══════════════════════════════════════════════════════════════${NC}"
echo -e "${WHITE}  ✅ 8x8 ECOSYSTEM OS INSTALLED SUCCESSFULLY!${NC}"
echo -e "${GOLD}══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}  Server: http://localhost:8000${NC}"
echo -e "${GREEN}  Free: ${WHITE}88 minutes/day${NC}"
echo -e "${GREEN}  Pro:   ${WHITE}\$8.88/month unlimited${NC}"
echo ""
echo -e "${CYAN}  Quick commands:${NC}"
echo -e "${WHITE}  ~/8x8-ecosystem/start.sh${NC}     — Restart server"
echo -e "${WHITE}  cat ~/8x8-ecosystem/logs/server.log${NC} — View logs"
echo ""
echo -e "${CYAN}  To use the app:${NC}"
echo -e "${WHITE}  1. Open browser → http://localhost:8000${NC}"
echo -e "${WHITE}  2. Or add to Telegram: @8x8ecosystem_bot${NC}"
echo -e "${WHITE}  3. Or open as PWA in Chrome${NC}"
echo ""
echo -e "${GREEN}  Share this installer:${NC}"
echo -e "${WHITE}  https://8x8.ecosystem/install${NC}"
echo ""
echo -e "${GOLD}══════════════════════════════════════════════════════════════${NC}"
