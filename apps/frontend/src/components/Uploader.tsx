import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

// Types
interface UploadFile {
    id: string;
    file: File;
    progress: number;
    status: 'uploading' | 'processing' | 'completed' | 'failed';
    error?: string;
}

interface UploaderProps {
    onFilesSelected: (files: File[]) => void;
    onFileRemove?: (fileId: string) => void;
    acceptedFileTypes?: Record<string, string[]>;
    maxFileSize?: number;
    maxFiles?: number;
    disabled?: boolean;
    className?: string;
}

const Uploader: React.FC<UploaderProps> = ({
    onFilesSelected,
    onFileRemove,
    acceptedFileTypes = {
        'application/pdf': ['.pdf'],
        'text/plain': ['.txt'],
        'application/msword': ['.doc'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFileSize = 50 * 1024 * 1024, // 50MB
    maxFiles = 10,
    disabled = false,
    className = ''
}) => {
    const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newFiles: UploadFile[] = acceptedFiles.map(file => ({
            id: `file_${Date.now()}_${Math.random()}`,
            file,
            progress: 0,
            status: 'uploading' as const
        }));

        setUploadFiles(prev => [...prev, ...newFiles]);
        onFilesSelected(acceptedFiles);
    }, [onFilesSelected]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: acceptedFileTypes,
        maxSize: maxFileSize,
        maxFiles,
        disabled,
        multiple: true
    });

    const removeFile = (fileId: string) => {
        setUploadFiles(prev => prev.filter(f => f.id !== fileId));
        onFileRemove?.(fileId);
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getStatusIcon = (status: UploadFile['status']) => {
        switch (status) {
            case 'uploading':
            case 'processing':
                return <Loader2 className="w-4 h-4 animate-spin" />;
            case 'completed':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'failed':
                return <AlertCircle className="w-4 h-4 text-red-500" />;
        }
    };

    const getStatusColor = (status: UploadFile['status']) => {
        switch (status) {
            case 'uploading':
                return 'text-blue-600';
            case 'processing':
                return 'text-yellow-600';
            case 'completed':
                return 'text-green-600';
            case 'failed':
                return 'text-red-600';
        }
    };

    return (
        <div className={className}>
            {/* Dropzone */}
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                {isDragActive ? (
                    <p className="text-lg text-blue-600">Drop the files here...</p>
                ) : (
                    <div>
                        <p className="text-lg text-gray-900 mb-2">
                            Drag & drop files here, or click to select
                        </p>
                        <p className="text-sm text-gray-500">
                            Supports PDF, DOC, DOCX, TXT (max {formatFileSize(maxFileSize)} each)
                        </p>
                    </div>
                )}
            </div>

            {/* Upload Progress */}
            {uploadFiles.length > 0 && (
                <div className="mt-6 space-y-3">
                    {uploadFiles.map((file) => (
                        <div key={file.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-3">
                                    <FileText className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{file.file.name}</p>
                                        <div className="flex items-center space-x-2">
                                            {getStatusIcon(file.status)}
                                            <span className={`text-xs font-medium ${getStatusColor(file.status)}`}>
                                                {file.status === 'uploading' && 'Uploading...'}
                                                {file.status === 'processing' && 'Processing...'}
                                                {file.status === 'completed' && 'Completed'}
                                                {file.status === 'failed' && 'Failed'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-500">
                                        {formatFileSize(file.file.size)}
                                    </span>
                                    <button
                                        onClick={() => removeFile(file.id)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all duration-300 ${file.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                                        }`}
                                    style={{ width: `${file.progress}%` }}
                                />
                            </div>

                            {/* Error Message */}
                            {file.error && (
                                <p className="text-xs text-red-600 mt-2">{file.error}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Uploader;
