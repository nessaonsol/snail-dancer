import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import type { ClusterNode, ConsensusInfo } from "../types";

interface NodesListProps {
    nodes: ClusterNode[];
    consensus: ConsensusInfo | null;
}

export function NodesList({ nodes, consensus }: NodesListProps) {
    // Helper function to check if a node is the current leader
    const isCurrentLeader = (node: ClusterNode): boolean => {
        if (!consensus?.currentLeader || !node.status) return false;
        return node.status.publicKey === consensus.currentLeader;
    };
    return (
        <Card>
            <CardHeader>
                <CardTitle>Validator Nodes</CardTitle>
                <CardDescription>
                    Status and information for all nodes in the cluster
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {nodes.map((node) => (
                        <div
                            key={node.nodeId}
                            className="flex items-center justify-between p-4 border rounded-lg"
                        >
                            <div className="flex items-center space-x-4">
                                <div className="flex flex-col">
                                    <div className="flex items-center space-x-2">
                                        <span className="font-medium">
                                            Node {node.nodeId}
                                        </span>
                                        <Badge
                                            variant={
                                                node.isOnline
                                                    ? "success"
                                                    : "destructive"
                                            }
                                        >
                                            {node.isOnline
                                                ? "Online"
                                                : "Offline"}
                                        </Badge>
                                        {isCurrentLeader(node) && (
                                            <Badge variant="warning">
                                                Leader
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        P2P: {node.port} | API: {node.httpPort}
                                    </div>
                                    {node.status && (
                                        <div className="text-xs text-gray-600">
                                            {node.status.publicKey.substring(
                                                0,
                                                16
                                            )}
                                            ...
                                        </div>
                                    )}
                                </div>
                            </div>

                            {node.status && (
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div className="text-center">
                                        <div className="font-medium">
                                            {node.status.blockHeight}
                                        </div>
                                        <div className="text-gray-600">
                                            Blocks
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-medium">
                                            {node.status.network.connectedPeers}
                                        </div>
                                        <div className="text-gray-600">
                                            Peers
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-medium">
                                            {node.status.poh.entriesCount}
                                        </div>
                                        <div className="text-gray-600">
                                            PoH Entries
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
