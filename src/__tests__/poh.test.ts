import { ProofOfHistory } from '../core/poh';

describe('Proof of History', () => {
  let poh: ProofOfHistory;

  beforeEach(() => {
    poh = new ProofOfHistory('test-seed');
  });

  afterEach(() => {
    poh.stop();
  });

  test('should initialize with seed', () => {
    expect(poh.getCurrentHash()).toBeDefined();
    expect(poh.getCurrentCount()).toBe(0);
    expect(poh.isActive()).toBe(false);
  });

  test('should start and stop PoH generation', () => {
    poh.start();
    expect(poh.isActive()).toBe(true);
    
    poh.stop();
    expect(poh.isActive()).toBe(false);
  });

  test('should generate entries with events', async () => {
    const event = poh.createEvent('transaction', 'test-tx-data');
    poh.addEvent(event);
    
    poh.start();
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const entries = poh.getEntries();
    expect(entries.length).toBeGreaterThan(0);
    
    const entryWithEvent = entries.find(e => e.events && e.events.length > 0);
    expect(entryWithEvent).toBeDefined();
  });

  test('should verify PoH sequence', async () => {
    poh.start();
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const entries = poh.getEntries();
    expect(entries.length).toBeGreaterThan(0);
    
    const isValid = poh.verifySequence(entries);
    expect(isValid).toBe(true);
  }, 10000);

  test('should create valid events', () => {
    const event = poh.createEvent('block', 'block-hash-123');
    
    expect(event.type).toBe('block');
    expect(event.data).toBe('block-hash-123');
    expect(event.hash).toMatch(/^[a-f0-9]{64}$/);
  });
});