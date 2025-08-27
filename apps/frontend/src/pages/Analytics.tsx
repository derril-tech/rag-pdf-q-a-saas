import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart3,
    TrendingUp,
    Clock,
    DollarSign,
    Calendar,
    Filter,
    Download,
    Loader2
} from 'lucide-react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';

// Types
interface AnalyticsData {
    queriesPerDay: ChartDataPoint[];
    latencyOverTime: ChartDataPoint[];
    tokenSpend: ChartDataPoint[];
    topDocuments: TopDocument[];
    topProjects: TopProject[];
    usageByHour: HourlyUsage[];
    costBreakdown: CostBreakdown[];
}

interface ChartDataPoint {
    date: string;
    value: number;
    label?: string;
}

interface TopDocument {
    id: string;
    name: string;
    queries: number;
    percentage: number;
}

interface TopProject {
    id: string;
    name: string;
    queries: number;
    documents: number;
    percentage: number;
}

interface HourlyUsage {
    hour: number;
    queries: number;
    avgLatency: number;
}

interface CostBreakdown {
    category: string;
    amount: number;
    percentage: number;
    color: string;
}

// Mock data
const mockAnalyticsData: AnalyticsData = {
    queriesPerDay: [
        { date: '2024-01-01', value: 45 },
        { date: '2024-01-02', value: 52 },
        { date: '2024-01-03', value: 38 },
        { date: '2024-01-04', value: 67 },
        { date: '2024-01-05', value: 89 },
        { date: '2024-01-06', value: 76 },
        { date: '2024-01-07', value: 94 },
        { date: '2024-01-08', value: 87 },
        { date: '2024-01-09', value: 103 },
        { date: '2024-01-10', value: 91 },
        { date: '2024-01-11', value: 78 },
        { date: '2024-01-12', value: 85 },
        { date: '2024-01-13', value: 96 },
        { date: '2024-01-14', value: 112 }
    ],
    latencyOverTime: [
        { date: '2024-01-01', value: 2.3 },
        { date: '2024-01-02', value: 2.1 },
        { date: '2024-01-03', value: 2.5 },
        { date: '2024-01-04', value: 2.0 },
        { date: '2024-01-05', value: 1.8 },
        { date: '2024-01-06', value: 2.2 },
        { date: '2024-01-07', value: 1.9 },
        { date: '2024-01-08', value: 2.4 },
        { date: '2024-01-09', value: 2.1 },
        { date: '2024-01-10', value: 1.7 },
        { date: '2024-01-11', value: 2.3 },
        { date: '2024-01-12', value: 2.0 },
        { date: '2024-01-13', value: 1.8 },
        { date: '2024-01-14', value: 2.1 }
    ],
    tokenSpend: [
        { date: '2024-01-01', value: 1250 },
        { date: '2024-01-02', value: 1420 },
        { date: '2024-01-03', value: 980 },
        { date: '2024-01-04', value: 1680 },
        { date: '2024-01-05', value: 2340 },
        { date: '2024-01-06', value: 1980 },
        { date: '2024-01-07', value: 2560 },
        { date: '2024-01-08', value: 2180 },
        { date: '2024-01-09', value: 2890 },
        { date: '2024-01-10', value: 2450 },
        { date: '2024-01-11', value: 1980 },
        { date: '2024-01-12', value: 2240 },
        { date: '2024-01-13', value: 2670 },
        { date: '2024-01-14', value: 3120 }
    ],
    topDocuments: [
        { id: 'doc-1', name: 'API Documentation.pdf', queries: 156, percentage: 23 },
        { id: 'doc-2', name: 'Product Manual.pdf', queries: 134, percentage: 20 },
        { id: 'doc-3', name: 'Security Guidelines.pdf', queries: 98, percentage: 15 },
        { id: 'doc-4', name: 'User Guide.pdf', queries: 87, percentage: 13 },
        { id: 'doc-5', name: 'Deployment Guide.pdf', queries: 76, percentage: 11 }
    ],
    topProjects: [
        { id: 'proj-1', name: 'API Integration', queries: 234, documents: 8, percentage: 35 },
        { id: 'proj-2', name: 'Product Development', queries: 187, documents: 12, percentage: 28 },
        { id: 'proj-3', name: 'Security Audit', queries: 145, documents: 5, percentage: 22 },
        { id: 'proj-4', name: 'User Training', queries: 98, documents: 3, percentage: 15 }
    ],
    usageByHour: [
        { hour: 0, queries: 12, avgLatency: 2.1 },
        { hour: 1, queries: 8, avgLatency: 2.3 },
        { hour: 2, queries: 5, avgLatency: 2.5 },
        { hour: 3, queries: 3, avgLatency: 2.8 },
        { hour: 4, queries: 2, avgLatency: 3.0 },
        { hour: 5, queries: 4, avgLatency: 2.7 },
        { hour: 6, queries: 8, avgLatency: 2.4 },
        { hour: 7, queries: 15, avgLatency: 2.2 },
        { hour: 8, queries: 28, avgLatency: 2.0 },
        { hour: 9, queries: 45, avgLatency: 1.9 },
        { hour: 10, queries: 52, avgLatency: 1.8 },
        { hour: 11, queries: 48, avgLatency: 1.9 },
        { hour: 12, queries: 38, avgLatency: 2.1 },
        { hour: 13, queries: 42, avgLatency: 2.0 },
        { hour: 14, queries: 55, avgLatency: 1.8 },
        { hour: 15, queries: 61, avgLatency: 1.7 },
        { hour: 16, queries: 58, avgLatency: 1.8 },
        { hour: 17, queries: 49, avgLatency: 1.9 },
        { hour: 18, queries: 35, avgLatency: 2.0 },
        { hour: 19, queries: 28, avgLatency: 2.1 },
        { hour: 20, queries: 22, avgLatency: 2.2 },
        { hour: 21, queries: 18, avgLatency: 2.3 },
        { hour: 22, queries: 15, avgLatency: 2.4 },
        { hour: 23, queries: 12, avgLatency: 2.5 }
    ],
    costBreakdown: [
        { category: 'Embedding Generation', amount: 1250, percentage: 45, color: '#3b82f6' },
        { category: 'LLM Inference', amount: 980, percentage: 35, color: '#10b981' },
        { category: 'Storage', amount: 320, percentage: 12, color: '#f59e0b' },
        { category: 'Processing', amount: 220, percentage: 8, color: '#ef4444' }
    ]
};

