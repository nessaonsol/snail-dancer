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
    votes?: Vote[];
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

export interface ValidatorInfo {
    publicKey: string;
    stake: number;
    address: string;
    port: number;
    isActive: boolean;
}

export interface NodeStatus {
    nodeId: string;
    publicKey: string;
    isRunning: boolean;
    isValidator: boolean;
    blockHeight: number;
    isLeader: boolean;
    poh: {
        isRunning: boolean;
        entriesCount: number;
        hashRate: number;
    };
    consensus: {
        totalValidators: number;
        activeValidators: number;
        totalStake: number;
        currentSlot: number;
        totalVotes: number;
    };
    network: {
        nodeId: string;
        port: number;
        connectedPeers: number;
        totalPeers: number;
        isServerRunning: boolean;
    };
    transactions: {
        poolSize: number;
        processed: number;
        totalAccounts: number;
    };
}

export interface ConsensusInfo {
    totalValidators: number;
    activeValidators: number;
    totalStake: number;
    currentSlot: number;
    currentEpoch: number;
    totalVotes: number;
    validators: ValidatorInfo[];
    leaderSchedule: string[];
    currentLeader: string | null;
    isCurrentLeader: boolean;
    epochInfo?: EpochInfo;
}

export interface EpochInfo {
    epoch: number;
    slot: number;
    slotsInEpoch: number;
    absoluteSlot: number;
    blockHeight: number;
    transactionCount: number;
    leaderSchedule?: string[];
    leaderScheduleSeed?: string;
    finalHash?: string;
}

export interface ClusterNode {
    nodeId: string;
    port: number;
    httpPort: number;
    wsPort: number;
    status?: NodeStatus | null;
    isOnline: boolean;
}
