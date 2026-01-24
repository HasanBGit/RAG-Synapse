import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './components/Sidebar';
import ChatMessage from './components/ChatMessage';
import ReferencePanel from './components/ReferencePanel';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/ToastContainer';
import Logo from './components/Logo';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  const [searchingQuery, setSearchingQuery] = useState('');
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('online');
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const fileUploadRef = useRef(null);
  const textareaRef = useRef(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  // Toast management
  const addToast = (message, type = 'info', duration = 5000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Connection status check
  useEffect(() => {
    const checkConnection = async () => {
      try {
        await axios.get(`${API_BASE_URL}/`, { timeout: 3000 });
        setConnectionStatus('online');
      } catch (error) {
        setConnectionStatus('offline');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [API_BASE_URL]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [query]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFileChange = (selectedFile) => {
    if (selectedFile) {
      const fileType = selectedFile.name.split('.').pop().toLowerCase();
      if (['pdf', 'docx', 'doc', 'txt'].includes(fileType)) {
        setFile(selectedFile);
        setUploadStatus('');
      } else {
        setUploadStatus('يرجى اختيار ملف PDF أو DOCX أو TXT.');
        setFile(null);
      }
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus('يرجى اختيار ملف أولاً.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      const successMessage = `تم رفع الملف بنجاح (تم إنشاء ${response.data.chunks_created} جزء)`;
      setUploadStatus(`✓ ${successMessage}`);
      addToast(successMessage, 'success');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Refresh sidebar to show new document
      setSidebarRefresh(prev => prev + 1);
      
      setTimeout(() => {
        setUploadStatus('');
        setUploadProgress(0);
        if (fileUploadRef.current) {
          fileUploadRef.current.close();
        }
      }, 3000);
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message || 'حدث خطأ أثناء رفع الملف';
      setUploadStatus(`✗ خطأ: ${errorMessage}`);
      addToast(errorMessage, 'error');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleChat = async (e) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userMessage = { role: 'user', content: query.trim(), timestamp: new Date() };
    setChatHistory(prev => [...prev, userMessage]);
    const currentQuery = query.trim();
    setQuery('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setLoading(true);
    setSearchingQuery(currentQuery);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/chat`, {
        query: currentQuery,
        top_k: 5,
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.data.answer,
        sources: response.data.sources,
        timestamp: new Date(),
      };
      setChatHistory(prev => [...prev, assistantMessage]);
      setSearchingQuery('');
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message || 'حدث خطأ أثناء معالجة الطلب';
      const errorMessage = {
        role: 'assistant',
        content: `خطأ: ${errorMsg}`,
        sources: [],
        timestamp: new Date(),
      };
      setChatHistory(prev => [...prev, errorMessage]);
      addToast(errorMsg, 'error');
      setSearchingQuery('');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChat(e);
    }
  };

  const handleClearChat = () => {
    if (window.confirm('هل أنت متأكد من مسح جميع الرسائل؟')) {
      setChatHistory([]);
      addToast('تم مسح المحادثة', 'info');
    }
  };

  const handleSourceClick = async (source) => {
    // Set source with text if available
    setSelectedSource({
      ...source,
      text: source.text || 'النص المرجعي غير متوفر',
      last_updated: source.last_updated || new Date().toISOString(),
      section: source.section || 'قسم غير محدد',
      confidence: source.confidence || 'High'
    });
  };

  const handleCloseReference = () => {
    setSelectedSource(null);
  };

  return (
    <ErrorBoundary>
      <div className="App" dir="rtl">
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        
        <header className="app-header">
          <div className="header-logo">
            <Logo size="small" />
          </div>
          <div className="header-controls">
            <div className={`connection-status ${connectionStatus}`} title={connectionStatus === 'online' ? 'متصل' : 'غير متصل'}>
              <span className="connection-dot"></span>
              <span className="connection-text">{connectionStatus === 'online' ? 'متصل' : 'غير متصل'}</span>
            </div>
            {chatHistory.length > 0 && (
              <button 
                className="header-btn clear-chat-btn"
                onClick={handleClearChat}
                aria-label="Clear chat"
                title="مسح المحادثة"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 5H17M7 5V3C7 2.46957 7.21071 1.96086 7.58579 1.58579C7.96086 1.21071 8.46957 1 9 1H11C11.5304 1 12.0391 1.21071 12.4142 1.58579C12.7893 1.96086 13 2.46957 13 3V5M15 5V17C15 17.5304 14.7893 18.0391 14.4142 18.4142C14.0391 18.7893 13.5304 19 13 19H7C6.46957 19 5.96086 18.7893 5.58579 18.4142C5.21071 18.0391 5 17.5304 5 17V5H15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        </header>

      <div className="main-container">
        <Sidebar 
          API_BASE_URL={API_BASE_URL} 
          refreshTrigger={sidebarRefresh}
          onDocumentClick={(doc) => {
            // Could implement document preview or filtering here
            console.log('Document clicked:', doc);
          }}
          onDeleteDocument={(docId) => {
            // Refresh sidebar after deletion
            setSidebarRefresh(prev => prev + 1);
          }}
        />
        
        <div className="chat-area">
          <div className="chat-messages" id="chat-messages">
            {chatHistory.length === 0 ? (
              <div className="empty-state">
                <Logo size="large" className="empty-state-logo" />
                <h3>ابدأ المحادثة</h3>
                <p>ارفع مستنداً واطرح أسئلة حوله!</p>
                <div className="suggested-questions">
                  <h4>أسئلة مقترحة:</h4>
                  <div className="suggested-questions-grid">
                    <button 
                      className="suggested-question"
                      onClick={() => {
                        setQuery('ما هو ملخص هذا المستند؟');
                        textareaRef.current?.focus();
                      }}
                    >
                      ما هو ملخص هذا المستند؟
                    </button>
                    <button 
                      className="suggested-question"
                      onClick={() => {
                        setQuery('ما هي النقاط الرئيسية؟');
                        textareaRef.current?.focus();
                      }}
                    >
                      ما هي النقاط الرئيسية؟
                    </button>
                    <button 
                      className="suggested-question"
                      onClick={() => {
                        setQuery('اشرح المحتوى بالتفصيل');
                        textareaRef.current?.focus();
                      }}
                    >
                      اشرح المحتوى بالتفصيل
                    </button>
                    <button 
                      className="suggested-question"
                      onClick={() => {
                        setQuery('ما هي المعلومات المهمة في هذا المستند؟');
                        textareaRef.current?.focus();
                      }}
                    >
                      ما هي المعلومات المهمة في هذا المستند؟
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              chatHistory.map((message, index) => (
                <ChatMessage 
                  key={message.timestamp ? `${message.timestamp}-${index}` : `msg-${index}`} 
                  message={message}
                  onSourceClick={handleSourceClick}
                />
              ))
            )}
            
            {loading && searchingQuery && (
              <div className="searching-indicator">
                <div className="searching-text">
                  جاري البحث عن: {searchingQuery}...
                </div>
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            
            {loading && !searchingQuery && (
              <div className="message assistant">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  جاري التفكير...
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>
          
          <form onSubmit={handleChat} className="chat-input-form">
            <div className="chat-input-wrapper">
              <button 
                type="button"
                className="attachment-btn"
                onClick={() => fileUploadRef.current?.showModal()}
                aria-label="Upload file"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M18 9V16C18 16.5304 17.7893 17.0391 17.4142 17.4142C17.0391 17.7893 16.5304 18 16 18H4C3.46957 18 2.96086 17.7893 2.58579 17.4142C2.21071 17.0391 2 16.5304 2 16V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M13 6L10 3L7 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 3V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <textarea
                ref={textareaRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="اكتب سؤالك من هنا (Shift+Enter للسطر الجديد)"
                disabled={loading}
                className="chat-input"
                rows={1}
                style={{ resize: 'none', overflow: 'hidden' }}
                aria-label="Chat input"
              />
              <button 
                type="submit" 
                disabled={loading || !query.trim()} 
                className="send-btn"
                aria-label="Send message"
              >
                {loading ? (
                  <span className="spinner-small"></span>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M18 2L9 11M18 2L12 18L9 11M18 2L2 8L9 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
        
        {selectedSource && (
          <ReferencePanel 
            source={selectedSource}
            onClose={handleCloseReference}
          />
        )}
      </div>

      <footer className="app-footer">
        <p>© سِنابس 2026</p>
      </footer>

      {/* File Upload Modal */}
      <dialog ref={fileUploadRef} className="upload-modal">
        <div className="upload-modal-content">
          <button 
            className="modal-close"
            onClick={() => fileUploadRef.current?.close()}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          
          <h2>رفع مستند</h2>
          
          <div 
            className={`upload-area ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              id="file-input"
              type="file"
              onChange={handleFileInputChange}
              accept=".pdf,.docx,.doc,.txt"
              disabled={uploading}
              className="file-input-hidden"
            />
            {!file && !uploading && (
              <div className="upload-placeholder">
                <div className="upload-icon">📎</div>
                <p className="upload-text">
                  <span className="upload-text-main">اسحب وأفلت المستند هنا</span>
                  <span className="upload-text-sub">أو انقر للتصفح</span>
                </p>
                <button 
                  type="button"
                  className="browse-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  تصفح الملفات
                </button>
                <p className="upload-hint">يدعم ملفات PDF و DOCX و TXT</p>
              </div>
            )}
            {file && !uploading && (
              <div className="file-selected">
                <div className="file-info">
                  <span className="file-icon">📄</span>
                  <div className="file-details">
                    <p className="file-name">{file.name}</p>
                    <p className="file-size">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <button 
                  className="remove-file-btn"
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  ✕
                </button>
              </div>
            )}
            {uploading && (
              <div className="upload-progress-container">
                <div className="upload-progress-bar">
                  <div 
                    className="upload-progress-fill"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="upload-progress-text">جاري معالجة المستند... {uploadProgress}%</p>
              </div>
            )}
          </div>
          
          <div className="upload-actions">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="upload-btn"
            >
              {uploading ? (
                <>
                  <span className="spinner"></span>
                  جاري المعالجة...
                </>
              ) : (
                <>
                  <span>📤</span>
                  رفع ومعالجة
                </>
              )}
            </button>
          </div>

          {uploadStatus && (
            <div className={`status ${uploadStatus.startsWith('✓') ? 'success' : 'error'}`}>
              {uploadStatus}
            </div>
          )}
        </div>
      </dialog>
      </div>
    </ErrorBoundary>
  );
}

export default App;
