import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileType = selectedFile.name.split('.').pop().toLowerCase();
      if (['pdf', 'docx', 'doc', 'txt'].includes(fileType)) {
        setFile(selectedFile);
        setUploadStatus('');
      } else {
        setUploadStatus('Please select a PDF, DOCX, or TXT file.');
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus('Please select a file first.');
      return;
    }

    setUploading(true);
    setUploadStatus('Uploading and processing...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadStatus(`✓ ${response.data.message} (${response.data.chunks_created} chunks created)`);
      setFile(null);
      // Reset file input
      document.getElementById('file-input').value = '';
    } catch (error) {
      setUploadStatus(`✗ Error: ${error.response?.data?.detail || error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleChat = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = { role: 'user', content: query };
    setChatHistory([...chatHistory, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/chat`, {
        query: query,
        top_k: 5,
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.data.answer,
        sources: response.data.sources,
      };
      setChatHistory([...chatHistory, userMessage, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error.response?.data?.detail || error.message}`,
        sources: [],
      };
      setChatHistory([...chatHistory, userMessage, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <h1>🧠 RAG Synapse</h1>
          <p>Upload documents and ask questions</p>
        </header>

        <div className="upload-section">
          <h2>📄 Upload Document</h2>
          <div className="upload-controls">
            <input
              id="file-input"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.docx,.doc,.txt"
              disabled={uploading}
            />
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="upload-btn"
            >
              {uploading ? 'Processing...' : 'Upload'}
            </button>
          </div>
          {uploadStatus && (
            <div className={`status ${uploadStatus.startsWith('✓') ? 'success' : 'error'}`}>
              {uploadStatus}
            </div>
          )}
        </div>

        <div className="chat-section">
          <h2>💬 Chat</h2>
          <div className="chat-container">
            <div className="chat-messages">
              {chatHistory.length === 0 ? (
                <div className="empty-state">
                  Upload a document and start asking questions!
                </div>
              ) : (
                chatHistory.map((message, index) => (
                  <div key={index} className={`message ${message.role}`}>
                    <div className="message-content">
                      {message.content}
                    </div>
                    {message.sources && message.sources.length > 0 && (
                      <div className="sources">
                        <strong>Sources:</strong>
                        <ul>
                          {message.sources.map((source, idx) => (
                            <li key={idx}>
                              {source.file_name} | Page {source.page} | Chunk {source.chunk_id} (Score: {source.score.toFixed(3)})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              )}
              {loading && (
                <div className="message assistant">
                  <div className="message-content typing">
                    Thinking...
                  </div>
                </div>
              )}
            </div>
            <form onSubmit={handleChat} className="chat-input-form">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question about your documents..."
                disabled={loading}
                className="chat-input"
              />
              <button type="submit" disabled={loading || !query.trim()} className="send-btn">
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
