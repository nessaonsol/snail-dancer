import { useState, useEffect } from "react";
import type { ClusterNode, NodeStatus, Block, ConsensusInfo } from "../types";

const CLUSTER_NODES: ClusterNode[] = [
    { nodeId: "1", port: 8001, httpPort: 9001, wsPort: 10001, isOnline: false },
    { nodeId: "2", port: 8002, httpPort: 9002, wsPort: 10002, isOnline: false },
    { nodeId: "3", port: 8003, httpPort: 9003, wsPort: 10003, isOnline: false },
];

export function useClusterData() {
    const [nodes, setNodes] = useState<ClusterNode[]>(CLUSTER_NODES);
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [consensus, setConsensus] = useState<ConsensusInfo | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchNodeStatus = async (
        node: ClusterNode
    ): Promise<NodeStatus | null> => {
        try {
            const response = await fetch(
                `http://localhost:${node.httpPort}/api/status`
            );
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error(
                `Failed to fetch status for node ${node.nodeId}:`,
                error
            );
        }
        return null;
    };

    const fetchBlocks = async (node: ClusterNode): Promise<Block[]> => {
        try {
            const response = await fetch(
                `http://localhost:${node.httpPort}/api/blocks?limit=10`
            );
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error(
                `Failed to fetch blocks for node ${node.nodeId}:`,
                error
            );
        }
        return [];
    };

    const fetchConsensus = async (
        node: ClusterNode
    ): Promise<ConsensusInfo | null> => {
        try {
            const response = await fetch(
                `http://localhost:${node.httpPort}/api/consensus`
            );
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error(
                `Failed to fetch consensus for node ${node.nodeId}:`,
                error
            );
        }
        return null;
    };

    const updateClusterData = async () => {
        setLoading(true);

        const updatedNodes = await Promise.all(
            CLUSTER_NODES.map(async (node) => {
                const status = await fetchNodeStatus(node);
                return {
                    ...node,
                    status,
                    isOnline: status !== null,
                };
            })
        );

        setNodes(updatedNodes);

        // Get blocks and consensus from the first online node
        const onlineNode = updatedNodes.find((node) => node.isOnline);
        if (onlineNode) {
            const latestBlocks = await fetchBlocks(onlineNode);
            const consensusInfo = await fetchConsensus(onlineNode);
            setBlocks(latestBlocks);
            setConsensus(consensusInfo);
        }

        setLoading(false);
    };

    useEffect(() => {
        updateClusterData();
        const interval = setInterval(updateClusterData, 2000); // Update every 2 seconds
        return () => clearInterval(interval);
    }, []);

    return {
        nodes,
        blocks,
        consensus,
        loading,
        refresh: updateClusterData,
    };
}
