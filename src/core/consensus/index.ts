import { Vote, Block, ValidatorInfo, ConsensusState, EPOCH_CONSTANTS, LeaderSchedule, EpochInfo } from '../../types';
import { SignatureUtils, KeyPair } from '../../crypto';
import * as crypto from 'crypto';

export class SimplifiedConsensus {
  private validators: Map<string, ValidatorInfo>;
  private votes: Map<string, Vote[]>;
  private consensusState: ConsensusState;
  private lockouts: Map<string, Map<number, number>>;
  private readonly lockoutMultiplier: number = 2;
  private leaderSchedules: Map<number, LeaderSchedule>;
  private epochBlocks: Map<number, Block[]>;

  constructor() {
    this.validators = new Map();
    this.votes = new Map();
    this.consensusState = {
      currentSlot: 0,
      currentEpoch: 0,
      votedSlots: new Set(),
      lockouts: new Map(),
      forkChoice: '',
      leaderSchedule: [],
      epochStartSlot: 0
    };
    this.lockouts = new Map();
    this.leaderSchedules = new Map();
    this.epochBlocks = new Map();
    
    // Initialize genesis epoch with empty schedule
    this.initializeGenesisEpoch();
  }

  addValidator(validator: ValidatorInfo): void {
    this.validators.set(validator.publicKey, validator);
    if (!this.lockouts.has(validator.publicKey)) {
      this.lockouts.set(validator.publicKey, new Map());
    }
  }

  removeValidator(publicKey: string): void {
    this.validators.delete(publicKey);
    this.lockouts.delete(publicKey);
  }

  async createVote(
    blockHash: string,
    validatorPublicKey: string,
    privateKey: string
  ): Promise<Vote> {
    const validator = this.validators.get(validatorPublicKey);
    if (!validator) {
      throw new Error('Validator not found');
    }

    if (!this.canVote(validatorPublicKey, blockHash)) {
      throw new Error('Cannot vote due to lockout constraints');
    }

    const voteData = {
      validator: validatorPublicKey,
      blockHash,
      timestamp: Date.now(),
      lockout: this.calculateLockout(validatorPublicKey)
    };

    const keyPair = KeyPair.fromPrivateKey(privateKey);
    const signature = await SignatureUtils.signMessage(
      JSON.stringify(voteData),
      keyPair
    );

    return {
      ...voteData,
      signature
    };
  }

  async validateVote(vote: Vote): Promise<boolean> {
    const validator = this.validators.get(vote.validator);
    if (!validator || !validator.isActive) {
      return false;
    }

    const voteData = {
      validator: vote.validator,
      blockHash: vote.blockHash,
      timestamp: vote.timestamp,
      lockout: vote.lockout
    };

    const isValidSignature = await SignatureUtils.verifySignature(
      JSON.stringify(voteData),
      vote.signature,
      vote.validator
    );

    if (!isValidSignature) {
      return false;
    }

    return this.canVote(vote.validator, vote.blockHash);
  }

  addVote(vote: Vote): boolean {
    if (!this.validateVoteSync(vote)) {
      return false;
    }

    if (!this.votes.has(vote.blockHash)) {
      this.votes.set(vote.blockHash, []);
    }

    const blockVotes = this.votes.get(vote.blockHash)!;
    const existingVoteIndex = blockVotes.findIndex(v => v.validator === vote.validator);
    
    if (existingVoteIndex >= 0) {
      blockVotes[existingVoteIndex] = vote;
    } else {
      blockVotes.push(vote);
    }

    this.updateLockout(vote.validator, vote.blockHash, vote.lockout);
    return true;
  }

  private validateVoteSync(vote: Vote): boolean {
    const validator = this.validators.get(vote.validator);
    if (!validator || !validator.isActive) {
      return false;
    }

    return this.canVote(vote.validator, vote.blockHash);
  }

  private canVote(validatorPublicKey: string, blockHash: string): boolean {
    const validatorLockouts = this.lockouts.get(validatorPublicKey);
    if (!validatorLockouts || validatorLockouts.size === 0) {
      return true;
    }

    const currentSlot = this.consensusState.currentSlot;
    
    // Allow voting if no active lockouts or if enough slots have passed
    for (const [slot, lockoutExpiry] of validatorLockouts.entries()) {
      if (currentSlot < lockoutExpiry) {
        // Only prevent voting if lockout is still very recent (within 2 slots)
        if (lockoutExpiry - currentSlot > 2) {
          return false;
        }
      }
    }

    return true;
  }

