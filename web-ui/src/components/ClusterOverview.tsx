import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import type { ClusterNode, ConsensusInfo } from "../types";

interface ClusterOverviewProps {
    nodes: ClusterNode[];
    consensus: ConsensusInfo | null;
}

export function ClusterOverview({ nodes, consensus }: ClusterOverviewProps) {
    const onlineNodes = nodes.filter((node) => node.isOnline);
    const totalStake = consensus?.totalStake || 0;
    const totalBlocks = Math.max(
        ...onlineNodes.map((node) => node.status?.blockHeight || 0),
        0
    );
    const activeValidators = consensus?.activeValidators || 0;
    const currentEpoch = consensus?.currentEpoch || 0;

    const epochInfo = consensus?.epochInfo;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Online Nodes
                    </CardTitle>
                    <div className="h-4 w-4 rounded-full bg-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {onlineNodes.length}/{nodes.length}
                    </div>
                    <p className="text-xs text-gray-600">
                        {onlineNodes.length === nodes.length
                            ? "All nodes online"
                            : `${nodes.length - onlineNodes.length} offline`}
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Block Height
                    </CardTitle>
                    <div className="h-4 w-4 rounded-full bg-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalBlocks}</div>
                    <p className="text-xs text-gray-600">
                        Latest block produced
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Total Stake
                    </CardTitle>
                    <div className="h-4 w-4 rounded-full bg-purple-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {totalStake.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-600">
                        SOL staked across validators
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Active Validators
                    </CardTitle>
                    <div className="h-4 w-4 rounded-full bg-orange-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{activeValidators}</div>
                    <p className="text-xs text-gray-600">
                        Participating in consensus
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Current Epoch
                    </CardTitle>
                    <div className="h-4 w-4 rounded-full bg-indigo-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{currentEpoch}</div>
                    <p className="text-xs text-gray-600">
                        Slot {epochInfo?.slot || 0}/
                        {epochInfo?.slotsInEpoch || 64}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
