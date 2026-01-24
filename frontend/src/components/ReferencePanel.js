import React from 'react';
import './ReferencePanel.css';

const ReferencePanel = ({ source, onClose }) => {
  if (!source) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('ar-SA', options);
  };

  return (
    <div className="reference-panel">
      <button className="reference-close" onClick={onClose} aria-label="Close">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      
      <div className="reference-content" dir="rtl">
        <div className="reference-header">
          <div className="reference-doc-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="reference-header-text">
            <div className="reference-doc-name">{source.file_name}</div>
            {source.citationNumber && (
              <div className="reference-citation-badge">
                المرجع [{source.citationNumber}]
              </div>
            )}
          </div>
        </div>
        
        <div className="reference-meta">
          <div className="reference-meta-item">
            <span className="reference-meta-label">الصفحة -</span>
            <span className="reference-meta-value">{source.page}</span>
          </div>
          {source.chunk_id !== undefined && (
            <div className="reference-meta-item">
              <span className="reference-meta-label">الجزء -</span>
              <span className="reference-meta-value">{source.chunk_id}</span>
            </div>
          )}
          {source.score && (
            <div className="reference-meta-item">
              <span className="reference-meta-label">مستوى الصلة -</span>
              <span className="reference-meta-value score">
                {(source.score * 100).toFixed(1)}%
              </span>
            </div>
          )}
          {source.last_updated && (
            <div className="reference-meta-item">
              <span className="reference-meta-label">آخر وقت لتحديث الملف:</span>
              <span className="reference-meta-value">{formatDate(source.last_updated)}</span>
            </div>
          )}
        </div>
        
        <div className="reference-note">
          تم إنشاء هذه الإجابة بالاعتماد على مستندات داخلية معتمدة.
        </div>
        
        <div className="reference-section">
          <h3 className="reference-section-title">الفقرة المرجعية</h3>
          <div className="reference-text">
            {source.text || 'النص المرجعي غير متوفر'}
          </div>
        </div>
        
        {source.section && (
          <div className="reference-tags">
            <span className="reference-tag">{source.section}</span>
            {source.confidence && (
              <span className="reference-tag confidence">
                مستوى الثقة: {source.confidence}
              </span>
            )}
          </div>
        )}
        
        <div className="reference-actions">
          <button 
            className="reference-btn"
            onClick={() => {
              // Open document in new window/tab or modal
              window.open(`/api/documents/${source.doc_id || source.file_name}`, '_blank');
            }}
            aria-label="Read file"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1V15M1 8H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            قراءة الملف
          </button>
          <button 
            className="reference-btn"
            onClick={async () => {
              try {
                // Download file - in a real app, this would fetch the actual file
                const blob = new Blob([source.text || ''], { type: 'text/plain' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${source.file_name || 'document'}.txt`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
              } catch (error) {
                console.error('Download failed:', error);
              }
            }}
            aria-label="Download file"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 10V14C14 14.5304 13.7893 15.0391 13.4142 15.4142C13.0391 15.7893 12.5304 16 12 16H4C3.46957 16 2.96086 15.7893 2.58579 15.4142C2.21071 15.0391 2 14.5304 2 14V10M5 6L8 3M8 3L11 6M8 3V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            تحميل الملف
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReferencePanel;
