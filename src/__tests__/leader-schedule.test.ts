import { SimplifiedConsensus } from '../core/consensus';
import { ValidatorInfo, EPOCH_CONSTANTS } from '../types';

describe('Leader Schedule', () => {
  let consensus: SimplifiedConsensus;
  let validators: ValidatorInfo[];

  beforeEach(() => {
    consensus = new SimplifiedConsensus();
    
    // Add 4 validators with different stakes
    validators = [
      { publicKey: 'validator1', stake: 100, address: '127.0.0.1', port: 8001, isActive: true },
      { publicKey: 'validator2', stake: 200, address: '127.0.0.1', port: 8002, isActive: true },
      { publicKey: 'validator3', stake: 150, address: '127.0.0.1', port: 8003, isActive: true },
      { publicKey: 'validator4', stake: 300, address: '127.0.0.1', port: 8004, isActive: true }
    ];
    
    validators.forEach(v => consensus.addValidator(v));
  });

  test('should guarantee each validator gets 4 consecutive slots per rotation in epoch 1', () => {
    // Simulate epoch transition to epoch 1
    consensus.updateSlot(EPOCH_CONSTANTS.SLOTS_PER_EPOCH);
    
    const epoch1Schedule = consensus.getLeaderSchedule(1);
    expect(epoch1Schedule).not.toBeNull();
    
    if (epoch1Schedule) {
      const schedule = epoch1Schedule.schedule;
      // Verify the rotation pattern: each validator should get 4 consecutive slots
      for (let i = 0; i < schedule.length; i += 4) {
        const rotationSlots = schedule.slice(i, i + 4);
        if (rotationSlots.length === 4) {
          // All 4 slots in this rotation should be the same validator
          const leader = rotationSlots[0];
          expect(rotationSlots.every(slot => slot === leader)).toBe(true);
        }
      }
      
      // Count total slots per validator
      const slotCounts: Record<string, number> = {};
      schedule.forEach(leader => {
        slotCounts[leader] = (slotCounts[leader] || 0) + 1;
      });
      
      // With 64 slots and 4-slot rotations, we have 16 rotations
      // With 4 validators, each should get 4 rotations (16/4 = 4 rotations per validator)
      // So each validator should get 4 rotations * 4 slots = 16 slots total
      validators.forEach(validator => {
        expect(slotCounts[validator.publicKey]).toBe(16);
      });
      
      // Total slots should be 64
      expect(schedule.length).toBe(EPOCH_CONSTANTS.SLOTS_PER_EPOCH);
    }
  });

  test('should guarantee rotation pattern in epoch 2', () => {
    // Simulate epoch transitions to epoch 2
    consensus.updateSlot(EPOCH_CONSTANTS.SLOTS_PER_EPOCH); // Epoch 1
    consensus.updateSlot(EPOCH_CONSTANTS.SLOTS_PER_EPOCH * 2); // Epoch 2
    
    const epoch2Schedule = consensus.getLeaderSchedule(2);
    expect(epoch2Schedule).not.toBeNull();
    
    if (epoch2Schedule) {
      const schedule = epoch2Schedule.schedule;
      
      // Verify the rotation pattern: each validator should get 4 consecutive slots
      for (let i = 0; i < schedule.length; i += 4) {
        const rotationSlots = schedule.slice(i, i + 4);
        if (rotationSlots.length === 4) {
          // All 4 slots in this rotation should be the same validator
          const leader = rotationSlots[0];
          expect(rotationSlots.every(slot => slot === leader)).toBe(true);
        }
      }
      
      // Count total slots per validator
      const slotCounts: Record<string, number> = {};
      schedule.forEach(leader => {
        slotCounts[leader] = (slotCounts[leader] || 0) + 1;
      });
      
      // Each validator should get 16 slots total (4 rotations * 4 slots each)
      validators.forEach(validator => {
        expect(slotCounts[validator.publicKey]).toBe(16);
      });
    }
  });

  test('should work with different number of validators', () => {
    // Test with 16 validators (exactly fills 64 slots with 4 each)
    const moreValidators: ValidatorInfo[] = [];
    for (let i = 5; i <= 16; i++) {
      moreValidators.push({
        publicKey: `validator${i}`,
        stake: 100,
        address: '127.0.0.1',
        port: 8000 + i,
        isActive: true
      });
    }
    
    moreValidators.forEach(v => consensus.addValidator(v));
    
    // Simulate epoch transition to epoch 1
    consensus.updateSlot(EPOCH_CONSTANTS.SLOTS_PER_EPOCH);
    
    const epoch1Schedule = consensus.getLeaderSchedule(1);
    expect(epoch1Schedule).not.toBeNull();
    
    if (epoch1Schedule) {
      // Count slots per validator
      const slotCounts: Record<string, number> = {};
      epoch1Schedule.schedule.forEach(leader => {
        slotCounts[leader] = (slotCounts[leader] || 0) + 1;
      });
      
      // Each validator should have exactly 4 slots
      const allValidators = [...validators, ...moreValidators];
      allValidators.forEach(validator => {
        expect(slotCounts[validator.publicKey]).toBe(4);
      });
    }
  });

  test('genesis epoch (epoch 0) should use original rotation logic', () => {
    // Genesis epoch should not use the 4-slot guarantee
    const genesisSchedule = consensus.getLeaderSchedule(0);
    expect(genesisSchedule).not.toBeNull();
    
    if (genesisSchedule) {
      // Genesis epoch uses different logic, so we just verify it exists
      expect(genesisSchedule.epoch).toBe(0);
      expect(genesisSchedule.schedule).toEqual([]);
    }
  });
});