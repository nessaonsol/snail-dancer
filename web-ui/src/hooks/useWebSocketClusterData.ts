import { useState, useEffect, useRef } from "react";
import type { ClusterNode, Block, ConsensusInfo } from "../types";

const CLUSTER_NODES: ClusterNode[] = [
    { nodeId: "1", port: 8001, httpPort: 9001, wsPort: 10001, isOnline: false },
    { nodeId: "2", port: 8002, httpPort: 9002, wsPort: 10002, isOnline: false },
    { nodeId: "3", port: 8003, httpPort: 9003, wsPort: 10003, isOnline: false },
];

interface WebSocketMessage {
    type: "initial_state" | "new_block" | "new_vote";
    data: any;
}

export function useWebSocketClusterData() {
    const [nodes, setNodes] = useState<ClusterNode[]>(CLUSTER_NODES);
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [consensus, setConsensus] = useState<ConsensusInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [votes, setVotes] = useState<Map<string, any[]>>(new Map());

    const wsConnections = useRef<Map<string, WebSocket>>(new Map());
    const reconnectTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

    const connectToNode = (node: ClusterNode) => {
        const wsUrl = `ws://localhost:${node.wsPort}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log(`Connected to WebSocket for node ${node.nodeId}`);
            wsConnections.current.set(node.nodeId, ws);

            // Update node status
            setNodes((prev) =>
                prev.map((n) =>
                    n.nodeId === node.nodeId ? { ...n, isOnline: true } : n
                )
            );

            // Clear any reconnect timeout
            const timeout = reconnectTimeouts.current.get(node.nodeId);
            if (timeout) {
                clearTimeout(timeout);
                reconnectTimeouts.current.delete(node.nodeId);
            }
        };

        ws.onmessage = (event) => {
            try {
                const message: WebSocketMessage = JSON.parse(event.data);
                handleWebSocketMessage(node.nodeId, message);
            } catch (error) {
                console.error(
                    `Error parsing WebSocket message from node ${node.nodeId}:`,
                    error
                );
            }
        };

        ws.onclose = () => {
            console.log(`WebSocket connection closed for node ${node.nodeId}`);
            wsConnections.current.delete(node.nodeId);

            // Update node status
            setNodes((prev) =>
                prev.map((n) =>
                    n.nodeId === node.nodeId ? { ...n, isOnline: false } : n
                )
            );

            // Attempt to reconnect after 2 seconds
            const timeout = setTimeout(() => {
                console.log(`Attempting to reconnect to node ${node.nodeId}`);
                connectToNode(node);
            }, 2000);

            reconnectTimeouts.current.set(node.nodeId, timeout);
        };

        ws.onerror = (error) => {
            console.error(`WebSocket error for node ${node.nodeId}:`, error);
        };
    };

    const handleWebSocketMessage = (
        nodeId: string,
        message: WebSocketMessage
    ) => {
        switch (message.type) {
            case "initial_state":
                // Update node status
                setNodes((prev) =>
                    prev.map((n) =>
                        n.nodeId === nodeId
                            ? {
                                  ...n,
                                  status: message.data.status,
                                  isOnline: true,
                              }
                            : n
                    )
                );

                // Use data from the first responding node for global state
                if (!consensus && message.data.consensus) {
                    setConsensus(message.data.consensus);
                    setBlocks(message.data.blocks || []);
                    setLoading(false);
                }
                break;

            case "new_block":
                // Update the node that produced/received the block
                setNodes((prev) =>
                    prev.map((n) =>
                        n.nodeId === nodeId
                            ? { ...n, status: message.data.status }
                            : n
                    )
                );

                // Add new block to the list (avoid duplicates)
                setBlocks((prev) => {
                    const blockExists = prev.some(
                        (b) => b.hash === message.data.block.hash
                    );
                    if (!blockExists) {
                        const newBlocks = [message.data.block, ...prev].slice(
                            0,
                            10
                        );
                        return newBlocks;
                    }
                    return prev;
                });

                // Update consensus info
                if (message.data.consensus) {
                    setConsensus(message.data.consensus);
                }
                break;

            case "new_vote":
                // Add vote to the votes map
                setVotes((prev) => {
                    const blockHash = message.data.blockHash;
                    const currentVotes = prev.get(blockHash) || [];
                    const voteExists = currentVotes.some(
                        (v) => v.validator === message.data.vote.validator
                    );

                    if (!voteExists) {
                        const newVotes = [...currentVotes, message.data.vote];
                        const newMap = new Map(prev);
                        newMap.set(blockHash, newVotes);
                        return newMap;
                    }
                    return prev;
                });

                // Update blocks with votes
                setBlocks((prev) =>
                    prev.map((block) => {
                        if (block.hash === message.data.blockHash) {
                            const blockVotes = votes.get(block.hash) || [];
                            return { ...block, votes: blockVotes };
                        }
                        return block;
                    })
                );
                break;
        }
    };

    useEffect(() => {
        // Connect to all nodes
        CLUSTER_NODES.forEach((node) => {
            connectToNode(node);
        });

        // Cleanup on unmount
        return () => {
            wsConnections.current.forEach((ws) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
            });
            wsConnections.current.clear();

            reconnectTimeouts.current.forEach((timeout) => {
                clearTimeout(timeout);
            });
            reconnectTimeouts.current.clear();
        };
    }, []);

    // Update blocks with current votes
    useEffect(() => {
        setBlocks((prev) =>
            prev.map((block) => ({
                ...block,
                votes: votes.get(block.hash) || [],
            }))
        );
    }, [votes]);

    const refresh = () => {
        // For WebSocket implementation, we don't need manual refresh
        // But we can reconnect to all nodes if needed
        wsConnections.current.forEach((ws, nodeId) => {
            if (ws.readyState !== WebSocket.OPEN) {
                const node = CLUSTER_NODES.find((n) => n.nodeId === nodeId);
                if (node) {
                    connectToNode(node);
                }
            }
        });
    };

    return {
        nodes,
        blocks,
        consensus,
        loading,
        refresh,
    };
}
