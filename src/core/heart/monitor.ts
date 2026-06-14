/**
 * 8x8 Hub - Quantum Heart Monitor
 * Real-time health and performance tracking
 */

export interface HeartMetrics {
  uptime: number;
  memory: { used: number; total: number; percentage: number };
  cpu: { usage: number };
  requests: { total: number; success: number; failed: number };
  latency: { avg: number; min: number; max: number };
  timestamp: number;
}

export interface HeartConfig {
  heartbeatInterval: number;
  enableDetailedMetrics: boolean;
  alertThresholds: {
    memoryPercent: number;
    latencyMs: number;
    errorRatePercent: number;
  };
}

class QuantumHeartMonitor {
  private startTime = Date.now();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private config: HeartConfig = {
    heartbeatInterval: 60000,
    enableDetailedMetrics: true,
    alertThresholds: {
      memoryPercent: 85,
      latencyMs: 5000,
      errorRatePercent: 10
    }
  };
  private metrics = {
    requests: { total: 0, success: 0, failed: 0 },
    latency: { sum: 0, count: 0, min: Infinity, max: 0 },
    events: [] as Array<{type: string; message: string; timestamp: number}>
  };
  private alerts: Array<{level: string; message: string; timestamp: number}> = [];

  start(): void {
    if (this.heartbeatInterval) return;

    console.log('💓 Heart Monitor started');
    
    this.heartbeatInterval = setInterval(() => {
      this.heartbeat();
    }, this.config.heartbeatInterval);

    // Initial heartbeat
    this.heartbeat();
  }

  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('💔 Heart Monitor stopped');
    }
  }

  private heartbeat(): void {
    const metrics = this.getMetrics();
    
    // Check thresholds and alert if needed
    if (metrics.memory.percentage > this.config.alertThresholds.memoryPercent) {
      this.alert('warning', `High memory usage: ${metrics.memory.percentage.toFixed(1)}%`);
    }
    if (metrics.latency.avg > this.config.alertThresholds.latencyMs) {
      this.alert('warning', `High average latency: ${metrics.latency.avg.toFixed(0)}ms`);
    }
    
    const errorRate = metrics.requests.total > 0 
      ? (metrics.requests.failed / metrics.requests.total) * 100 
      : 0;
    if (errorRate > this.config.alertThresholds.errorRatePercent) {
      this.alert('critical', `High error rate: ${errorRate.toFixed(1)}%`);
    }

    this.logEvent('heartbeat', 'System heartbeat');
  }

  recordRequest(success: boolean, latencyMs?: number): void {
    this.metrics.requests.total++;
    if (success) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.failed++;
    }

    if (latencyMs !== undefined) {
      this.metrics.latency.sum += latencyMs;
      this.metrics.latency.count++;
      this.metrics.latency.min = Math.min(this.metrics.latency.min, latencyMs);
      this.metrics.latency.max = Math.max(this.metrics.latency.max, latencyMs);
    }
  }

  getMetrics(): HeartMetrics {
    const uptime = Date.now() - this.startTime;
    
    // Get memory info (Node.js specific)
    const memUsage = process.memoryUsage();
    const memTotal = memUsage.heapTotal;
    const memUsed = memUsage.heapUsed;
    const memPercentage = (memUsed / memTotal) * 100;

    // Calculate latency stats
    const avgLatency = this.metrics.latency.count > 0 
      ? this.metrics.latency.sum / this.metrics.latency.count 
      : 0;

    return {
      uptime,
      memory: {
        used: memUsed,
        total: memTotal,
        percentage: memPercentage
      },
      cpu: { usage: 0 }, // Would need native module for accurate CPU
      requests: {
        total: this.metrics.requests.total,
        success: this.metrics.requests.success,
        failed: this.metrics.requests.failed
      },
      latency: {
        avg: avgLatency,
        min: this.metrics.latency.min === Infinity ? 0 : this.metrics.latency.min,
        max: this.metrics.latency.max
      },
      timestamp: Date.now()
    };
  }

  getAlerts(): Array<{level: string; message: string; timestamp: number}> {
    return [...this.alerts];
  }

  private alert(level: string, message: string): void {
    const alert = { level, message, timestamp: Date.now() };
    this.alerts.push(alert);
    console.warn(`💓 Alert [${level.toUpperCase()}]: ${message}`);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }
  }

  private logEvent(type: string, message: string): void {
    this.metrics.events.push({ type, message, timestamp: Date.now() });
    if (this.metrics.events.length > 1000) {
      this.metrics.events.shift();
    }
  }

  getEvents(): Array<{type: string; message: string; timestamp: number}> {
    return [...this.metrics.events];
  }

  configure(config: Partial<HeartConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('💓 Heart Monitor reconfigured');
  }

  reset(): void {
    this.startTime = Date.now();
    this.metrics = {
      requests: { total: 0, success: 0, failed: 0 },
      latency: { sum: 0, count: 0, min: Infinity, max: 0 },
      events: []
    };
    this.alerts = [];
    console.log('💓 Heart Monitor metrics reset');
  }
}

export const heartMonitor = new QuantumHeartMonitor();
