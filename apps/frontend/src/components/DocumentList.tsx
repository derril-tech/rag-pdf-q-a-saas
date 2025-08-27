import React, { useState } from 'react';
import {
    FileText,
    Search,
    Filter,
    Download,
    Trash2,
    Eye,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    MoreVertical
} from 'lucide-react';
import { format } from 'date-fns';

// Types
interface Document {
    id: string;
    name: string;
    status: 'processing' | 'processed' | 'failed';
    fileSize: number;
    pageCount: number;
    uploadedAt: string;
    processedAt?: string;
    uploadedBy: string;
    fileType: string;
}

interface DocumentListProps {
    documents: Document[];
    onViewDocument?: (documentId: string) => void;
    onDownloadDocument?: (documentId: string) => void;
    onDeleteDocument?: (documentId: string) => void;
    onEditDocument?: (documentId: string) => void;
    loading?: boolean;
    className?: string;
}

// Status Badge Component
interface StatusBadgeProps {
    status: Document['status'];
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const statusConfig = {
        processing: {
            icon: Clock,
            color: 'bg-yellow-100 text-yellow-800',
            text: 'Processing'
        },
        processed: {
            icon: CheckCircle,
            color: 'bg-green-100 text-green-800',
            text: 'Processed'
        },
        failed: {
            icon: XCircle,
            color: 'bg-red-100 text-red-800',
            text: 'Failed'
        }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            <Icon className="w-3 h-3 mr-1" />
            {config.text}
        </span>
    );
};

const DocumentList: React.FC<DocumentListProps> = ({
    documents,
    onViewDocument,
    onDownloadDocument,
    onDeleteDocument,
    onEditDocument,
    loading = false,
    className = ''
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<Document['status'] | 'all'>('all');
    const [sortBy, setSortBy] = useState<'name' | 'uploadedAt' | 'fileSize'>('uploadedAt');

    // Filter and sort documents
    const filteredDocuments = documents
        .filter(doc => {
            const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'uploadedAt':
                    return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
                case 'fileSize':
                    return b.fileSize - a.fileSize;
                default:
                    return 0;
            }
        });

    const formatFileSize = (bytes: number): string => {
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(1)} MB`;
    };

    if (loading) {
        return (
            <div className={`animate-pulse ${className}`}>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-16 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={className}>
            {/* Filters and Search */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search documents..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center space-x-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as Document['status'] | 'all')}
                            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">All Status</option>
                            <option value="processing">Processing</option>
                            <option value="processed">Processed</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>

                    {/* Sort */}
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Sort by:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'name' | 'uploadedAt' | 'fileSize')}
                            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="uploadedAt">Upload Date</option>
                            <option value="name">Name</option>
                            <option value="fileSize">File Size</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Documents List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">
                        Documents ({filteredDocuments.length})
                    </h2>
                </div>

                <div className="divide-y divide-gray-200">
                    {filteredDocuments.map((document) => (
                        <div key={document.id} className="px-6 py-4 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="flex-shrink-0">
                                        <FileText className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                            <h3 className="text-sm font-medium text-gray-900 truncate">
                                                {document.name}
                                            </h3>
                                            <StatusBadge status={document.status} />
                                        </div>
                                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                                            <span>{formatFileSize(document.fileSize)}</span>
                                            <span>{document.pageCount} pages</span>
                                            <span>Uploaded by {document.uploadedBy}</span>
                                            <span>Uploaded {format(new Date(document.uploadedAt), 'MMM dd, yyyy')}</span>
                                            {document.processedAt && (
                                                <span>Processed {format(new Date(document.processedAt), 'MMM dd, yyyy')}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    {onViewDocument && (
                                        <button
                                            onClick={() => onViewDocument(document.id)}
                                            className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                                            title="View document"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    )}
                                    {onDownloadDocument && (
                                        <button
                                            onClick={() => onDownloadDocument(document.id)}
                                            className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                                            title="Download document"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                    )}
                                    {onEditDocument && (
                                        <button
                                            onClick={() => onEditDocument(document.id)}
                                            className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                                            title="Edit document"
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </button>
                                    )}
                                    {onDeleteDocument && (
                                        <button
                                            onClick={() => onDeleteDocument(document.id)}
                                            className="p-2 text-red-400 hover:text-red-600 rounded-md hover:bg-red-50"
                                            title="Delete document"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredDocuments.length === 0 && (
                    <div className="px-6 py-12 text-center">
                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No documents found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {searchTerm || statusFilter !== 'all'
                                ? 'Try adjusting your search or filter criteria.'
                                : 'Get started by uploading your first document.'
                            }
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentList;
