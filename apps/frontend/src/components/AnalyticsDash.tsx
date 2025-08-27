import React from 'react';
import {
    TrendingUp,
    TrendingDown,
    BarChart3,
    Activity,
    Clock,
    DollarSign
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
    AreaChart,
    Area
} from 'recharts';
import { format } from 'date-fns';

// Types
interface ChartDataPoint {
    date: string;
    value: number;
    label?: string;
}

interface MetricCard {
    title: string;
    value: string | number;
    change: number;
    changeType: 'increase' | 'decrease';
    icon: React.ReactNode;
    color: string;
}

interface AnalyticsDashProps {
    queriesData: ChartDataPoint[];
    latencyData: ChartDataPoint[];
    costData: ChartDataPoint[];
    documentsData: ChartDataPoint[];
    metrics: MetricCard[];
    timeRange: '7d' | '14d' | '30d';
    className?: string;
}

const AnalyticsDash: React.FC<AnalyticsDashProps> = ({
    queriesData,
    latencyData,
    costData,
    documentsData,
    metrics,
    timeRange,
    className = ''
}) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const formatNumber = (num: number) => {
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(1)}M`;
        } else if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}K`;
        }
        return num.toString();
    };

    return (
        <div className={className}>
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {metrics.map((metric, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                                <div className="flex items-center mt-2">
                                    {metric.changeType === 'increase' ? (
                                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                                    ) : (
                                        <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                                    )}
                                    <span className={`text-sm font-medium ${metric.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {metric.changeType === 'increase' ? '+' : ''}{metric.change}%
                                    </span>
                                </div>
                            </div>
                            <div className={`p-3 rounded-lg ${metric.color}`}>
                                {metric.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Queries Chart */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Queries per Day</h3>
                        <div className="flex items-center space-x-2">
                            <BarChart3 className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-500">Last {timeRange}</span>
                        </div>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={queriesData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                                />
                                <YAxis />
                                <Tooltip
                                    labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                                    formatter={(value) => [formatNumber(value as number), 'Queries']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#3b82f6"
                                    fill="#3b82f6"
                                    fillOpacity={0.1}
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Latency Chart */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Average Response Time</h3>
                        <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-500">Last {timeRange}</span>
                        </div>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={latencyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                                />
                                <YAxis />
                                <Tooltip
                                    labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                                    formatter={(value) => [`${value}s`, 'Response Time']}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Cost Chart */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Daily Cost</h3>
                        <div className="flex items-center space-x-2">
                            <DollarSign className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-500">Last {timeRange}</span>
                        </div>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={costData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                                />
                                <YAxis />
                                <Tooltip
                                    labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                                    formatter={(value) => [formatCurrency(value as number), 'Cost']}
                                />
                                <Bar dataKey="value" fill="#8b5cf6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Documents Chart */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Documents Uploaded</h3>
                        <div className="flex items-center space-x-2">
                            <Activity className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-500">Last {timeRange}</span>
                        </div>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={documentsData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                                />
                                <YAxis />
                                <Tooltip
                                    labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                                    formatter={(value) => [value, 'Documents']}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#f59e0b"
                                    strokeWidth={2}
                                    dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDash;
