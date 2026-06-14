/**
 * 8x8 Hub - Quantum Voice
 * Output and communication capabilities
 */

export interface VoiceMessage {
  type: 'text' | 'markdown' | 'code' | 'table' | 'json' | 'alert';
  content: string;
  metadata?: Record<string, any>;
}

export interface VoiceChannel {
  name: string;
  enabled: boolean;
  subscribers: number;
  format: 'text' | 'json' | 'xml';
}

export interface VoiceConfig {
  defaultFormat: VoiceMessage['type'];
  maxLength: number;
  enableEmoji: boolean;
  enableMarkdown: boolean;
}

class QuantumVoice {
  private channels: Map<string, VoiceChannel> = new Map();
  private messageLog: VoiceMessage[] = [];
  private maxLogSize = 1000;
  private config: VoiceConfig = {
    defaultFormat: 'text',
    maxLength: 10000,
    enableEmoji: true,
    enableMarkdown: true
  };
  private stats = {
    totalMessages: 0,
    totalChannels: 0,
    totalRecipients: 0
  };

  constructor() {
    this.initializeDefaultChannels();
    console.log('🔊 Quantum Voice initialized - Ready to speak');
  }

  private initializeDefaultChannels(): void {
    this.registerChannel('console', 'text');
    this.registerChannel('api', 'json');
    this.registerChannel('telegram', 'text');
    this.registerChannel('email', 'text');
    this.registerChannel('webhook', 'json');
    this.registerChannel('log', 'text');
  }

  // ============ CHANNEL MANAGEMENT ============

  registerChannel(name: string, format: VoiceChannel['format']): void {
    this.channels.set(name, {
      name,
      enabled: true,
      subscribers: 0,
      format
    });
    this.stats.totalChannels++;
  }

  enableChannel(name: string): boolean {
    const channel = this.channels.get(name);
    if (channel) {
      channel.enabled = true;
      return true;
    }
    return false;
  }

  disableChannel(name: string): boolean {
    const channel = this.channels.get(name);
    if (channel) {
      channel.enabled = false;
      return true;
    }
    return false;
  }

  // ============ SPEAKING ============

  speak(content: string, options?: { type?: VoiceMessage['type']; channel?: string; metadata?: Record<string, any> }): void {
    const type = options?.type || this.config.defaultFormat;
    
    const message: VoiceMessage = {
      type,
      content: this.truncate(content),
      metadata: options?.metadata
    };

    this.messageLog.push(message);
    if (this.messageLog.length > this.maxLogSize) {
      this.messageLog.shift();
    }

    this.stats.totalMessages++;

    // Log to console
    this.outputToConsole(message);

    // Send to specific channel if specified
    if (options?.channel) {
      this.sendToChannel(options.channel, message);
    }

    // Emit event
    this.emit('speak', message);
  }

  private outputToConsole(message: VoiceMessage): void {
    const prefix = this.getTypePrefix(message.type);
    console.log(`${prefix} ${message.content}`);
  }

  private getTypePrefix(type: VoiceMessage['type']): string {
    const prefixes: Record<VoiceMessage['type'], string> = {
      text: '📢',
      markdown: '📝',
      code: '💻',
      table: '📊',
      json: '🔧',
      alert: '🚨'
    };
    return prefixes[type] || '📢';
  }

  private truncate(content: string): string {
    if (content.length <= this.config.maxLength) {
      return content;
    }
    return content.substring(0, this.config.maxLength) + '...';
  }

  private sendToChannel(channelName: string, message: VoiceMessage): void {
    const channel = this.channels.get(channelName);
    if (!channel || !channel.enabled) return;

    // Channel-specific output logic would go here
    // For now, just log
    console.log(`[${channelName}] ${message.content}`);
  }

  // ============ SPECIALIZED OUTPUTS ============

  say(text: string): void {
    this.speak(text, { type: 'text' });
  }

  announce(text: string, priority: 'low' | 'normal' | 'high' = 'normal'): void {
    this.speak(text, { 
      type: 'text',
      metadata: { priority, timestamp: Date.now() }
    });
  }

  alert(message: string, level: 'info' | 'warning' | 'error' | 'critical' = 'info'): void {
    const icons: Record<string, string> = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      critical: '🚨'
    };
    
    this.speak(`${icons[level]} ${message}`, { 
      type: 'alert',
      metadata: { level, timestamp: Date.now() }
    });
  }

  report(data: any): void {
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    this.speak(content, { type: 'json' });
  }

  showTable(data: any[]): void {
    const content = JSON.stringify(data, null, 2);
    this.speak(content, { type: 'table' });
  }

  showCode(code: string, language?: string): void {
    this.speak(code, { 
      type: 'code',
      metadata: { language }
    });
  }

  explain(content: string): void {
    this.speak(content, { type: 'markdown' });
  }

  // ============ TELEGRAM OUTPUT ============

  async sendToTelegram(chatId: string, text: string, botToken: string): Promise<boolean> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown'
        })
      });
      return response.ok;
    } catch (e) {
      console.error('Telegram send error:', e);
      return false;
    }
  }

  // ============ EMAIL OUTPUT ============

  async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    // Email sending would be implemented here
    console.log(`📧 Email to ${to}: ${subject}`);
    return true;
  }

  // ============ WEBHOOK OUTPUT ============

  async sendToWebhook(url: string, data: any): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.ok;
    } catch (e) {
      console.error('Webhook error:', e);
      return false;
    }
  }

  // ============ EVENT EMITTER ============

  private listeners: Map<string, Function[]> = new Map();

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  // ============ UTILITIES ============

  configure(config: Partial<VoiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getChannels(): VoiceChannel[] {
    return Array.from(this.channels.values());
  }

  getMessageLog(limit = 50): VoiceMessage[] {
    return this.messageLog.slice(-limit);
  }

  getStats(): { totalMessages: number; totalChannels: number; totalRecipients: number } {
    return {
      totalMessages: this.stats.totalMessages,
      totalChannels: this.stats.totalChannels,
      totalRecipients: this.stats.totalRecipients
    };
  }

  clearLog(): void {
    this.messageLog = [];
  }
}

export const voice = new QuantumVoice();
