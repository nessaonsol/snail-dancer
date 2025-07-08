import { PohEntry, PohEvent } from '../../types';
import { createHash } from 'crypto';

export class ProofOfHistory {
  private currentHash: string;
  private count: number;
  private isRunning: boolean;
  private tickInterval: NodeJS.Timeout | null;
  private readonly tickRate: number;
  private entries: PohEntry[];
  private eventQueue: PohEvent[];

  constructor(seed?: string, tickRate: number = 1000) {
    this.currentHash = seed || 'initial-seed-' + Date.now();
    this.count = 0;
    this.isRunning = false;
    this.tickInterval = null;
    this.tickRate = tickRate;
    this.entries = [];
    this.eventQueue = [];
  }



  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.tickInterval = setInterval(() => {
      this.tick();
    }, 1000 / this.tickRate);
  }

  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private tick(): void {
    const events = this.processEventQueue();
    const entry = this.generateNextEntry(events);
    this.entries.push(entry);
    
    if (this.entries.length > 10000) {
      this.entries = this.entries.slice(-5000);
    }
  }

  private processEventQueue(): PohEvent[] {
    const events = [...this.eventQueue];
    this.eventQueue = [];
    return events;
  }

  private generateNextEntry(events?: PohEvent[]): PohEntry {
    let hashInput = this.currentHash + this.count.toString();
    
    if (events && events.length > 0) {
      const eventsData = events.map(e => e.hash).join('');
      hashInput += eventsData;
    }

    const nextHash = createHash('sha256').update(new TextEncoder().encode(hashInput)).digest('hex');
    
    const entry: PohEntry = {
      hash: nextHash,
      count: this.count,
      timestamp: Date.now(),
      events: events && events.length > 0 ? events : undefined
    };

    this.currentHash = nextHash;
    this.count++;

    return entry;
  }

  addEvent(event: PohEvent): void {
    this.eventQueue.push(event);
  }

  getCurrentHash(): string {
    return this.currentHash;
  }

  getCurrentCount(): number {
    return this.count;
  }

  getEntries(fromCount?: number, limit?: number): PohEntry[] {
    let filtered = this.entries;
    
    if (fromCount !== undefined) {
      filtered = filtered.filter(entry => entry.count >= fromCount);
    }
    
    if (limit !== undefined) {
      filtered = filtered.slice(0, limit);
    }
    
    return filtered;
  }

  getLatestEntry(): PohEntry | null {
    const entry = this.entries[this.entries.length - 1];
    return entry || null;
  }

  verifySequence(entries: PohEntry[]): boolean {
    if (entries.length === 0) return true;
    
    for (let i = 1; i < entries.length; i++) {
      const prev = entries[i - 1];
      const current = entries[i];
      
      if (current.count !== prev.count + 1) {
        return false;
      }
      
      let expectedHashInput = prev.hash + prev.count.toString();
      if (current.events && current.events.length > 0) {
        const eventsData = current.events.map(e => e.hash).join('');
        expectedHashInput += eventsData;
      }
      
      const expectedHash = createHash('sha256').update(new TextEncoder().encode(expectedHashInput)).digest('hex');
      
      if (current.hash !== expectedHash) {
        return false;
      }
    }
    
    return true;
  }

  createEvent(type: PohEvent['type'], data: string): PohEvent {
    const eventData = JSON.stringify({ type, data, timestamp: Date.now() });
    const hash = createHash('sha256').update(new TextEncoder().encode(eventData)).digest('hex');
    
    return {
      type,
      data,
      hash
    };
  }

  isActive(): boolean {
    return this.isRunning;
  }

  getStats() {
    return {
      currentHash: this.currentHash,
      count: this.count,
      isRunning: this.isRunning,
      tickRate: this.tickRate,
      entriesCount: this.entries.length,
      queuedEvents: this.eventQueue.length
    };
  }
}