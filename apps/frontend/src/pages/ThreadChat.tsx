import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Send, 
  Download, 
  Copy, 
  ThumbsUp, 
  ThumbsDown,
  MessageSquare,
  FileText,
  ExternalLink,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import toast from 'react-hot-toast';

// Types
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

// Mock data
const mockThread: Thread = {
  id: 'thread-123',
  title: 'API Documentation Questions',
  projectId: 'project-456',
  createdAt: '2024-01-15T10:30:00Z',
  updatedAt: '2024-01-15T14:45:00Z',
  messageCount: 8
};

const mockMessages: Message[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'How do I authenticate with the API?',
    timestamp: '2024-01-15T10:30:00Z'
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: 'To authenticate with the API, you need to include an API key in the Authorization header. Here\'s how to do it:\n\n```javascript\nconst response = await fetch(\'https://api.example.com/v1/data\', {\n  headers: {\n    \'Authorization\': \'Bearer YOUR_API_KEY\',\n    \'Content-Type\': \'application/json\'\n  }\n});\n```\n\nMake sure to replace `YOUR_API_KEY` with your actual API key. You can generate an API key in your account settings.',
    timestamp: '2024-01-15T10:31:00Z',
    citations: [
      {
        id: 'cite-1',
        documentId: 'doc-123',
        documentName: 'API Documentation.pdf',
        page: 15,
        paragraph: 3,
        text: 'Authentication requires an API key to be included in the Authorization header...',
        score: 0.95
      },
      {
        id: 'cite-2',
        documentId: 'doc-123',
        documentName: 'API Documentation.pdf',
        page: 16,
        paragraph: 1,
        text: 'You can generate API keys in the account settings section...',
        score: 0.87
      }
    ]
  },
  {
    id: 'msg-3',
    role: 'user',
    content: 'What are the rate limits?',
    timestamp: '2024-01-15T10:35:00Z'
  },
  {
    id: 'msg-4',
    role: 'assistant',
    content: 'The API has the following rate limits:\n\n- **Free tier**: 100 requests per hour\n- **Pro tier**: 1,000 requests per hour\n- **Enterprise**: Custom limits\n\nRate limits are applied per API key. If you exceed the limit, you\'ll receive a `429 Too Many Requests` response.',
    timestamp: '2024-01-15T10:36:00Z',
    citations: [
      {
        id: 'cite-3',
        documentId: 'doc-123',
        documentName: 'API Documentation.pdf',
        page: 23,
        paragraph: 2,
        text: 'Rate limits are enforced per API key with different tiers...',
        score: 0.92
      }
    ]
  }
];

// Citation Component
interface CitationProps {
  citation: Citation;
  onViewDocument: (documentId: string, page: number) => void;
}

