import { useEffect, useRef, useState } from 'react';
import { realtimeManager } from '../lib/realtime';
import type { ChatMessage, DocumentStatusUpdate } from '../lib/realtime';

interface UseRealtimeOptions {
    autoConnect?: boolean;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: any) => void;
}

export const useRealtime = (options: UseRealtimeOptions = {}) => {
    const { autoConnect = true, onConnect, onDisconnect, onError } = options;
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const callbacksRef = useRef<Map<string, Set<Function>>>(new Map());

    useEffect(() => {
        if (autoConnect) {
            realtimeManager.initialize();
        }

        const handleConnect = () => {
            setIsConnected(true);
            setIsConnecting(false);
            onConnect?.();
        };

        const handleDisconnect = () => {
            setIsConnected(false);
            onDisconnect?.();
        };

        const handleError = (error: any) => {
            setIsConnecting(false);
            onError?.(error);
        };

        realtimeManager.onConnect(handleConnect);
        realtimeManager.onDisconnect(handleDisconnect);
        realtimeManager.onError(handleError);

        return () => {
            // Cleanup callbacks
            callbacksRef.current.clear();
        };
    }, [autoConnect, onConnect, onDisconnect, onError]);

    const subscribeToChat = (threadId: string, callback: (message: ChatMessage) => void) => {
        const key = `chat_${threadId}`;
        if (!callbacksRef.current.has(key)) {
            callbacksRef.current.set(key, new Set());
        }
        callbacksRef.current.get(key)!.add(callback);

        realtimeManager.subscribeToChat(threadId, callback);

        return () => {
            const callbacks = callbacksRef.current.get(key);
            if (callbacks) {
                callbacks.delete(callback);
                if (callbacks.size === 0) {
                    callbacksRef.current.delete(key);
                }
            }
            realtimeManager.unsubscribeFromChat(threadId, callback);
        };
    };

    const subscribeToDocumentStatus = (documentId: string, callback: (update: DocumentStatusUpdate) => void) => {
        const key = `document_${documentId}`;
        if (!callbacksRef.current.has(key)) {
            callbacksRef.current.set(key, new Set());
        }
        callbacksRef.current.get(key)!.add(callback);

        realtimeManager.subscribeToDocumentStatus(documentId, callback);

        return () => {
            const callbacks = callbacksRef.current.get(key);
            if (callbacks) {
                callbacks.delete(callback);
                if (callbacks.size === 0) {
                    callbacksRef.current.delete(key);
                }
            }
        };
    };

    const subscribeToUploadProgress = (callback: (data: any) => void) => {
        const key = 'upload_progress';
        if (!callbacksRef.current.has(key)) {
            callbacksRef.current.set(key, new Set());
        }
        callbacksRef.current.get(key)!.add(callback);

        realtimeManager.subscribeToUploadProgress(callback);

        return () => {
            const callbacks = callbacksRef.current.get(key);
            if (callbacks) {
                callbacks.delete(callback);
                if (callbacks.size === 0) {
                    callbacksRef.current.delete(key);
                }
            }
        };
    };

    const sendChatMessage = (threadId: string, content: string) => {
        realtimeManager.sendChatMessage(threadId, content);
    };

    const connect = () => {
        setIsConnecting(true);
        realtimeManager.initialize();
    };

    const disconnect = () => {
        realtimeManager.disconnect();
        setIsConnected(false);
        setIsConnecting(false);
    };

    return {
        isConnected,
        isConnecting,
        connect,
        disconnect,
        subscribeToChat,
        subscribeToDocumentStatus,
        subscribeToUploadProgress,
        sendChatMessage
    };
};
