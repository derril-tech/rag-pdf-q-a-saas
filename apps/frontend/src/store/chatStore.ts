import { create } from 'zustand';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    citations?: Citation[];
    feedback?: 'positive' | 'negative' | null;
}

interface Citation {
    id: string;
    documentId: string;
    documentName: string;
    page: number;
    paragraph: number;
    text: string;
    score: number;
}

interface Thread {
    id: string;
    title: string;
    projectId: string;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
}

interface ChatState {
    currentThread: Thread | null;
    messages: Message[];
    isStreaming: boolean;
    inputMessage: string;
    selectedDocuments: string[];
    chatHistory: Thread[];
}

interface ChatActions {
    setCurrentThread: (thread: Thread | null) => void;
    addMessage: (message: Message) => void;
    updateMessage: (messageId: string, updates: Partial<Message>) => void;
    removeMessage: (messageId: string) => void;
    setStreaming: (streaming: boolean) => void;
    setInputMessage: (message: string) => void;
    clearInput: () => void;
    setSelectedDocuments: (documentIds: string[]) => void;
    addToChatHistory: (thread: Thread) => void;
    updateChatHistory: (threadId: string, updates: Partial<Thread>) => void;
    removeFromChatHistory: (threadId: string) => void;
    clearChat: () => void;
    setFeedback: (messageId: string, feedback: 'positive' | 'negative') => void;
}

type ChatStore = ChatState & ChatActions;

export const useChatStore = create<ChatStore>((set, get) => ({
    // State
    currentThread: null,
    messages: [],
    isStreaming: false,
    inputMessage: '',
    selectedDocuments: [],
    chatHistory: [],

    // Actions
    setCurrentThread: (thread: Thread | null) => {
        set({ currentThread: thread });
    },

    addMessage: (message: Message) => {
        set(state => ({
            messages: [...state.messages, message]
        }));

        // Update thread if it exists
        if (get().currentThread) {
            const updatedThread = {
                ...get().currentThread!,
                messageCount: get().messages.length + 1,
                updatedAt: new Date().toISOString()
            };
            set({ currentThread: updatedThread });
        }
    },

    updateMessage: (messageId: string, updates: Partial<Message>) => {
        set(state => ({
            messages: state.messages.map(msg =>
                msg.id === messageId ? { ...msg, ...updates } : msg
            )
        }));
    },

    removeMessage: (messageId: string) => {
        set(state => ({
            messages: state.messages.filter(msg => msg.id !== messageId)
        }));
    },

    setStreaming: (streaming: boolean) => {
        set({ isStreaming: streaming });
    },

    setInputMessage: (message: string) => {
        set({ inputMessage: message });
    },

    clearInput: () => {
        set({ inputMessage: '' });
    },

    setSelectedDocuments: (documentIds: string[]) => {
        set({ selectedDocuments: documentIds });
    },

    addToChatHistory: (thread: Thread) => {
        set(state => ({
            chatHistory: [thread, ...state.chatHistory.filter(t => t.id !== thread.id)]
        }));
    },

    updateChatHistory: (threadId: string, updates: Partial<Thread>) => {
        set(state => ({
            chatHistory: state.chatHistory.map(thread =>
                thread.id === threadId ? { ...thread, ...updates } : thread
            )
        }));
    },

    removeFromChatHistory: (threadId: string) => {
        set(state => ({
            chatHistory: state.chatHistory.filter(thread => thread.id !== threadId)
        }));
    },

    clearChat: () => {
        set({
            currentThread: null,
            messages: [],
            isStreaming: false,
            inputMessage: '',
            selectedDocuments: []
        });
    },

    setFeedback: (messageId: string, feedback: 'positive' | 'negative') => {
        set(state => ({
            messages: state.messages.map(msg =>
                msg.id === messageId ? { ...msg, feedback } : msg
            )
        }));
    }
}));
