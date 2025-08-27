import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
    Slack,
    CheckCircle,
    XCircle,
    ExternalLink,
    Settings,
    MessageSquare,
    Zap,
    Shield,
    Loader2,
    RefreshCw,
    Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

// Types
interface Integration {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    status: 'connected' | 'disconnected' | 'error';
    connectedAt?: string;
    lastSync?: string;
    settings?: Record<string, any>;
}

interface SlackWorkspace {
    id: string;
    name: string;
    domain: string;
    memberCount: number;
    connectedAt: string;
    channels: SlackChannel[];
}

interface SlackChannel {
    id: string;
    name: string;
    isPrivate: boolean;
    memberCount: number;
}

// Mock data
const mockSlackWorkspace: SlackWorkspace = {
    id: 'slack-workspace-123',
    name: 'Acme Corp',
    domain: 'acmecorp',
    memberCount: 45,
    connectedAt: '2024-01-10T14:30:00Z',
    channels: [
        { id: 'C1234567890', name: 'general', isPrivate: false, memberCount: 45 },
        { id: 'C1234567891', name: 'random', isPrivate: false, memberCount: 23 },
        { id: 'C1234567892', name: 'dev-team', isPrivate: false, memberCount: 12 },
        { id: 'C1234567893', name: 'product', isPrivate: false, memberCount: 8 }
    ]
};

const integrations: Integration[] = [
    {
        id: 'slack',
        name: 'Slack',
        description: 'Ask questions about your documents directly in Slack channels',
        icon: <Slack className="w-6 h-6" />,
        status: 'connected',
        connectedAt: '2024-01-10T14:30:00Z',
        lastSync: '2024-01-15T10:45:00Z'
    },
    {
        id: 'discord',
        name: 'Discord',
        description: 'Integrate with Discord servers for document Q&A',
        icon: <MessageSquare className="w-6 h-6" />,
        status: 'disconnected'
    },
    {
        id: 'teams',
        name: 'Microsoft Teams',
        description: 'Connect with Microsoft Teams for seamless collaboration',
        icon: <Zap className="w-6 h-6" />,
        status: 'disconnected'
    },
    {
        id: 'webhook',
        name: 'Webhooks',
        description: 'Send notifications and data to external systems',
        icon: <Settings className="w-6 h-6" />,
        status: 'disconnected'
    }
];

