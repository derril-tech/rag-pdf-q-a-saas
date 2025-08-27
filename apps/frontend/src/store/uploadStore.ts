import { create } from 'zustand';

interface UploadFile {
    id: string;
    file: File;
    name: string;
    size: number;
    type: string;
    progress: number;
    status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
    error?: string;
    uploadedAt?: string;
    processedAt?: string;
}

interface UploadState {
    files: UploadFile[];
    isUploading: boolean;
    uploadProgress: number;
    uploadOptions: {
        enableOCR: boolean;
        chunkSize: number;
        overlapSize: number;
    };
}

interface UploadActions {
    addFiles: (files: File[]) => void;
    removeFile: (fileId: string) => void;
    updateFileProgress: (fileId: string, progress: number) => void;
    updateFileStatus: (fileId: string, status: UploadFile['status'], error?: string) => void;
    setUploading: (uploading: boolean) => void;
    setUploadProgress: (progress: number) => void;
    updateUploadOptions: (options: Partial<UploadState['uploadOptions']>) => void;
    clearFiles: () => void;
    resetUpload: () => void;
}

type UploadStore = UploadState & UploadActions;

export const useUploadStore = create<UploadStore>((set, get) => ({
    // State
    files: [],
    isUploading: false,
    uploadProgress: 0,
    uploadOptions: {
        enableOCR: true,
        chunkSize: 1000,
        overlapSize: 200
    },

    // Actions
    addFiles: (files: File[]) => {
        const newUploadFiles: UploadFile[] = files.map(file => ({
            id: `file-${Date.now()}-${Math.random()}`,
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            progress: 0,
            status: 'pending'
        }));

        set(state => ({
            files: [...state.files, ...newUploadFiles]
        }));
    },

    removeFile: (fileId: string) => {
        set(state => ({
            files: state.files.filter(f => f.id !== fileId)
        }));
    },

    updateFileProgress: (fileId: string, progress: number) => {
        set(state => ({
            files: state.files.map(f =>
                f.id === fileId ? { ...f, progress } : f
            )
        }));

        // Update overall upload progress
        const files = get().files;
        const totalProgress = files.reduce((sum, f) => sum + f.progress, 0);
        const avgProgress = files.length > 0 ? totalProgress / files.length : 0;
        set({ uploadProgress: avgProgress });
    },

    updateFileStatus: (fileId: string, status: UploadFile['status'], error?: string) => {
        set(state => ({
            files: state.files.map(f =>
                f.id === fileId ? {
                    ...f,
                    status,
                    error,
                    uploadedAt: status === 'completed' ? new Date().toISOString() : f.uploadedAt,
                    processedAt: status === 'completed' ? new Date().toISOString() : f.processedAt
                } : f
            )
        }));
    },

    setUploading: (uploading: boolean) => {
        set({ isUploading: uploading });
    },

    setUploadProgress: (progress: number) => {
        set({ uploadProgress: progress });
    },

    updateUploadOptions: (options: Partial<UploadState['uploadOptions']>) => {
        set(state => ({
            uploadOptions: {
                ...state.uploadOptions,
                ...options
            }
        }));
    },

    clearFiles: () => {
        set({ files: [] });
    },

    resetUpload: () => {
        set({
            files: [],
            isUploading: false,
            uploadProgress: 0
        });
    }
}));
