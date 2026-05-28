/**
 * 8x8 OS — Real World Map & Agent System
 * Live map with Leaflet, agent tracking, zero-lag rendering
 */

// ═══ CONFIGURATION ═══
const CONFIG = {
    map: {
        defaultLat: 25.2048,  // Dubai (neutral starting point)
        defaultLng: 55.2708,
        defaultZoom: 3,
        tileProvider: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    },
    agents: {
        updateInterval: 5000,  // ms between location updates
        trailLength: 50,       // number of past positions to show
        maxVisible: 1000       // max agents to render at once
    },
    performance: {
        particleCount: 100,    // reduced from 300 for zero lag
        fpsTarget: 60,
        useSimpleShapes: true  // use basic geometries for mobile
    }
};

// ═══ AGENT LOCATION DATABASE ═══
const AgentLocations = new Map();

// ═══ REAL-WORLD MAP MODULE ═══
class RealWorldMap {
    constructor(containerId) {
        this.containerId = containerId;
        this.markers = new Map();
        this.trails = new Map();
        this.initialized = false;
    }

    async init() {
        // Load Leaflet from CDN
        if (!window.L) {
            await this.loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
            await this.loadCSS('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
        }

        this.map = L.map(this.containerId, {
            zoomControl: true,
            attributionControl: false
        }).setView([CONFIG.map.defaultLat, CONFIG.map.defaultLng], CONFIG.map.defaultZoom);

        L.tileLayer(CONFIG.map.tileProvider, {
            maxZoom: 19,
            subdomains: ['a', 'b', 'c']
        }).addTo(this.map);

        // Add sovereign marker (FlashTM8)
        this.addSovereignMarker();

        // Start location tracking
        this.startLocationTracking();

        this.initialized = true;
        console.log('[8x8 OS] Real-world map initialized');
    }

    loadScript(url) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = url;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    loadCSS(url) {
        return new Promise((resolve, reject) => {
            const l = document.createElement('link');
            l.rel = 'stylesheet';
            l.href = url;
            l.onload = resolve;
            l.onerror = reject;
            document.head.appendChild(l);
        });
    }

    addSovereignMarker() {
        const icon = L.divIcon({
            className: 'sovereign-marker',
            html: '<div style="width:24px;height:24px;background:radial-gradient(circle,#FFD700,#FF6600);border-radius:50%;border:2px solid #fff;box-shadow:0 0 20px #FFD700,0 0 40px rgba(255,215,0,0.5);animation:pulse 2s infinite"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        this.sovereignMarker = L.marker(
            [CONFIG.map.defaultLat, CONFIG.map.defaultLng],
            {icon, draggable: true}
        ).addTo(this.map);

        this.sovereignMarker.bindPopup('<b>⚡ FlashTM8 ⚡</b><br>Sovereign Core<br>8x8 OS Command Center');

        this.sovereignMarker.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            this.updateSovereignLocation(pos.lat, pos.lng);
        });
    }