// Analytics Component
const Analytics: React.FC = () => {
    const [timeRange, setTimeRange] = useState<'7d' | '14d' | '30d'>('14d');
    const [selectedMetric, setSelectedMetric] = useState<'queries' | 'latency' | 'tokens'>('queries');

    // Fetch analytics data
    const { data: analyticsData = mockAnalyticsData, isLoading } = useQuery({
        queryKey: ['analytics', timeRange],
        queryFn: async (): Promise<AnalyticsData> => {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            return mockAnalyticsData;
        }
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount / 1000); // Convert from cents to dollars
    };

    const formatTokens = (tokens: number) => {
        if (tokens >= 1000000) {
            return `${(tokens / 1000000).toFixed(1)}M`;
        } else if (tokens >= 1000) {
            return `${(tokens / 1000).toFixed(1)}K`;
        }
        return tokens.toString();
    };

    const getMetricData = () => {
        switch (selectedMetric) {
            case 'queries':
                return analyticsData.queriesPerDay;
            case 'latency':
                return analyticsData.latencyOverTime;
            case 'tokens':
                return analyticsData.tokenSpend;
            default:
                return analyticsData.queriesPerDay;
        }
    };

    const getMetricConfig = () => {
        switch (selectedMetric) {
            case 'queries':
                return {
                    title: 'Queries per Day',
                    color: '#3b82f6',
                    formatter: (value: number) => value.toString(),
                    unit: 'queries'
                };
            case 'latency':
                return {
                    title: 'Average Response Time',
                    color: '#10b981',
                    formatter: (value: number) => `${value}s`,
                    unit: 'seconds'
                };
            case 'tokens':
                return {
                    title: 'Token Usage',
                    color: '#8b5cf6',
                    formatter: formatTokens,
                    unit: 'tokens'
                };
            default:
                return {
                    title: 'Queries per Day',
                    color: '#3b82f6',
                    formatter: (value: number) => value.toString(),
                    unit: 'queries'
                };
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                    <p className="text-gray-600">Loading analytics...</p>
                </div>
            </div>
        );
    }

    const metricConfig = getMetricConfig();
    const chartData = getMetricData();

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
                            <p className="text-gray-600 mt-2">
                                Monitor your RAG PDF Q&A system performance and usage
                            </p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                <Download className="w-4 h-4 mr-2" />
                                Export Report
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700">Time Range:</span>
                            <select
                                value={timeRange}
                                onChange={(e) => setTimeRange(e.target.value as '7d' | '14d' | '30d')}
                                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="7d">Last 7 days</option>
                                <option value="14d">Last 14 days</option>
                                <option value="30d">Last 30 days</option>
                            </select>
                        </div>
                        <div className="flex items-center space-x-2">
                            <BarChart3 className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700">Metric:</span>
                            <select
                                value={selectedMetric}
                                onChange={(e) => setSelectedMetric(e.target.value as 'queries' | 'latency' | 'tokens')}
                                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="queries">Queries</option>
                                <option value="latency">Latency</option>
                                <option value="tokens">Token Usage</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Main Chart */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">{metricConfig.title}</h2>
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
                                    formatter={(value) => [metricConfig.formatter(value as number), metricConfig.unit]}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke={metricConfig.color}
                                    strokeWidth={2}
                                    dot={{ fill: metricConfig.color, strokeWidth: 2, r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <TrendingUp className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Queries</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {analyticsData.queriesPerDay.reduce((sum, day) => sum + day.value, 0).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Clock className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {(analyticsData.latencyOverTime.reduce((sum, day) => sum + day.value, 0) / analyticsData.latencyOverTime.length).toFixed(1)}s
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <DollarSign className="w-6 h-6 text-purple-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Cost</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {formatCurrency(analyticsData.tokenSpend.reduce((sum, day) => sum + day.value, 0))}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <BarChart3 className="w-6 h-6 text-orange-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Active Documents</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {analyticsData.topDocuments.length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Top Documents */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Documents by Queries</h3>
                        <div className="space-y-3">
                            {analyticsData.topDocuments.map((doc, index) => (
                                <div key={doc.id} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                            <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{doc.name}</p>
                                            <p className="text-xs text-gray-500">{doc.queries} queries</p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">{doc.percentage}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Cost Breakdown */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={analyticsData.costBreakdown}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="amount"
                                    >
                                        {analyticsData.costBreakdown.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 space-y-2">
                            {analyticsData.costBreakdown.map((item, index) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center space-x-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: item.color }}
                                        />
                                        <span className="text-gray-700">{item.category}</span>
                                    </div>
                                    <span className="font-medium text-gray-900">{item.percentage}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Hourly Usage */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly Usage Pattern</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData.usageByHour}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="hour"
                                    tickFormatter={(value) => `${value}:00`}
                                />
                                <YAxis yAxisId="left" />
                                <YAxis yAxisId="right" orientation="right" />
                                <Tooltip
                                    labelFormatter={(value) => `${value}:00`}
                                    formatter={(value, name) => [
                                        name === 'queries' ? value : `${value}s`,
                                        name === 'queries' ? 'Queries' : 'Avg Latency'
                                    ]}
                                />
                                <Bar yAxisId="left" dataKey="queries" fill="#3b82f6" />
                                <Line yAxisId="right" type="monotone" dataKey="avgLatency" stroke="#10b981" strokeWidth={2} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Projects */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Projects</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Project
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Queries
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Documents
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Usage %
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {analyticsData.topProjects.map((project) => (
                                    <tr key={project.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{project.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{project.queries}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{project.documents}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{project.percentage}%</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