  private calculateLockout(validatorPublicKey: string): number {
    const validatorLockouts = this.lockouts.get(validatorPublicKey);
    if (!validatorLockouts || validatorLockouts.size === 0) {
      return 1; // Reduced initial lockout
    }

    // Use a much smaller lockout to allow more frequent voting
    const recentVotes = Array.from(validatorLockouts.values()).filter(
      expiry => expiry > this.consensusState.currentSlot
    );
    
    if (recentVotes.length === 0) {
      return 1;
    }

    return Math.min(recentVotes.length + 1, 4); // Cap at 4 slots
  }

  private updateLockout(validatorPublicKey: string, blockHash: string, lockout: number): void {
    const validatorLockouts = this.lockouts.get(validatorPublicKey);
    if (!validatorLockouts) {
      return;
    }

    const currentSlot = this.consensusState.currentSlot;
    validatorLockouts.set(currentSlot, currentSlot + lockout);
  }

  getVotesForBlock(blockHash: string): Vote[] {
    return this.votes.get(blockHash) || [];
  }

  calculateStakeWeight(blockHash: string): number {
    const votes = this.getVotesForBlock(blockHash);
    let totalStake = 0;

    for (const vote of votes) {
      const validator = this.validators.get(vote.validator);
      if (validator && validator.isActive) {
        totalStake += validator.stake;
      }
    }

    return totalStake;
  }

  getTotalStake(): number {
    let total = 0;
    for (const validator of this.validators.values()) {
      if (validator.isActive) {
        total += validator.stake;
      }
    }
    return total;
  }

  hasSupermajority(blockHash: string): boolean {
    const stakeWeight = this.calculateStakeWeight(blockHash);
    const totalStake = this.getTotalStake();
    
    return stakeWeight > (totalStake * 2) / 3;
  }

  selectFork(candidateBlocks: Block[]): string | null {
    let bestBlock: Block | null = null;
    let bestStakeWeight = 0;

    for (const block of candidateBlocks) {
      const stakeWeight = this.calculateStakeWeight(block.hash);
      
      if (stakeWeight > bestStakeWeight) {
        bestStakeWeight = stakeWeight;
        bestBlock = block;
      }
    }

    return bestBlock ? bestBlock.hash : null;
  }

  updateSlot(slot: number): void {
    const previousEpoch = this.consensusState.currentEpoch;
    const newEpoch = this.getEpochFromSlot(slot);
    
    this.consensusState.currentSlot = slot;
    
    // Check if we need to transition to a new epoch
    if (newEpoch > previousEpoch) {
      this.transitionToNextEpoch();
    }
    
    this.cleanupExpiredLockouts();
  }

  private cleanupExpiredLockouts(): void {
    const currentSlot = this.consensusState.currentSlot;
    
    for (const [validatorKey, lockouts] of this.lockouts.entries()) {
      const expiredSlots: number[] = [];
      
      for (const [slot, expiry] of lockouts.entries()) {
        if (currentSlot >= expiry) {
          expiredSlots.push(slot);
        }
      }
      
      for (const slot of expiredSlots) {
        lockouts.delete(slot);
      }
    }
  }

  getConsensusState(): ConsensusState {
    return {
      ...this.consensusState,
      votedSlots: new Set(this.consensusState.votedSlots),
      lockouts: new Map(this.consensusState.lockouts)
    };
  }

  getValidators(): ValidatorInfo[] {
    return Array.from(this.validators.values());
  }

  getActiveValidators(): ValidatorInfo[] {
    return Array.from(this.validators.values()).filter(v => v.isActive);
  }

  isValidator(publicKey: string): boolean {
    const validator = this.validators.get(publicKey);
    return validator ? validator.isActive : false;
  }

  private initializeGenesisEpoch(): void {
    // For genesis epoch (epoch 0), use a simple round-robin schedule
    const genesisSchedule: LeaderSchedule = {
      epoch: 0,
      schedule: [],
      seed: 'genesis'
    };
    this.leaderSchedules.set(0, genesisSchedule);
    this.consensusState.leaderSchedule = [];
    this.epochBlocks.set(0, []);
  }

