import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    FileText,
    MessageSquare,
    Search,
    Clock,
    TrendingUp,
    Users,
    Activity
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

// Types
interface DashboardStats {
    documentsUploaded: number;
    threadsStarted: number;
    queriesAnswered: number;
    avgLatency: number;
    activeUsers: number;
    satisfactionScore: number;
}

interface ChartData {
    date: string;
    queries: number;
    documents: number;
    threads: number;
}

// Mock data - in real app this would come from API
const mockStats: DashboardStats = {
    documentsUploaded: 156,
    threadsStarted: 89,
    queriesAnswered: 1247,
    avgLatency: 2.3,
    activeUsers: 23,
    satisfactionScore: 94.2
};

const mockChartData: ChartData[] = [
    { date: '2024-01-01', queries: 45, documents: 3, threads: 8 },
    { date: '2024-01-02', queries: 52, documents: 5, threads: 12 },
    { date: '2024-01-03', queries: 38, documents: 2, threads: 6 },
    { date: '2024-01-04', queries: 67, documents: 8, threads: 15 },
    { date: '2024-01-05', queries: 89, documents: 12, threads: 22 },
    { date: '2024-01-06', queries: 76, documents: 6, threads: 18 },
    { date: '2024-01-07', queries: 94, documents: 9, threads: 25 }
];

// Stat Card Component
interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, color }) => {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                    {trend && (
                        <div className="flex items-center mt-2">
                            <TrendingUp
                                className={`w-4 h-4 mr-1 ${trend.isPositive ? 'text-green-500' : 'text-red-500'
                                    }`}
                            />
                            <span className={`text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'
                                }`}>
                                {trend.isPositive ? '+' : ''}{trend.value}%
                            </span>
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-lg ${color}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
};

// Dashboard Component
const Dashboard: React.FC = () => {
    // In a real app, these would be API calls
    const { data: stats = mockStats, isLoading: statsLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async (): Promise<DashboardStats> => {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            return mockStats;
        }
    });

    const { data: chartData = mockChartData, isLoading: chartLoading } = useQuery({
        queryKey: ['dashboard-chart'],
        queryFn: async (): Promise<ChartData[]> => {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 800));
            return mockChartData;
        }
    });

    if (statsLoading || chartLoading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                                </div>
                            ))}
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                            <div className="h-64 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-600 mt-2">
                        Overview of your RAG PDF Q&A system performance
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Documents Uploaded"
                        value={stats.documentsUploaded}
                        icon={<FileText className="w-6 h-6 text-white" />}
                        trend={{ value: 12, isPositive: true }}
                        color="bg-blue-500"
                    />
                    <StatCard
                        title="Threads Started"
                        value={stats.threadsStarted}
                        icon={<MessageSquare className="w-6 h-6 text-white" />}
                        trend={{ value: 8, isPositive: true }}
                        color="bg-green-500"
                    />
                    <StatCard
                        title="Queries Answered"
                        value={stats.queriesAnswered.toLocaleString()}
                        icon={<Search className="w-6 h-6 text-white" />}
                        trend={{ value: 15, isPositive: true }}
                        color="bg-purple-500"
                    />
                    <StatCard
                        title="Avg Response Time"
                        value={`${stats.avgLatency}s`}
                        icon={<Clock className="w-6 h-6 text-white" />}
                        trend={{ value: 5, isPositive: false }}
                        color="bg-orange-500"
                    />
                </div>

                {/* Additional Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <StatCard
                        title="Active Users"
                        value={stats.activeUsers}
                        icon={<Users className="w-6 h-6 text-white" />}
                        trend={{ value: 18, isPositive: true }}
                        color="bg-indigo-500"
                    />
                    <StatCard
                        title="Satisfaction Score"
                        value={`${stats.satisfactionScore}%`}
                        icon={<Activity className="w-6 h-6 text-white" />}
                        trend={{ value: 3, isPositive: true }}
                        color="bg-emerald-500"
                    />
                </div>

                {/* Activity Chart */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Activity Overview</h2>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                                />
                                <YAxis />
                                <Tooltip
                                    labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                                    formatter={(value, name) => [
                                        value,
                                        name === 'queries' ? 'Queries' :
                                            name === 'documents' ? 'Documents' : 'Threads'
                                    ]}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="queries"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="documents"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="threads"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h2>
                    <div className="space-y-4">
                        {[
                            { type: 'query', text: 'New query about API documentation', time: '2 minutes ago' },
                            { type: 'document', text: 'Uploaded "Product Manual.pdf"', time: '15 minutes ago' },
                            { type: 'thread', text: 'Started new conversation thread', time: '1 hour ago' },
                            { type: 'query', text: 'Query about deployment process', time: '2 hours ago' },
                            { type: 'document', text: 'Uploaded "Security Guidelines.pdf"', time: '3 hours ago' }
                        ].map((activity, index) => (
                            <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                                <div className={`p-2 rounded-full ${activity.type === 'query' ? 'bg-blue-100' :
                                        activity.type === 'document' ? 'bg-green-100' : 'bg-purple-100'
                                    }`}>
                                    {activity.type === 'query' && <Search className="w-4 h-4 text-blue-600" />}
                                    {activity.type === 'document' && <FileText className="w-4 h-4 text-green-600" />}
                                    {activity.type === 'thread' && <MessageSquare className="w-4 h-4 text-purple-600" />}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{activity.text}</p>
                                    <p className="text-xs text-gray-500">{activity.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
