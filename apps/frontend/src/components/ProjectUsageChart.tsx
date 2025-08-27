import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell
} from 'recharts';

// Types
interface ProjectUsage {
    id: string;
    name: string;
    queries: number;
    documents: number;
    users: number;
    cost: number;
    lastActivity: string;
}

interface ProjectUsageChartProps {
    data: ProjectUsage[];
    type: 'bar' | 'line' | 'pie';
    metric: 'queries' | 'documents' | 'users' | 'cost';
    title?: string;
    className?: string;
}

const ProjectUsageChart: React.FC<ProjectUsageChartProps> = ({
    data,
    type,
    metric,
    title,
    className = ''
}) => {
    const getMetricKey = () => {
        switch (metric) {
            case 'queries':
                return 'queries';
            case 'documents':
                return 'documents';
            case 'users':
                return 'users';
            case 'cost':
                return 'cost';
            default:
                return 'queries';
        }
    };

    const getMetricLabel = () => {
        switch (metric) {
            case 'queries':
                return 'Queries';
            case 'documents':
                return 'Documents';
            case 'users':
                return 'Users';
            case 'cost':
                return 'Cost ($)';
            default:
                return 'Queries';
        }
    };

    const formatValue = (value: number) => {
        switch (metric) {
            case 'cost':
                return `$${value.toFixed(2)}`;
            case 'queries':
            case 'documents':
            case 'users':
                return value.toLocaleString();
            default:
                return value.toString();
        }
    };

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

    const renderChart = () => {
        const metricKey = getMetricKey();
        const chartData = data.map(item => ({
            name: item.name,
            [metricKey]: item[metricKey as keyof ProjectUsage] as number,
            id: item.id
        }));

        switch (type) {
            case 'bar':
                return (
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            interval={0}
                        />
                        <YAxis />
                        <Tooltip
                            formatter={(value) => [formatValue(value as number), getMetricLabel()]}
                            labelFormatter={(label) => `Project: ${label}`}
                        />
                        <Bar dataKey={metricKey} fill="#3b82f6" />
                    </BarChart>
                );

            case 'line':
                return (
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            interval={0}
                        />
                        <YAxis />
                        <Tooltip
                            formatter={(value) => [formatValue(value as number), getMetricLabel()]}
                            labelFormatter={(label) => `Project: ${label}`}
                        />
                        <Line
                            type="monotone"
                            dataKey={metricKey}
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                        />
                    </LineChart>
                );

            case 'pie':
                return (
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey={metricKey}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value) => [formatValue(value as number), getMetricLabel()]}
                        />
                    </PieChart>
                );

            default:
                return null;
        }
    };

    return (
        <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
            {title && (
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
            )}
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    {renderChart()}
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ProjectUsageChart;
