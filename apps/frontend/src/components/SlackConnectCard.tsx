import React from 'react';
import {
    Slack,
    CheckCircle,
    ExternalLink,
    RefreshCw,
    MessageSquare,
    Clock,
    Shield
} from 'lucide-react';

// Types
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

interface SlackConnectCardProps {
    workspace?: SlackWorkspace;
    onConnect: () => void;
    onDisconnect: () => void;
    onRefresh: () => void;
    isLoading: boolean;
    className?: string;
}

const SlackConnectCard: React.FC<SlackConnectCardProps> = ({
    workspace,
    onConnect,
    onDisconnect,
    onRefresh,
    isLoading,
    className = ''
}) => {
    return (
        <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
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

export default SlackConnectCard;
