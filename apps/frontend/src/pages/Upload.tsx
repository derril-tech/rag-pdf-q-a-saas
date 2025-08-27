import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation } from '@tanstack/react-query';
import {
    Upload as UploadIcon,
    FileText,
    X,
    CheckCircle,
    AlertCircle,
    Eye,
    EyeOff,
    Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

// Types
interface UploadProgress {
    fileId: string;
    fileName: string;
    progress: number;
    status: 'uploading' | 'processing' | 'completed' | 'failed';
    error?: string;
}

interface UploadOptions {
    enableOCR: boolean;
    chunkSize: number;
    overlapSize: number;
}

// Upload Component
const Upload: React.FC = () => {
    const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
    const [uploadOptions, setUploadOptions] = useState<UploadOptions>({
        enableOCR: true,
        chunkSize: 1000,
        overlapSize: 200
    });

    // Get presigned URL mutation
    const getPresignedUrlMutation = useMutation({
        mutationFn: async (file: File) => {
            // In a real app, this would call the API to get a presigned URL
            await new Promise(resolve => setTimeout(resolve, 500));
            return {
                uploadUrl: 'https://example.com/presigned-url',
                fileId: `file_${Date.now()}`,
                fields: {
                    key: `uploads/${file.name}`,
                    'Content-Type': file.type
                }
            };
        },
        onError: (error) => {
            toast.error('Failed to get upload URL');
            console.error('Upload URL error:', error);
        }
    });

    // Upload file mutation
    const uploadFileMutation = useMutation({
        mutationFn: async ({ file, presignedData }: { file: File; presignedData: any }) => {
            // In a real app, this would upload to S3 using the presigned URL
            await new Promise(resolve => setTimeout(resolve, 2000));
            return { success: true };
        },
        onError: (error) => {
            toast.error('Upload failed');
            console.error('Upload error:', error);
        }
    });

    // Process file mutation
    const processFileMutation = useMutation({
        mutationFn: async (fileId: string) => {
            // In a real app, this would trigger the ingest worker
            await new Promise(resolve => setTimeout(resolve, 3000));
            return { success: true };
        },
        onError: (error) => {
            toast.error('Processing failed');
            console.error('Processing error:', error);
        }
    });

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        for (const file of acceptedFiles) {
            const fileId = `file_${Date.now()}_${Math.random()}`;

            // Add file to progress tracking
            setUploadProgress(prev => [...prev, {
                fileId,
                fileName: file.name,
                progress: 0,
                status: 'uploading'
            }]);

            try {
                // Step 1: Get presigned URL
                const presignedData = await getPresignedUrlMutation.mutateAsync(file);

                // Step 2: Upload file
                setUploadProgress(prev =>
                    prev.map(p => p.fileId === fileId ? { ...p, progress: 50, status: 'uploading' } : p)
                );

                await uploadFileMutation.mutateAsync({ file, presignedData });

                // Step 3: Start processing
                setUploadProgress(prev =>
                    prev.map(p => p.fileId === fileId ? { ...p, progress: 75, status: 'processing' } : p)
                );

                await processFileMutation.mutateAsync(fileId);

                // Step 4: Complete
                setUploadProgress(prev =>
                    prev.map(p => p.fileId === fileId ? { ...p, progress: 100, status: 'completed' } : p)
                );

                toast.success(`${file.name} uploaded successfully!`);

            } catch (error) {
                setUploadProgress(prev =>
                    prev.map(p => p.fileId === fileId ? {
                        ...p,
                        status: 'failed',
                        error: error instanceof Error ? error.message : 'Upload failed'
                    } : p)
                );
            }
        }
    }, [getPresignedUrlMutation, uploadFileMutation, processFileMutation]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'text/plain': ['.txt'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
        },
        maxSize: 50 * 1024 * 1024, // 50MB
        multiple: true
    });

    const removeFile = (fileId: string) => {
        setUploadProgress(prev => prev.filter(p => p.fileId !== fileId));
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getStatusIcon = (status: UploadProgress['status']) => {
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

    const getStatusColor = (status: UploadProgress['status']) => {
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
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Upload Documents</h1>
                    <p className="text-gray-600 mt-2">
                        Upload your documents to start asking questions
                    </p>
                </div>

                {/* Upload Options */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Options</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* OCR Toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Enable OCR</label>
                                <p className="text-xs text-gray-500">Extract text from scanned documents</p>
                            </div>
                            <button
                                onClick={() => setUploadOptions(prev => ({ ...prev, enableOCR: !prev.enableOCR }))}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${uploadOptions.enableOCR ? 'bg-blue-600' : 'bg-gray-200'
                                    }`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${uploadOptions.enableOCR ? 'translate-x-6' : 'translate-x-1'
                                    }`} />
                            </button>
                        </div>

                        {/* Chunk Size */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Chunk Size (characters)
                            </label>
                            <input
                                type="number"
                                value={uploadOptions.chunkSize}
                                onChange={(e) => setUploadOptions(prev => ({
                                    ...prev,
                                    chunkSize: parseInt(e.target.value) || 1000
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                min="100"
                                max="5000"
                            />
                        </div>

                        {/* Overlap Size */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Overlap Size (characters)
                            </label>
                            <input
                                type="number"
                                value={uploadOptions.overlapSize}
                                onChange={(e) => setUploadOptions(prev => ({
                                    ...prev,
                                    overlapSize: parseInt(e.target.value) || 200
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                min="0"
                                max="1000"
                            />
                        </div>
                    </div>
                </div>

                {/* Upload Area */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${isDragActive
                                ? 'border-blue-400 bg-blue-50'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                    >
                        <input {...getInputProps()} />
                        <UploadIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        {isDragActive ? (
                            <p className="text-lg text-blue-600">Drop the files here...</p>
                        ) : (
                            <div>
                                <p className="text-lg text-gray-900 mb-2">
                                    Drag & drop files here, or click to select
                                </p>
                                <p className="text-sm text-gray-500">
                                    Supports PDF, DOC, DOCX, TXT (max 50MB each)
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Upload Progress */}
                {uploadProgress.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Progress</h2>
                        <div className="space-y-4">
                            {uploadProgress.map((file) => (
                                <div key={file.fileId} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-3">
                                            <FileText className="w-5 h-5 text-gray-400" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{file.fileName}</p>
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
                                        <button
                                            onClick={() => removeFile(file.fileId)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
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
                    </div>
                )}

                {/* Upload Tips */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-sm font-medium text-blue-900 mb-2">Upload Tips</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Supported formats: PDF, DOC, DOCX, TXT</li>
                        <li>• Maximum file size: 50MB per file</li>
                        <li>• Enable OCR for scanned documents to extract text</li>
                        <li>• Larger chunk sizes may improve context but increase processing time</li>
                        <li>• Overlap helps maintain context between chunks</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Upload;
