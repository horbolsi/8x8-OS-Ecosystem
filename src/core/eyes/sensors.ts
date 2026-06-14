/**
 * 8x8 Hub - Quantum Eyes Sensors
 * Event tracking and system monitoring
 */

export interface SensorEvent {
  id: string;
  type: string;
  source: string;
  data: any;
  timestamp: number;
}

export interface SystemState {
  sensors: number;
  totalEvents: number;
  recentEvents: SensorEvent[];
  eventTypes: Record<string, number>;
  sources: Record<string, number>;
}

class QuantumEyesSensors {
  private events: SensorEvent[] = [];
  private maxEvents = 5000;
  private sensors = new Map<string, boolean>();
  private eventCounts = new Map<string, number>();
  private sourceCounts = new Map<string, number>();

  constructor() {
    console.log('👁️ Eyes Sensors initialized');
  }

  sense(source: string, type: string, data?: any): string {
    const id = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const event: SensorEvent = {
      id,
      type,
      source,
      data,
      timestamp: Date.now()
    };

    this.events.push(event);
    
    // Track counts
    this.eventCounts.set(type, (this.eventCounts.get(type) || 0) + 1);
    this.sourceCounts.set(source, (this.sourceCounts.get(source) || 0) + 1);
    
    // Mark sensor as active
    this.sensors.set(source, true);

    // Trim old events
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    return id;
  }

  watch(eventId: string): SensorEvent | null {
    return this.events.find(e => e.id === eventId) || null;
  }

  query(filter?: { type?: string; source?: string; since?: number }): SensorEvent[] {
    let results = [...this.events];

    if (filter?.type) {
      results = results.filter(e => e.type === filter.type);
    }
    if (filter?.source) {
      results = results.filter(e => e.source === filter.source);
    }
    if (filter?.since) {
      results = results.filter(e => e.timestamp >= filter.since);
    }

    return results;
  }

  getRecentEvents(limit = 50): SensorEvent[] {
    return this.events.slice(-limit);
  }

  getSystemState(): SystemState {
    const eventTypes: Record<string, number> = {};
    const sources: Record<string, number> = {};

    for (const [type, count] of this.eventCounts) {
      eventTypes[type] = count;
    }
    for (const [source, count] of this.sourceCounts) {
      sources[source] = count;
    }

    return {
      sensors: this.sensors.size,
      totalEvents: this.events.length,
      recentEvents: this.getRecentEvents(20),
      eventTypes,
      sources
    };
  }

  clear(): void {
    this.events = [];
    this.eventCounts.clear();
    this.sourceCounts.clear();
    console.log('👁️ Eyes Sensors cleared');
  }

  // Register a new sensor
  registerSensor(name: string): void {
    this.sensors.set(name, true);
    console.log(`👁️ Sensor registered: ${name}`);
  }

  // Get sensor status
  getSensorStatus(name: string): boolean {
    return this.sensors.get(name) || false;
  }

  // Get all active sensors
  getActiveSensors(): string[] {
    return Array.from(this.sensors.keys());
  }

  // Export events for analysis
  exportEvents(filter?: { since?: number; until?: number }): SensorEvent[] {
    let results = [...this.events];

    if (filter?.since) {
      results = results.filter(e => e.timestamp >= filter.since);
    }
    if (filter?.until) {
      results = results.filter(e => e.timestamp <= filter.until);
    }

    return results;
  }
}

export const eyes = new QuantumEyesSensors();

// Register default sensors
eyes.registerSensor('system');
eyes.registerSensor('ai');
eyes.registerSensor('blockchain');
eyes.registerSensor('user');
eyes.registerSensor('security');