const Citation: React.FC<CitationProps> = ({ citation, onViewDocument }) => {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-2">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-900">
              {citation.documentName}
            </span>
            <span className="text-xs text-gray-500">
              Page {citation.page}
            </span>
          </div>
          <p className="text-sm text-gray-700 mb-2">{citation.text}</p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onViewDocument(citation.documentId, citation.page)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              View in document
            </button>
            <span className="text-xs text-gray-500">
              Score: {(citation.score * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Message Component
interface MessageProps {
  message: Message;
  onFeedback: (messageId: string, feedback: 'positive' | 'negative') => void;
  onViewDocument: (documentId: string, page: number) => void;
}

const Message: React.FC<MessageProps> = ({ message, onFeedback, onViewDocument }) => {
  const [showCitations, setShowCitations] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`max-w-3xl ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
        <div className={`rounded-lg px-4 py-3 ${
          message.role === 'user' 
            ? 'bg-blue-600 text-white' 
            : 'bg-white border border-gray-200'
        }`}>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={tomorrow}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
        
        {/* Message Actions */}
        <div className={`flex items-center space-x-2 mt-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs text-gray-500">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
          
          {message.role === 'assistant' && (
            <>
              <button
                onClick={() => copyToClipboard(message.content)}
                className="text-gray-400 hover:text-gray-600 p-1"
                title="Copy message"
              >
                <Copy className="w-3 h-3" />
              </button>
              
              {message.citations && message.citations.length > 0 && (
                <button
                  onClick={() => setShowCitations(!showCitations)}
                  className="text-gray-400 hover:text-gray-600 p-1 flex items-center space-x-1"
                  title="Toggle citations"
                >
                  <FileText className="w-3 h-3" />
                  <span className="text-xs">{message.citations.length}</span>
                  {showCitations ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => onFeedback(message.id, 'positive')}
                  className={`p-1 rounded ${
                    message.feedback === 'positive' 
                      ? 'text-green-600 bg-green-50' 
                      : 'text-gray-400 hover:text-green-600'
                  }`}
                  title="Helpful"
                >
                  <ThumbsUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onFeedback(message.id, 'negative')}
                  className={`p-1 rounded ${
                    message.feedback === 'negative' 
                      ? 'text-red-600 bg-red-50' 
                      : 'text-gray-400 hover:text-red-600'
                  }`}
                  title="Not helpful"
                >
                  <ThumbsDown className="w-3 h-3" />
                </button>
              </div>
            </>
          )}
        </div>
        
        {/* Citations Panel */}
        {message.role === 'assistant' && message.citations && showCitations && (
          <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Sources</h4>
            <div className="space-y-2">
              {message.citations.map((citation) => (
                <Citation
                  key={citation.id}
                  citation={citation}
                  onViewDocument={onViewDocument}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Thread Chat Component
const ThreadChat: React.FC = () => {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch thread data
  const { data: thread = mockThread, isLoading: threadLoading } = useQuery({
    queryKey: ['thread', threadId],
    queryFn: async (): Promise<Thread> => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockThread;
    }
  });

  // Fetch messages
  const { data: messages = mockMessages, isLoading: messagesLoading } = useQuery({
    queryKey: ['thread-messages', threadId],
    queryFn: async (): Promise<Message[]> => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      return mockMessages;
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      return {
        id: `msg-${Date.now()}`,
        role: 'assistant' as const,
        content: 'This is a simulated response. In a real implementation, this would be the AI-generated answer with citations.',
        timestamp: new Date().toISOString(),
        citations: [
          {
            id: 'cite-sim',
            documentId: 'doc-123',
            documentName: 'Sample Document.pdf',
            page: 1,
            paragraph: 1,
            text: 'Sample citation text...',
            score: 0.85
          }
        ]
      };
    },
    onSuccess: (newMessage) => {
      queryClient.setQueryData(['thread-messages', threadId], (old: Message[] = []) => [
        ...old,
        newMessage
      ]);
      setIsStreaming(false);
    },
    onError: () => {
      setIsStreaming(false);
      toast.error('Failed to send message');
    }
  });

  // Feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: async ({ messageId, feedback }: { messageId: string; feedback: 'positive' | 'negative' }) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Feedback submitted');
    },
    onError: () => {
      toast.error('Failed to submit feedback');
    }
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async (format: 'markdown' | 'pdf' | 'json') => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        url: 'https://example.com/export.pdf',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
    },
    onSuccess: (data) => {
      window.open(data.url, '_blank');
      toast.success('Export started');
    },
    onError: () => {
      toast.error('Failed to export');
    }
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle send message
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isStreaming) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    // Add user message immediately
    queryClient.setQueryData(['thread-messages', threadId], (old: Message[] = []) => [
      ...old,
      userMessage
    ]);

    setInputMessage('');
    setIsStreaming(true);

    // Send to API
    await sendMessageMutation.mutateAsync(inputMessage);
  };

  // Handle feedback
  const handleFeedback = (messageId: string, feedback: 'positive' | 'negative') => {
    feedbackMutation.mutate({ messageId, feedback });
    
    // Update local state
    queryClient.setQueryData(['thread-messages', threadId], (old: Message[] = []) =>
      old.map(msg => 
        msg.id === messageId 
          ? { ...msg, feedback } 
          : msg
      )
    );
  };

  // Handle view document
  const handleViewDocument = (documentId: string, page: number) => {
    // In a real app, this would navigate to the document viewer
    toast.info(`Viewing document ${documentId} at page ${page}`);
  };

  // Handle export
  const handleExport = (format: 'markdown' | 'pdf' | 'json') => {
    exportMutation.mutate(format);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (threadLoading || messagesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading thread...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/documents')}
              className="text-gray-400 hover:text-gray-600"
            >
              ← Back to Documents
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{thread.title}</h1>
              <p className="text-sm text-gray-500">
                {thread.messageCount} messages • Created {new Date(thread.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="relative">
              <button
                onClick={() => handleExport('markdown')}
                disabled={exportMutation.isLoading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="max-w-4xl mx-auto">
            {messages.map((message) => (
              <Message
                key={message.id}
                message={message}
                onFeedback={handleFeedback}
                onViewDocument={handleViewDocument}
              />
            ))}
            
            {/* Streaming indicator */}
            {isStreaming && (
              <div className="flex justify-start mb-6">
                <div className="max-w-3xl">
                  <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-gray-600">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end space-x-4">
              <div className="flex-1">
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask a question about your documents..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={1}
                  disabled={isStreaming}
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isStreaming}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreadChat;