    async updateSovereignLocation(lat, lng) {
        try {
            const r = await fetch('/api/map/sovereign', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({lat, lng, timestamp: Date.now()})
            });
            const d = await r.json();
            if (d.success) console.log('[8x8] Sovereign location updated:', lat.toFixed(4), lng.toFixed(4));
        } catch(e) { /* silent */ }
    }

    addAgentMarker(agent) {
        const colors = {
            FLASH: '#00FFFF', AEGIS: '#FF2222', VOLT: '#FFAA00', CANVAS: '#AA44FF',
            PULSE: '#00FF88', BEQA: '#FF88AA', SCRIBE: '#7788AA', WRENCH: '#AA6633',
            MIDAS: '#FFD700', TRADER: '#00DDFF', CREATOR: '#FF44AA', HAWK: '#44AAFF'
        };
        const color = colors[agent.name] || '#888888';

        const icon = L.divIcon({
            className: 'agent-marker',
            html: `<div style="width:12px;height:12px;background:${color};border-radius:50%;border:2px solid rgba(255,255,255,0.8);box-shadow:0 0 8px ${color}"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });

        const marker = L.marker(
            [agent.lat || CONFIG.map.defaultLat + (Math.random() - 0.5) * 10,
             agent.lng || CONFIG.map.defaultLng + (Math.random() - 0.5) * 10],
            {icon}
        ).addTo(this.map);

        marker.bindPopup(`<b>${agent.emoji} ${agent.name}</b><br>${agent.role}<br>Status: ${agent.status || 'active'}`);

        this.markers.set(agent.name, marker);

        // Initialize trail
        this.trails.set(agent.name, []);
    }

    updateAgentLocation(agentName, lat, lng) {
        const marker = this.markers.get(agentName);
        if (marker) {
            marker.setLatLng([lat, lng]);

            // Update trail
            const trail = this.trails.get(agentName) || [];
            trail.push([lat, lng]);
            if (trail.length > CONFIG.agents.trailLength) trail.shift();
            this.trails.set(agentName, trail);

            // Draw trail line
            if (this.trailLines?.[agentName]) {
                this.map.removeLayer(this.trailLines[agentName]);
            }
            if (trail.length > 1) {
                const agent = AGENTS.find(a => a.name === agentName);
                const color = agent?.color || '#888';
                this.trailLines = this.trailLines || {};
                this.trailLines[agentName] = L.polyline(trail, {
                    color: '#' + color.toString(16).padStart(6, '0'),
                    weight: 2, opacity: 0.5, dashArray: '5,5'
                }).addTo(this.map);
            }
        }
    }

    startLocationTracking() {
        // Simulate agent movement for demo
        setInterval(() => {
            AGENTS.forEach(agent => {
                if (!this.markers.has(agent.name)) {
                    this.addAgentMarker(agent);
                } else {
                    // Small random movement
                    const marker = this.markers.get(agent.name);
                    const pos = marker.getLatLng();
                    const newLat = pos.lat + (Math.random() - 0.5) * 0.01;
                    const newLng = pos.lng + (Math.random() - 0.5) * 0.01;
                    this.updateAgentLocation(agent.name, newLat, newLng);
                }
            });
        }, CONFIG.agents.updateInterval);
    }

    flyTo(lat, lng, zoom = 10) {
        this.map.flyTo([lat, lng], zoom, {duration: 2});
    }

    showConnections() {
        const positions = [];
        this.markers.forEach((marker, name) => {
            positions.push({name, pos: marker.getLatLng()});
        });

        // Draw lines between all agents (mesh network)
        if (this.connectionLines) {
            this.connectionLines.forEach(l => this.map.removeLayer(l));
        }
        this.connectionLines = [];

        for (let i = 0; i < positions.length; i++) {
            for (let j = i + 1; j < positions.length; j++) {
                const line = L.polyline(
                    [positions[i].pos, positions[j].pos],
                    {color: 'rgba(0,255,255,0.15)', weight: 1}
                ).addTo(this.map);
                this.connectionLines.push(line);
            }
        }
    }
}

// ═══ AGENT PERSONA SYSTEM ═══
class AgentPersona {
    constructor(name, role) {
        this.name = name;
        this.role = role;
        this.persona = this.generatePersona();
        this.skills = [];
        this.memory = [];
        this.connections = [];
        this.status = 'active';
        this.location = {lat: CONFIG.map.defaultLat, lng: CONFIG.map.defaultLng};
    }

    generatePersona() {
        const personas = {
            FLASH: {archetype: 'Commander', traits: ['strategic', 'decisive', 'protective'], voice: 'direct'},
            AEGIS: {archetype: 'Guardian', traits: ['vigilant', 'analytical', 'unyielding'], voice: 'formal'},
            VOLT: {architect: 'Engineer', traits: ['efficient', 'reliable', 'innovative'], voice: 'technical'},
            CANVAS: {archetype: 'Artist', traits: ['creative', 'intuitive', 'visionary'], voice: 'inspiring'},
            PULSE: {archetype: 'Analyst', traits: ['analytical', 'curious', 'precise'], voice: 'measured'},
            BEQA: {archetype: 'Inspector', traits: ['meticulous', 'skeptical', 'thorough'], voice: 'precise'},
            SCRIBE: {archivist: 'Librarian', traits: ['organized', 'knowledgeable', 'patient'], voice: 'scholarly'},
            WRENCH: {archetype: 'Mechanic', traits: ['practical', 'resourceful', 'hands-on'], voice: 'no-nonsense'}
        };
        return personas[this.name] || {archetype: 'Specialist', traits: ['adaptable'], voice: 'neutral'};
    }

    addMemory(event) {
        this.memory.push({event, timestamp: Date.now()});
        if (this.memory.length > 1000) this.memory.shift();
    }

    connectTo(agentName) {
        if (!this.connections.includes(agentName)) {
            this.connections.push(agentName);
        }
    }
}

// ═══ SECURITY & HARMFUL AI DETECTION ═══
class SecurityCore {
    constructor() {
        this.threats = [];
        this.cryptoKey = null;
    }

    async initialize() {
        // Generate crypto identity
        this.cryptoKey = await this.generateCryptoIdentity();
        console.log('[8x8 Security] Crypto identity generated');
    }

    async generateCryptoIdentity() {
        // Use Web Crypto API for elite encryption
        const keyPair = await crypto.subtle.generateKey(
            {name: 'ECDSA', namedCurve: 'P-256'},
            true, ['sign', 'verify']
        );
        return keyPair;
    }

    async detectHarmfulAI(target) {
        const r = await fetchPOST('/api/security/scan', {target, telegram_id: '1950324763'});
        return r;
    }

    async encryptMessage(message, recipientPublicKey) {
        const encoded = new TextEncoder().encode(message);
        const encrypted = await crypto.subtle.encrypt(
            {name: 'AES-GCM', iv: crypto.getRandomValues(new Uint8Array(12))},
            this.cryptoKey,
            encoded
        );
        return encrypted;
    }
}

// ═══ ZERO-LAG RENDERING OPTIMIZER ═══
class RenderOptimizer {
    constructor() {
        this.frameCount = 0;
        this.lastFpsCheck = Date.now();
        this.fps = 60;
        this.quality = 'high';
    }

    optimize() {
        this.frameCount++;
        const now = Date.now();
        if (now - this.lastFpsCheck >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsCheck = now;

            // Auto-adjust quality
            if (this.fps < 30) this.quality = 'low';
            else if (this.fps < 50) this.quality = 'medium';
            else this.quality = 'high';

            // Apply optimizations
            this.applyQualitySettings();
        }
    }

    applyQualitySettings() {
        const settings = {
            high: {particles: 100, shadows: true, reflections: true, antialias: true},
            medium: {particles: 50, shadows: false, reflections: false, antialias: true},
            low: {particles: 20, shadows: false, reflections: false, antialias: false}
        }[this.quality];

        CONFIG.performance.particleCount = settings.particles;
        CONFIG.performance.useSimpleShapes = this.quality !== 'high';
    }

    getFPS() { return this.fps; }
    getQuality() { return this.quality; }
}

// ═══ INFINITE AGENT FLEET ═══
class AgentFleet {
    constructor() {
        this.agents = new Map();
        this.groups = new Map();
        this.nextId = 22;  // After the initial 21
    }

    spawnAgent(name, role, area) {
        const id = this.nextId++;
        const agent = {
            id, name, role, area,
            status: 'active',
            location: this.randomLocation(area),
            persona: new AgentPersona(name, role),
            connections: [],
            tasks: []
        };
        this.agents.set(name, agent);
        return agent;
    }

    randomLocation(area) {
        const areas = {
            'north-america': {lat: 40, lng: -100, spread: 20},
            'europe': {lat: 50, lng: 10, spread: 15},
            'asia': {lat: 35, lng: 100, spread: 25},
            'africa': {lat: 0, lng: 20, spread: 20},
            'south-america': {lat: -15, lng: -60, spread: 15},
            'oceania': {lat: -25, lng: 135, spread: 10},
            'middle-east': {lat: 25, lng: 45, spread: 10}
        };
        const a = areas[area] || areas['europe'];
        return {
            lat: a.lat + (Math.random() - 0.5) * a.spread,
            lng: a.lng + (Math.random() - 0.5) * a.spread
        };
    }

    getAgentsInArea(area) {
        return Array.from(this.agents.values()).filter(a => a.area === area);
    }

    getConnectedAgents(agentName) {
        const agent = this.agents.get(agentName);
        if (!agent) return [];
        return agent.connections.map(name => this.getAgent(name)).filter(Boolean);
    }

    coordinateAgents(agentNames, task) {
        const agents = agentNames.map(n => this.getAgent(n)).filter(Boolean);
        agents.forEach(a => a.tasks.push({task, coordinated: true, with: agentNames}));
        return agents;
    }
}

// ═══ GLOBAL INSTANCES ═══
let worldMap, securityCore, renderOptimizer, agentFleet;

// ═══ INITIALIZATION ═══
async function initialize8x8OS() {
    console.log('[8x8 OS] Initializing sovereign intelligence platform...');

    // Security first
    securityCore = new SecurityCore();
    await securityCore.initialize();

    // Render optimizer
    renderOptimizer = new RenderOptimizer();

    // Agent fleet
    agentFleet = new AgentFleet();

    // Initialize personas for all 21 agents
    AGENTS.forEach(a => {
        const persona = new AgentPersona(a.name, a.role);
        agentFleet.agents.set(a.name, {
            ...a,
            persona,
            status: 'active',
            location: {lat: CONFIG.map.defaultLat + (Math.random()-0.5)*20, lng: CONFIG.map.defaultLng + (Math.random()-0.5)*20},
            connections: [],
            tasks: []
        });
    });

    // Connect agents in a mesh (each agent knows its neighbors)
    const agentNames = AGENTS.map(a => a.name);
    agentNames.forEach((name, i) => {
        const agent = agentFleet.agents.get(name);
        // Connect to next 3 agents (circular)
        for (let j = 1; j <= 3; j++) {
            agent.connections.push(agentNames[(i + j) % agentNames.length]);
        }
    });

    console.log('[8x8 OS] All systems initialized');
    console.log(`[8x8 OS] ${agentFleet.agents.size} agents online`);
    console.log(`[8x8 OS] ${agentNames.length * 3} agent connections established`);
}

// Export for use in main frontend
window.RealWorldMap = RealWorldMap;
window.AgentPersona = AgentPersona;
window.SecurityCore = SecurityCore;
window.RenderOptimizer = RenderOptimizer;
window.AgentFleet = AgentFleet;
window.CONFIG = CONFIG;
window.initialize8x8OS = initialize8x8OS;