// Integration Card Component
interface IntegrationCardProps {
    integration: Integration;
    onConnect: (integrationId: string) => void;
    onDisconnect: (integrationId: string) => void;
    onSettings: (integrationId: string) => void;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({
    integration,
    onConnect,
    onDisconnect,
    onSettings
}) => {
    const getStatusColor = (status: Integration['status']) => {
        switch (status) {
            case 'connected':
                return 'text-green-600 bg-green-50';
            case 'error':
                return 'text-red-600 bg-red-50';
            default:
                return 'text-gray-600 bg-gray-50';
        }
    };

    const getStatusIcon = (status: Integration['status']) => {
        switch (status) {
            case 'connected':
                return <CheckCircle className="w-4 h-4" />;
            case 'error':
                return <XCircle className="w-4 h-4" />;
            default:
                return <XCircle className="w-4 h-4" />;
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gray-100 rounded-lg">
                        {integration.icon}
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">{integration.name}</h3>
                        <p className="text-gray-600 mt-1">{integration.description}</p>
                        {integration.status === 'connected' && (
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                                <span>Connected {new Date(integration.connectedAt!).toLocaleDateString()}</span>
                                {integration.lastSync && (
                                    <span>Last sync {new Date(integration.lastSync).toLocaleDateString()}</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(integration.status)}`}>
                        {getStatusIcon(integration.status)}
                        <span className="ml-1 capitalize">{integration.status}</span>
                    </span>
                </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    {integration.status === 'connected' ? (
                        <>
                            <button
                                onClick={() => onSettings(integration.id)}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                Settings
                            </button>
                            <button
                                onClick={() => onDisconnect(integration.id)}
                                className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                Disconnect
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => onConnect(integration.id)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Connect
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// Slack Connect Card Component
interface SlackConnectCardProps {
    workspace?: SlackWorkspace;
    onConnect: () => void;
    onDisconnect: () => void;
    onRefresh: () => void;
    isLoading: boolean;
}

const SlackConnectCard: React.FC<SlackConnectCardProps> = ({
    workspace,
    onConnect,
    onDisconnect,
    onRefresh,
    isLoading
}) => {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Slack className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Slack Integration</h2>
                        <p className="text-gray-600">Ask questions about your documents directly in Slack</p>
                    </div>
                </div>
                {workspace && (
                    <button
                        onClick={onRefresh}
                        disabled={isLoading}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                )}
            </div>

            {workspace ? (
                <div className="space-y-6">
                    {/* Workspace Info */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900">{workspace.name}</h3>
                                <p className="text-gray-600">@{workspace.domain}.slack.com</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {workspace.memberCount} members • Connected {new Date(workspace.connectedAt).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-green-600 bg-green-50">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Connected
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Channels */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Connected Channels</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {workspace.channels.map((channel) => (
                                <div key={channel.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-gray-900 font-medium">#{channel.name}</span>
                                        {channel.isPrivate && (
                                            <Shield className="w-3 h-3 text-gray-400" />
                                        )}
                                    </div>
                                    <span className="text-sm text-gray-500">{channel.memberCount} members</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Usage Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4">
                            <div className="flex items-center">
                                <MessageSquare className="w-5 h-5 text-blue-600" />
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-blue-900">Questions Asked</p>
                                    <p className="text-2xl font-bold text-blue-600">156</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                            <div className="flex items-center">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-green-900">Success Rate</p>
                                    <p className="text-2xl font-bold text-green-600">94%</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4">
                            <div className="flex items-center">
                                <Clock className="w-5 h-5 text-purple-600" />
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-purple-900">Avg Response</p>
                                    <p className="text-2xl font-bold text-purple-600">2.3s</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                        <button
                            onClick={() => window.open('https://slack.com/apps', '_blank')}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Manage in Slack
                        </button>
                        <button
                            onClick={onDisconnect}
                            className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                            Disconnect Workspace
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-center py-8">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Slack className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Connect your Slack workspace</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        Install the RAG PDF Q&A app in your Slack workspace to ask questions about your documents directly in channels.
                    </p>
                    <button
                        onClick={onConnect}
                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <Slack className="w-5 h-5 mr-2" />
                        Connect to Slack
                    </button>
                    <div className="mt-4 text-sm text-gray-500">
                        <p>• Ask questions with /askdoc command</p>
                        <p>• Get instant answers with citations</p>
                        <p>• Share conversations with your team</p>
                    </div>
                </div>
            )}
        </div>
    );
};

// Integrations Component
const Integrations: React.FC = () => {
    const [isConnecting, setIsConnecting] = useState(false);

    // Fetch Slack workspace data
    const { data: slackWorkspace = mockSlackWorkspace, isLoading: slackLoading } = useQuery({
        queryKey: ['slack-workspace'],
        queryFn: async (): Promise<SlackWorkspace | undefined> => {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 800));
            return mockSlackWorkspace;
        }
    });

    // Connect Slack mutation
    const connectSlackMutation = useMutation({
        mutationFn: async () => {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            return { success: true };
        },
        onSuccess: () => {
            toast.success('Slack workspace connected successfully!');
            setIsConnecting(false);
        },
        onError: () => {
            toast.error('Failed to connect Slack workspace');
            setIsConnecting(false);
        }
    });

    // Disconnect Slack mutation
    const disconnectSlackMutation = useMutation({
        mutationFn: async () => {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            return { success: true };
        },
        onSuccess: () => {
            toast.success('Slack workspace disconnected');
        },
        onError: () => {
            toast.error('Failed to disconnect Slack workspace');
        }
    });

    // Handle Slack connect
    const handleSlackConnect = () => {
        setIsConnecting(true);
        // In a real app, this would redirect to Slack OAuth
        setTimeout(() => {
            connectSlackMutation.mutate();
        }, 1000);
    };

    // Handle Slack disconnect
    const handleSlackDisconnect = () => {
        if (confirm('Are you sure you want to disconnect your Slack workspace?')) {
            disconnectSlackMutation.mutate();
        }
    };

    // Handle integration actions
    const handleConnect = (integrationId: string) => {
        if (integrationId === 'slack') {
            handleSlackConnect();
        } else {
            toast.info(`${integrationId} integration coming soon!`);
        }
    };

    const handleDisconnect = (integrationId: string) => {
        if (integrationId === 'slack') {
            handleSlackDisconnect();
        } else {
            toast.info(`${integrationId} integration coming soon!`);
        }
    };

    const handleSettings = (integrationId: string) => {
        toast.info(`${integrationId} settings coming soon!`);
    };

    const handleRefresh = () => {
        toast.success('Workspace data refreshed');
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
                    <p className="text-gray-600 mt-2">
                        Connect your RAG PDF Q&A system with your favorite tools and platforms
                    </p>
                </div>

                {/* Slack Integration */}
                <div className="mb-8">
                    <SlackConnectCard
                        workspace={slackWorkspace}
                        onConnect={handleSlackConnect}
                        onDisconnect={handleSlackDisconnect}
                        onRefresh={handleRefresh}
                        isLoading={slackLoading || isConnecting}
                    />
                </div>

                {/* Other Integrations */}
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Other Integrations</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {integrations.filter(integration => integration.id !== 'slack').map((integration) => (
                            <IntegrationCard
                                key={integration.id}
                                integration={integration}
                                onConnect={handleConnect}
                                onDisconnect={handleDisconnect}
                                onSettings={handleSettings}
                            />
                        ))}
                    </div>
                </div>

                {/* Coming Soon */}
                <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-blue-900 mb-2">More integrations coming soon</h3>
                    <p className="text-blue-800 mb-4">
                        We're working on integrations with more platforms to make your workflow even more seamless.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <span className="text-blue-800">Microsoft Teams</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <span className="text-blue-800">Discord</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <span className="text-blue-800">Notion</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <span className="text-blue-800">Confluence</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Integrations;
