export interface Block {
  hash: string;
  previousHash: string;
  pohHash: string;
  pohCount: number;
  transactions: Transaction[];
  timestamp: number;
  leader: string;
  signature: string;
  slot: number;
  epoch: number;
}

export interface Transaction {
  from: string;
  to: string;
  amount: number;
  fee: number;
  signature: string;
  timestamp: number;
  nonce: number;
}

export interface Vote {
  validator: string;
  blockHash: string;
  timestamp: number;
  signature: string;
  lockout: number;
}

export interface Account {
  publicKey: string;
  balance: number;
  nonce: number;
}

export interface ValidatorInfo {
  publicKey: string;
  stake: number;
  address: string;
  port: number;
  isActive: boolean;
}

export interface PohEntry {
  hash: string;
  count: number;
  timestamp: number;
  events?: PohEvent[];
}

export interface PohEvent {
  type: 'transaction' | 'vote' | 'block';
  data: string;
  hash: string;
}

export interface NetworkMessage {
  type: 'block' | 'transaction' | 'vote' | 'gossip' | 'poh' | 'validator_info';
  data: unknown;
  sender: string;
  timestamp: number;
  signature: string;
}

export interface ClusterInfo {
  validators: ValidatorInfo[];
  currentLeader: string;
  epoch: number;
  slot: number;
  leaderSchedule: string[];
  epochStartSlot: number;
  epochEndSlot: number;
}

export interface ConsensusState {
  currentSlot: number;
  currentEpoch: number;
  votedSlots: Set<number>;
  lockouts: Map<number, number>;
  forkChoice: string;
  leaderSchedule: string[];
  epochStartSlot: number;
  epochFinalHash?: string;
}

export type NodeConfig = {
  nodeId: string;
  port: number;
  peers: string[];
  isValidator: boolean;
  stake: number;
  privateKey?: string;
  publicKey?: string;
};

export const EPOCH_CONSTANTS = {
  SLOTS_PER_EPOCH: 64,
  GENESIS_EPOCH_LEADER_ROTATION_SLOTS: 4
} as const;

export interface EpochInfo {
  epoch: number;
  slot: number;
  slotsInEpoch: number;
  absoluteSlot: number;
  blockHeight: number;
  transactionCount: number;
}

export interface LeaderSchedule {
  epoch: number;
  schedule: string[];
  seed: string;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}