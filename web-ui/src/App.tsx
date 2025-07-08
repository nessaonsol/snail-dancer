import { useWebSocketClusterData } from "./hooks/useWebSocketClusterData";
import { ClusterOverview } from "./components/ClusterOverview";
import { NodesList } from "./components/NodesList";
import { BlocksList } from "./components/BlocksList";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "./components/ui/card";
import { Badge } from "./components/ui/badge";

function App() {
    const { nodes, blocks, consensus, loading, refresh } =
        useWebSocketClusterData();

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto p-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                            🐌💃 Solana Cluster Monitor
                        </h1>
                        <p className="text-gray-600 mt-2">
                            Real-time monitoring of your local 🐌💃 Solana
                            blockchain cluster
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Badge variant={loading ? "warning" : "success"}>
                            {loading ? "Connecting..." : "Live Stream"}
                        </Badge>
                        <button
                            onClick={refresh}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                            disabled={loading}
                        >
                            Refresh
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    <ClusterOverview nodes={nodes} consensus={consensus} />

                    <div className="grid gap-6 md:grid-cols-2">
                        <NodesList nodes={nodes} consensus={consensus} />
                        <BlocksList blocks={blocks} />
                    </div>

                    {loading && (
                        <Card>
                            <CardContent className="flex items-center justify-center py-8">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                    <p className="text-gray-600">
                                        Loading cluster data...
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {!loading && nodes.every((node) => !node.isOnline) && (
                        <Card>
                            <CardHeader>
                                <CardTitle>No Nodes Online</CardTitle>
                                <CardDescription>
                                    Start your Solana cluster to see real-time
                                    data
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm">
                                    <p>To start the cluster, run:</p>
                                    <code className="block bg-gray-100 p-2 rounded font-mono text-sm">
                                        npm run cluster:start
                                    </code>
                                    <p className="text-gray-600">
                                        This will start 3 validator nodes on
                                        ports 8001, 8002, and 8003
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Test element to verify Tailwind is working */}
                    <div className="hidden">
                        <div className="bg-blue-500 text-white p-4 rounded-lg shadow-lg">
                            Tailwind Test Element
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
