import { useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { BlockDetailsModal } from "./BlockDetailsModal";
import type { Block } from "../types";

interface BlocksListProps {
    blocks: Block[];
}

export function BlocksList({ blocks }: BlocksListProps) {
    const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const formatTimestamp = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString();
    };

    const formatHash = (hash: string) => {
        return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
    };

    const handleBlockClick = (block: Block) => {
        setSelectedBlock(block);
        setModalOpen(true);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Blocks</CardTitle>
                <CardDescription>
                    Latest blocks produced by the cluster (click to view
                    details)
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {blocks.length === 0 ? (
                        <div className="text-center text-gray-600 py-8">
                            No blocks available
                        </div>
                    ) : (
                        blocks.map((block, index) => (
                            <div
                                key={block.hash}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-100 hover:border-blue-300 transition-colors cursor-pointer"
                                onClick={() => handleBlockClick(block)}
                                title="Click to view block details"
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="flex flex-col">
                                        <div className="flex items-center space-x-2">
                                            <span className="font-mono text-sm">
                                                {formatHash(block.hash)}
                                            </span>
                                            {index === 0 && (
                                                <Badge variant="success">
                                                    Latest
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            Leader: {formatHash(block.leader)}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-3 text-sm">
                                    <div className="text-center">
                                        <div className="font-medium">
                                            {block.transactions.length}
                                        </div>
                                        <div className="text-gray-600">
                                            Txns
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-medium">
                                            {block.votes?.length || 0}
                                        </div>
                                        <div className="text-gray-600">
                                            Votes
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-medium">
                                            {block.pohCount}
                                        </div>
                                        <div className="text-gray-600">PoH</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-medium">
                                            {formatTimestamp(block.timestamp)}
                                        </div>
                                        <div className="text-gray-600">
                                            Time
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>

            <BlockDetailsModal
                block={selectedBlock}
                open={modalOpen}
                onOpenChange={setModalOpen}
            />
        </Card>
    );
}
