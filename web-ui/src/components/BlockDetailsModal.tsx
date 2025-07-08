import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "./ui/dialog";
import type { Block } from "../types";

interface BlockDetailsModalProps {
    block: Block | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function BlockDetailsModal({
    block,
    open,
    onOpenChange,
}: BlockDetailsModalProps) {
    if (!block) return null;

    const formatTimestamp = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    const formatHash = (hash: string) => {
        return hash;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Block Details</DialogTitle>
                    <DialogDescription>
                        Detailed information about block{" "}
                        {block.hash.substring(0, 16)}...
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Block Hash */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-2">
                            Block Hash
                        </h3>
                        <code className="block bg-gray-100 p-3 rounded text-sm font-mono break-all">
                            {formatHash(block.hash)}
                        </code>
                    </div>

                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 mb-2">
                                Timestamp
                            </h3>
                            <p className="text-sm text-gray-600">
                                {formatTimestamp(block.timestamp)}
                            </p>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 mb-2">
                                Transactions
                            </h3>
                            <p className="text-sm text-gray-600">
                                {block.transactions.length}
                            </p>
                        </div>
                    </div>

                    {/* Previous Hash */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-2">
                            Previous Block Hash
                        </h3>
                        <code className="block bg-gray-100 p-3 rounded text-sm font-mono break-all">
                            {formatHash(block.previousHash)}
                        </code>
                    </div>

                    {/* Leader */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-2">
                            Block Leader
                        </h3>
                        <code className="block bg-gray-100 p-3 rounded text-sm font-mono break-all">
                            {formatHash(block.leader)}
                        </code>
                    </div>

                    {/* Proof of History */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 mb-2">
                                PoH Hash
                            </h3>
                            <code className="block bg-gray-100 p-3 rounded text-sm font-mono break-all">
                                {formatHash(block.pohHash)}
                            </code>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 mb-2">
                                PoH Count
                            </h3>
                            <p className="text-sm text-gray-600">
                                {block.pohCount.toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {/* Slot and Epoch */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 mb-2">
                                Slot
                            </h3>
                            <p className="text-sm text-gray-600">
                                {block.slot}
                            </p>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 mb-2">
                                Epoch
                            </h3>
                            <p className="text-sm text-gray-600">
                                {block.epoch}
                            </p>
                        </div>
                    </div>

                    {/* Votes */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-2">
                            Votes ({block.votes?.length || 0})
                        </h3>
                        {!block.votes || block.votes.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">
                                No votes received for this block
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {block.votes.map((vote, index) => (
                                    <div
                                        key={index}
                                        className="border rounded p-3 bg-green-50 border-green-200"
                                    >
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="font-medium">
                                                    Validator:
                                                </span>
                                                <code className="block text-xs font-mono mt-1 break-all">
                                                    {vote.validator.substring(
                                                        0,
                                                        16
                                                    )}
                                                    ...
                                                </code>
                                            </div>
                                            <div>
                                                <span className="font-medium">
                                                    Timestamp:
                                                </span>
                                                <p className="text-xs mt-1">
                                                    {formatTimestamp(
                                                        vote.timestamp
                                                    )}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="font-medium">
                                                    Lockout:
                                                </span>{" "}
                                                {vote.lockout}
                                            </div>
                                        </div>
                                        <div className="mt-2">
                                            <span className="font-medium text-sm">
                                                Vote Signature:
                                            </span>
                                            <code className="block text-xs font-mono mt-1 break-all bg-white p-2 rounded">
                                                {vote.signature}
                                            </code>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Block Signature */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-2">
                            Block Signature
                        </h3>
                        <code className="block bg-gray-100 p-3 rounded text-sm font-mono break-all">
                            {formatHash(block.signature)}
                        </code>
                    </div>

                    {/* Transactions */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-2">
                            Transactions
                        </h3>
                        {block.transactions.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">
                                No transactions in this block
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {block.transactions.map((tx, index) => (
                                    <div
                                        key={index}
                                        className="border rounded p-3 bg-gray-50"
                                    >
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="font-medium">
                                                    From:
                                                </span>
                                                <code className="block text-xs font-mono mt-1 break-all">
                                                    {tx.from}
                                                </code>
                                            </div>
                                            <div>
                                                <span className="font-medium">
                                                    To:
                                                </span>
                                                <code className="block text-xs font-mono mt-1 break-all">
                                                    {tx.to}
                                                </code>
                                            </div>
                                            <div>
                                                <span className="font-medium">
                                                    Amount:
                                                </span>{" "}
                                                {tx.amount} SOL
                                            </div>
                                            <div>
                                                <span className="font-medium">
                                                    Fee:
                                                </span>{" "}
                                                {tx.fee} SOL
                                            </div>
                                        </div>
                                        <div className="mt-2">
                                            <span className="font-medium text-sm">
                                                Signature:
                                            </span>
                                            <code className="block text-xs font-mono mt-1 break-all bg-white p-2 rounded">
                                                {tx.signature}
                                            </code>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Close button */}
                <div className="flex justify-end mt-6">
                    <button
                        onClick={() => onOpenChange(false)}
                        className="px-4 py-2 bg-gray-100 text-gray-900 rounded-md hover:bg-gray-200 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