  private generateLeaderSchedule(epoch: number, seed: string): string[] {
    const activeValidators = this.getActiveValidators();
    if (activeValidators.length === 0) {
      return [];
    }

    // Sort validators by public key to ensure deterministic order across all nodes
    const sortedValidators = activeValidators.sort((a, b) => a.publicKey.localeCompare(b.publicKey));

    // For epochs after genesis (epoch > 0), guarantee each node gets exactly 4 slots
    if (epoch > 0) {
      return this.generateEqualDistributionSchedule(sortedValidators, seed);
    }

    // For genesis epoch, use the original stake-weighted approach
    const hash = crypto.createHash('sha256').update(seed).digest();
    const schedule: string[] = [];

    for (let slot = 0; slot < EPOCH_CONSTANTS.SLOTS_PER_EPOCH; slot++) {
      const slotSeed = crypto.createHash('sha256')
        .update(hash)
        .update(Buffer.from(slot.toString()))
        .digest();
      
      const leader = this.selectLeaderByStake(sortedValidators, slotSeed);
      schedule.push(leader.publicKey);
    }

    return schedule;
  }

  private generateEqualDistributionSchedule(validators: ValidatorInfo[], seed: string): string[] {
    const slotsPerRotation = 4;
    const totalSlots = EPOCH_CONSTANTS.SLOTS_PER_EPOCH;
    const schedule: string[] = [];
    
    // Calculate how many rotations we can fit in the epoch
    const totalRotations = Math.floor(totalSlots / slotsPerRotation);
    
    // Create a deterministic but randomized order of validators for rotations
    const shuffledValidators = this.shuffleValidators([...validators], seed);
    
    // Assign rotations: each validator gets 4 consecutive slots per rotation
    for (let rotation = 0; rotation < totalRotations; rotation++) {
      const validatorIndex = rotation % shuffledValidators.length;
      const validator = shuffledValidators[validatorIndex];
      
      // Add 4 consecutive slots for this validator
      for (let slot = 0; slot < slotsPerRotation; slot++) {
        schedule.push(validator.publicKey);
      }
    }
    
    // Handle any remaining slots (if totalSlots is not divisible by 4)
    const remainingSlots = totalSlots - schedule.length;
    for (let i = 0; i < remainingSlots; i++) {
      const validatorIndex = i % shuffledValidators.length;
      schedule.push(shuffledValidators[validatorIndex].publicKey);
    }
    
    return schedule;
  }

