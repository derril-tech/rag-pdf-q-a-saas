import React, { useState } from 'react';
import {
    MessageSquare,
    Send,
    MoreVertical,
    Edit,
    Trash2,
    Reply,
    User,
    Clock
} from 'lucide-react';
import { format } from 'date-fns';

// Types
interface Comment {
    id: string;
    content: string;
    author: {
        id: string;
        name: string;
        avatar?: string;
    };
    createdAt: string;
    updatedAt?: string;
    replies?: Comment[];
    isEdited?: boolean;
}

interface CommentsProps {
    comments: Comment[];
    onAddComment?: (content: string, parentId?: string) => void;
    onEditComment?: (commentId: string, content: string) => void;
    onDeleteComment?: (commentId: string) => void;
    onReplyToComment?: (commentId: string, content: string) => void;
    currentUserId?: string;
    className?: string;
}

// Comment Item Component
interface CommentItemProps {
    comment: Comment;
    onReply?: (commentId: string) => void;
    onEdit?: (commentId: string, content: string) => void;
    onDelete?: (commentId: string) => void;
    currentUserId?: string;
    level?: number;
}

const CommentItem: React.FC<CommentItemProps> = ({
    comment,
    onReply,
    onEdit,
    onDelete,
    currentUserId,
    level = 0
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState('');

    const handleEdit = () => {
        if (editContent.trim()) {
            onEdit?.(comment.id, editContent);
            setIsEditing(false);
        }
    };

    const handleReply = () => {
        if (replyContent.trim()) {
            onReply?.(comment.id);
            setIsReplying(false);
            setReplyContent('');
        }
    };

    const canEdit = currentUserId === comment.author.id;

    return (
        <div className={`${level > 0 ? 'ml-8 border-l-2 border-gray-100 pl-4' : ''}`}>
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
                <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                        {comment.author.avatar ? (
                            <img
                                className="h-8 w-8 rounded-full"
                                src={comment.author.avatar}
                                alt={comment.author.name}
                            />
                        ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                                <User className="w-4 h-4 text-gray-600" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900">
                                    {comment.author.name}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {format(new Date(comment.createdAt), 'MMM dd, yyyy HH:mm')}
                                </span>
                                {comment.isEdited && (
                                    <span className="text-xs text-gray-500">(edited)</span>
                                )}
                            </div>

                            {canEdit && (
                                <div className="flex items-center space-x-1">
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="text-gray-400 hover:text-gray-600 p-1"
                                        title="Edit comment"
                                    >
                                        <Edit className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => onDelete?.(comment.id)}
                                        className="text-gray-400 hover:text-red-600 p-1"
                                        title="Delete comment"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {isEditing ? (
                            <div className="mt-2">
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    rows={3}
                                />
                                <div className="flex items-center space-x-2 mt-2">
                                    <button
                                        onClick={handleEdit}
                                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditing(false);
                                            setEditContent(comment.content);
                                        }}
                                        className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-2">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                            </div>
                        )}

                        <div className="flex items-center space-x-4 mt-3">
                            <button
                                onClick={() => setIsReplying(!isReplying)}
                                className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700"
                            >
                                <Reply className="w-3 h-3" />
                                <span>Reply</span>
                            </button>
                        </div>

                        {isReplying && (
                            <div className="mt-3">
                                <textarea
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    placeholder="Write a reply..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    rows={2}
                                />
                                <div className="flex items-center space-x-2 mt-2">
                                    <button
                                        onClick={handleReply}
                                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                    >
                                        Reply
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsReplying(false);
                                            setReplyContent('');
                                        }}
                                        className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
                <div className="space-y-2">
                    {comment.replies.map((reply) => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            onReply={onReply}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            currentUserId={currentUserId}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const Comments: React.FC<CommentsProps> = ({
    comments,
    onAddComment,
    onEditComment,
    onDeleteComment,
    onReplyToComment,
    currentUserId,
    className = ''
}) => {
    const [newComment, setNewComment] = useState('');

    const handleAddComment = () => {
        if (newComment.trim() && onAddComment) {
            onAddComment(newComment);
            setNewComment('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAddComment();
        }
    };

    return (
        <div className={className}>
            {/* Add Comment */}
            {onAddComment && (
                <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                                <User className="w-4 h-4 text-gray-600" />
                            </div>
                        </div>
                        <div className="flex-1">
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Write a comment..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                rows={3}
                            />
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-gray-500">
                                    Press Enter to send, Shift+Enter for new line
                                </span>
                                <button
                                    onClick={handleAddComment}
                                    disabled={!newComment.trim()}
                                    className="inline-flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send className="w-3 h-3 mr-1" />
                                    Comment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Comments List */}
            <div className="space-y-4">
                {comments.length === 0 ? (
                    <div className="text-center py-8">
                        <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No comments yet</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Be the first to start the conversation.
                        </p>
                    </div>
                ) : (
                    comments.map((comment) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            onReply={onReplyToComment}
                            onEdit={onEditComment}
                            onDelete={onDeleteComment}
                            currentUserId={currentUserId}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default Comments;
