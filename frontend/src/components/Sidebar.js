import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Sidebar.css';

const Sidebar = ({ API_BASE_URL, refreshTrigger, onDocumentClick, onDeleteDocument }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/documents`);
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchDocuments();
  }, [refreshTrigger, fetchDocuments]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('ar-SA', options);
  };

  const handleDocumentClick = (doc) => {
    if (onDocumentClick) {
      onDocumentClick(doc);
    }
  };

  const handleDeleteDocument = async (e, docId) => {
    e.stopPropagation();
    if (!window.confirm('هل أنت متأكد من حذف هذا المستند؟')) {
      return;
    }
    
    setDeletingId(docId);
    try {
      await axios.delete(`${API_BASE_URL}/api/documents/${docId}`);
      // Refresh documents list
      await fetchDocuments();
      if (onDeleteDocument) {
        onDeleteDocument(docId);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('حدث خطأ أثناء حذف المستند');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc && doc.file_name && doc.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <button 
        className="sidebar-toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label="Toggle sidebar"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M4 6L10 10L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      
      {!isCollapsed && (
        <>
          <div className="sidebar-header">
            <div className="database-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="4" width="16" height="4" rx="1" fill="currentColor"/>
                <rect x="4" y="10" width="16" height="4" rx="1" fill="currentColor"/>
                <rect x="4" y="16" width="16" height="4" rx="1" fill="currentColor"/>
              </svg>
            </div>
            <p className="sidebar-instruction">
              اضغط على النتيجة لرؤية ملفات المصادر من هنا
            </p>
          </div>

          {documents.length > 0 && (
            <div className="sidebar-search">
              <input
                type="text"
                placeholder="بحث في المستندات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="sidebar-search-input"
                aria-label="Search documents"
              />
            </div>
          )}
          
          <div className="documents-list">
            {loading ? (
              <>
                <div className="skeleton-loader">
                  <div className="skeleton-line"></div>
                  <div className="skeleton-line"></div>
                </div>
                <div className="skeleton-loader">
                  <div className="skeleton-line"></div>
                  <div className="skeleton-line"></div>
                </div>
                <div className="skeleton-loader">
                  <div className="skeleton-line"></div>
                  <div className="skeleton-line"></div>
                </div>
              </>
            ) : filteredDocuments.length === 0 ? (
              <div className="no-documents">
                {searchQuery ? 'لا توجد نتائج' : 'لا توجد مستندات'}
              </div>
            ) : (
              filteredDocuments.map((doc) => {
                if (!doc || !doc.doc_id) return null;
                return (
                  <div 
                    key={doc.doc_id} 
                    className="document-item"
                    onClick={() => handleDocumentClick(doc)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleDocumentClick(doc);
                      }
                    }}
                    aria-label={`Document: ${doc.file_name || 'Unknown'}`}
                  >
                    <div className="document-link">
                      {doc.file_name || 'مستند بدون اسم'}
                    </div>
                    <div className="document-item-footer">
                      <span className="document-date">
                        آخر تحديث: {formatDate(doc.last_updated)}
                      </span>
                      <button
                        className="document-delete-btn"
                        onClick={(e) => handleDeleteDocument(e, doc.doc_id)}
                        disabled={deletingId === doc.doc_id}
                        aria-label={`Delete ${doc.file_name || 'document'}`}
                        title="حذف المستند"
                      >
                        {deletingId === doc.doc_id ? (
                          <span className="spinner-small"></span>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Sidebar;
