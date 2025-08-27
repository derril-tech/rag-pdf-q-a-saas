import React, { useState } from 'react';
import { FileText, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

// Types
interface Citation {
    id: string;
    documentId: string;
    documentName: string;
    page: number;
    paragraph: number;
    text: string;
    score: number;
}

interface AnswerCitationProps {
    citations: Citation[];
    onViewDocument?: (documentId: string, page: number) => void;
    className?: string;
}

const AnswerCitation: React.FC<AnswerCitationProps> = ({
    citations,
    onViewDocument,
    className = ''
}) => {
    const [showCitations, setShowCitations] = useState(false);

    if (!citations || citations.length === 0) {
        return null;
    }

    return (
        <div className={className}>
            {/* Citations Toggle */}
            <button
                onClick={() => setShowCitations(!showCitations)}
                className="inline-flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 p-2 rounded-md hover:bg-gray-50"
            >
                <FileText className="w-4 h-4" />
                <span>Sources ({citations.length})</span>
                {showCitations ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Citations Panel */}
            {showCitations && (
                <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Sources</h4>
                    <div className="space-y-3">
                        {citations.map((citation) => (
                            <div key={citation.id} className="bg-white border border-gray-200 rounded-lg p-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <FileText className="w-4 h-4 text-gray-500" />
                                            <span className="text-sm font-medium text-gray-900">
                                                {citation.documentName}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                Page {citation.page}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 mb-2">{citation.text}</p>
                                        <div className="flex items-center space-x-3">
                                            {onViewDocument && (
                                                <button
                                                    onClick={() => onViewDocument(citation.documentId, citation.page)}
                                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                                >
                                                    View in document
                                                </button>
                                            )}
                                            <span className="text-xs text-gray-500">
                                                Relevance: {(citation.score * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnswerCitation;
