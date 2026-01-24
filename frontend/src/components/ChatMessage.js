import React, { useState, useMemo } from 'react';
import './ChatMessage.css';
import { parseCitations } from '../utils/citationParser';
import CitationBadge from './CitationBadge';

const ChatMessage = ({ message, onSourceClick }) => {
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  const handleCopy = async () => {
    try {
      if (message && message.content) {
        await navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Parse citations from message content
  const { text: parsedText, citations } = useMemo(() => {
    if (!message?.content) return { text: '', citations: [] };
    return parseCitations(message.content, message.sources || []);
  }, [message?.content, message?.sources]);

  // Render message content with inline citation badges
  const renderMessageContent = () => {
    if (!parsedText) return null;

    const parts = [];
    const badgeRegex = /\[(\d+)\]/g;
    let lastIndex = 0;
    let match;

    while ((match = badgeRegex.exec(parsedText)) !== null) {
      // Add text before the badge
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {parsedText.substring(lastIndex, match.index)}
          </span>
        );
      }

      // Add citation badge
      const citationNumber = parseInt(match[1], 10);
      const citation = citations.find(c => c.number === citationNumber);
      
      parts.push(
        <CitationBadge
          key={`badge-${match.index}`}
          number={citationNumber}
          citation={citation}
          onClick={(cit) => {
            if (cit?.source && onSourceClick) {
              onSourceClick({
                ...cit.source,
                citationNumber: cit.number
              });
            }
          }}
        />
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < parsedText.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {parsedText.substring(lastIndex)}
        </span>
      );
    }

    return parts.length > 0 ? parts : parsedText;
  };

  if (!message || !message.content) {
    return null;
  }

  return (
    <div 
      className={`chat-message ${message.role || 'assistant'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="message-content">
        {renderMessageContent()}
      </div>
      
      {showActions && (
        <div className="message-actions">
          <button
            className="message-action-btn"
            onClick={handleCopy}
            aria-label="Copy message"
            title={copied ? 'تم النسخ!' : 'نسخ'}
          >
            {copied ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13 4L6 11L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="5" y="5" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M5 5V3C5 2.46957 5.21071 1.96086 5.58579 1.58579C5.96086 1.21071 6.46957 1 7 1H11C11.5304 1 12.0391 1.21071 12.4142 1.58579C12.7893 1.96086 13 2.46957 13 3V5" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            )}
          </button>
        </div>
      )}
      
      {message.sources && message.sources.length > 0 && (
        <div className="message-sources">
          <div className="sources-header">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="sources-icon">
              <path d="M8 1L10.5 5.5L15.5 6.5L12 9.5L12.5 14.5L8 12L3.5 14.5L4 9.5L0.5 6.5L5.5 5.5L8 1Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
            <span className="sources-title">المصادر المرجعية</span>
            <span className="sources-count">({message.sources.length})</span>
          </div>
          <div className="sources-list">
            {message.sources.map((source, idx) => {
              // Find corresponding citation number
              const citation = citations.find(c => 
                c.source && 
                c.source.file_name === source.file_name &&
                c.source.page === source.page &&
                c.source.chunk_id === source.chunk_id
              );
              
              return (
                <div 
                  key={source.chunk_id ? `${source.chunk_id}-${idx}` : `source-${idx}`} 
                  className="source-citation"
                  onClick={() => onSourceClick && onSourceClick({
                    ...source,
                    citationNumber: citation?.number
                  })}
                >
                  {citation && (
                    <span className="source-number">[{citation.number}]</span>
                  )}
                  <div className="source-info">
                    <span className="source-file">{source.file_name || 'غير معروف'}</span>
                    <span className="source-meta">
                      <span className="source-page">صفحة {source.page || 'N/A'}</span>
                      {source.score && (
                        <span className="source-score">
                          • صلة: {(source.score * 100).toFixed(0)}%
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {message.timestamp && (
        <div className="message-timestamp">
          {formatTimestamp(message.timestamp)}
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