  private shuffleValidators(validators: ValidatorInfo[], seed: string): ValidatorInfo[] {
    const shuffled = [...validators];
    const hash = crypto.createHash('sha256').update(seed).digest();
    
    // Fisher-Yates shuffle with deterministic randomness
    for (let i = shuffled.length - 1; i > 0; i--) {
      const seedForIndex = crypto.createHash('sha256')
        .update(hash)
        .update(Buffer.from(i.toString()))
        .digest();
      const j = seedForIndex.readUInt32BE(0) % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }

  private shuffleSchedule(schedule: string[], seed: string): string[] {
    const shuffled = [...schedule];
    const hash = crypto.createHash('sha256').update(seed).digest();
    
    // Fisher-Yates shuffle with deterministic randomness
    for (let i = shuffled.length - 1; i > 0; i--) {
      const seedForIndex = crypto.createHash('sha256')
        .update(hash)
        .update(Buffer.from(i.toString()))
        .digest();
      const j = seedForIndex.readUInt32BE(0) % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }

  private selectLeaderByStake(validators: ValidatorInfo[], seed: Buffer): ValidatorInfo {
    const totalStake = validators.reduce((sum, v) => sum + v.stake, 0);
    
    // Convert seed to a number between 0 and totalStake
    const seedValue = seed.readUInt32BE(0) % totalStake;
    
    let cumulativeStake = 0;
    for (const validator of validators) {
      cumulativeStake += validator.stake;
      if (seedValue < cumulativeStake) {
        return validator;
      }
    }
    
    // Fallback to first validator
    return validators[0];
  }

  private calculateEpochFinalHash(epoch: number): string {
    const epochBlocks = this.epochBlocks.get(epoch) || [];
    if (epochBlocks.length === 0) {
      return crypto.createHash('sha256').update(`epoch-${epoch}-empty`).digest('hex');
    }

    // Combine all block hashes in the epoch
    const combinedHashes = epochBlocks.map(block => block.hash).join('');
    return crypto.createHash('sha256').update(combinedHashes).digest('hex');
  }

  private transitionToNextEpoch(): void {
    const currentEpoch = this.consensusState.currentEpoch;
    const nextEpoch = currentEpoch + 1;
    
    // Calculate final hash for current epoch
    const epochFinalHash = this.calculateEpochFinalHash(currentEpoch);
    this.consensusState.epochFinalHash = epochFinalHash;
    
    // Generate leader schedule for next epoch using the final hash as seed
    const nextSchedule = this.generateLeaderSchedule(nextEpoch, epochFinalHash);
    
    const leaderSchedule: LeaderSchedule = {
      epoch: nextEpoch,
      schedule: nextSchedule,
      seed: epochFinalHash
    };
    
    this.leaderSchedules.set(nextEpoch, leaderSchedule);
    
    // Update consensus state
    this.consensusState.currentEpoch = nextEpoch;
    this.consensusState.epochStartSlot = this.consensusState.currentSlot;
    this.consensusState.leaderSchedule = nextSchedule;
    
    // Initialize blocks array for new epoch
    this.epochBlocks.set(nextEpoch, []);
    
    console.log(`Epoch transition: ${currentEpoch} -> ${nextEpoch}`);
    console.log(`Final hash: ${epochFinalHash}`);
    console.log(`New leader schedule: ${nextSchedule.slice(0, 5).join(', ')}...`);
  }

  addBlock(block: Block): void {
    const epoch = this.getEpochFromSlot(block.slot);
    
    if (!this.epochBlocks.has(epoch)) {
      this.epochBlocks.set(epoch, []);
    }
    
    this.epochBlocks.get(epoch)!.push(block);
  }

  getEpochFromSlot(slot: number): number {
    return Math.floor(slot / EPOCH_CONSTANTS.SLOTS_PER_EPOCH);
  }

  getSlotInEpoch(slot: number): number {
    return slot % EPOCH_CONSTANTS.SLOTS_PER_EPOCH;
  }

  getLeaderForSlot(slot: number): string | null {
    const epoch = this.getEpochFromSlot(slot);
    const slotInEpoch = this.getSlotInEpoch(slot);
    
    // Handle genesis epoch with special rotation
    if (epoch === 0) {
      const activeValidators = this.getActiveValidators();
      if (activeValidators.length === 0) return null;
      
      // Sort validators by public key to ensure deterministic order across all nodes
      const sortedValidators = activeValidators.sort((a, b) => a.publicKey.localeCompare(b.publicKey));
      
      const rotationSlot = Math.floor(slot / EPOCH_CONSTANTS.GENESIS_EPOCH_LEADER_ROTATION_SLOTS);
      return sortedValidators[rotationSlot % sortedValidators.length].publicKey;
    }
    
    const schedule = this.leaderSchedules.get(epoch);
    if (!schedule || slotInEpoch >= schedule.schedule.length) {
      return null;
    }
    
    return schedule.schedule[slotInEpoch];
  }

  getCurrentLeader(): string | null {
    return this.getLeaderForSlot(this.consensusState.currentSlot);
  }

  getEpochInfo(): EpochInfo {
    const currentSlot = this.consensusState.currentSlot;
    const currentEpoch = this.consensusState.currentEpoch;
    const slotInEpoch = this.getSlotInEpoch(currentSlot);
    const epochBlocks = this.epochBlocks.get(currentEpoch) || [];
    
    return {
      epoch: currentEpoch,
      slot: slotInEpoch,
      slotsInEpoch: EPOCH_CONSTANTS.SLOTS_PER_EPOCH,
      absoluteSlot: currentSlot,
      blockHeight: epochBlocks.length,
      transactionCount: epochBlocks.reduce((sum, block) => sum + block.transactions.length, 0)
    };
  }

  getLeaderSchedule(epoch?: number): LeaderSchedule | null {
    const targetEpoch = epoch ?? this.consensusState.currentEpoch;
    return this.leaderSchedules.get(targetEpoch) || null;
  }

  getStats() {
    const epochInfo = this.getEpochInfo();
    return {
      totalValidators: this.validators.size,
      activeValidators: this.getActiveValidators().length,
      totalStake: this.getTotalStake(),
      currentSlot: this.consensusState.currentSlot,
      currentEpoch: this.consensusState.currentEpoch,
      totalVotes: Array.from(this.votes.values()).reduce((sum, votes) => sum + votes.length, 0),
      epochInfo,
      currentLeader: this.getCurrentLeader(),
      leaderSchedule: this.getLeaderSchedule()
    };
  }
}