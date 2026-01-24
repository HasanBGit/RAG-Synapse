# RAG Synapse 🧠

A modern RAG (Retrieval-Augmented Generation) web application built with Python, FastAPI, Qwen3 Embeddings, DeepSeek Chat, and ChromaDB. Upload documents and ask questions with AI-powered responses backed by your documents.

## Features

- 📄 **Document Upload**: Support for PDF, DOCX, and TXT files with drag-and-drop
- 🔍 **Intelligent Chunking**: Automatically splits documents into 1000-character chunks with 150-character overlap
- 🧮 **Vector Embeddings**: Uses Qwen3-Embedding-8B (4096 dimensions) for superior multilingual semantic search
- 💾 **Vector Storage**: Stores embeddings in ChromaDB with metadata (doc_id, file_name, page, chunk_id)
- 💬 **Context-Aware Chat**: Retrieves relevant chunks and generates answers using DeepSeek chat model
- 📚 **Inline Citations**: Answers include citations in the format [source:file | page | chunk]
- ✅ **Context-Only Responses**: Refuses to answer when information is not in the uploaded documents
- ⚛️ **Modern React UI**: Beautiful, user-friendly interface with progress indicators and animations

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│   React UI  │────▶│FastAPI Server│────▶│  ChromaDB  │
│  (Frontend) │     │  (Backend)   │     │  Vector DB │
└─────────────┘     └──────────────┘     └────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Qwen3-8B     │
                    │  Embeddings  │
                    │  + DeepSeek  │
                    │  Chat Model  │
                    └──────────────┘
```

## Prerequisites

- Python 3.8+
- Node.js 14+
- Hugging Face API key (get a free one at https://huggingface.co/settings/tokens)
- DeepSeek API key (get one at https://platform.deepseek.com)

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/HasanBGit/RAG-Synapse.git
cd RAG-Synapse
```

### 2. Set Up Backend

#### Install Python Dependencies

```bash
pip install -r requirements.txt
```

#### Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```
HF_API_KEY=hf_your-huggingface-api-key-here
HF_PROVIDER=default
DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here
CHROMA_DB_PATH=./chroma_db
```

**Note**: 
- Get your free Hugging Face API key at: https://huggingface.co/settings/tokens
- `HF_PROVIDER` is optional - use "scaleway" or other providers if you have access (default: "default")
- Embeddings are generated using Hugging Face Inference API (no local model download needed)
- DeepSeek API key is required for the chat functionality

#### Run the FastAPI Server

```bash
python main.py
```

The API will be available at `http://localhost:8000`

**Note**: Embeddings are generated via Hugging Face Inference API - no local model download required!

### 3. Set Up Frontend

#### Install Node Dependencies

```bash
cd frontend
npm install
```

#### Run the React Development Server

```bash
npm start
```

The UI will be available at `http://localhost:3000`

## Usage

### Upload Documents

1. **Drag and drop** a PDF, DOCX, or TXT file into the upload area, OR click "Browse Files"
2. Click **"Upload & Process"** to process the document
3. Watch the progress bar as the system extracts text, creates chunks, generates embeddings, and stores them in ChromaDB

### Chat with Your Documents

1. Type a question in the chat input at the bottom
2. Press Enter or click the send button
3. The system will:
   - Generate a query embedding using Qwen3-Embedding-8B
   - Retrieve the top 5 most relevant chunks from ChromaDB
   - Send them to DeepSeek chat model along with your question
   - Generate an answer with inline citations
4. If the answer is not in your documents, the system will refuse to answer and ask a clarifying question

### Example Citations

Answers include inline citations like:
```
[source:research_paper.pdf | page 5 | chunk 12]
```

## API Endpoints

### `POST /upload`
Upload a document (PDF, DOCX, or TXT)

**Request:**
- Form data with file

**Response:**
```json
{
  "message": "Document uploaded and processed successfully",
  "doc_id": "uuid",
  "file_name": "document.pdf",
  "chunks_created": 25
}
```

### `POST /chat`
Ask a question and get an answer with citations

**Request:**
```json
{
  "query": "What is the main topic?",
  "top_k": 5
}
```

**Response:**
```json
{
  "answer": "The main topic is... [source:doc.pdf | page 1 | chunk 0]",
  "sources": [
    {
      "file_name": "doc.pdf",
      "page": 1,
      "chunk_id": 0,
      "score": 0.95
    }
  ]
}
```

### `DELETE /documents/{doc_id}`
Delete a document and all its chunks

## Technical Details

### Document Processing

1. **Text Extraction**: 
   - PDF: PyPDF2 extracts text page by page
   - DOCX: python-docx extracts paragraphs
   - TXT: Direct file reading

2. **Chunking**:
   - Uses LangChain's RecursiveCharacterTextSplitter
   - Chunk size: 1000 characters
   - Overlap: 150 characters

3. **Embeddings**:
   - Qwen3-Embedding-8B (4096 dimensions)
   - Generated via Hugging Face Inference API (free tier available)
   - Uses "query" prompt for better retrieval performance on queries
   - Stored in ChromaDB with cosine similarity
   - No local model download required

4. **Metadata**:
   - doc_id: Unique document identifier
   - file_name: Original filename
   - page: Page number (for PDFs)
   - chunk_id: Sequential chunk identifier
   - text: Raw chunk text

### Chat System

1. Query embedding generated using Hugging Face Inference API with Qwen3-Embedding-8B and "query" prompt
2. Top-k similar chunks retrieved from ChromaDB
3. Context assembled with source information
4. Prompt sent to DeepSeek chat model with strict instructions:
   - Answer ONLY from context
   - Include inline citations
   - Refuse if information not available
5. Response formatted and returned with sources

## Project Structure

```
RAG-Synapse/
├── main.py                 # FastAPI backend entry point
├── requirements.txt        # Python dependencies
├── docker-compose.yml      # (No longer needed - ChromaDB runs locally)
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore rules
├── chroma_db/             # ChromaDB data (created automatically)
├── logs/                  # Log files directory
├── backend/               # Backend source code
│   ├── app.py            # FastAPI application
│   ├── config.py         # Configuration (embeddings, LLM, ChromaDB)
│   ├── models.py         # Pydantic models
│   ├── services/         # Business logic
│   │   ├── document_processor.py
│   │   └── vector_store.py
│   └── routes/           # API routes
│       ├── upload.py
│       ├── chat.py
│       └── documents.py
└── frontend/              # React frontend
    ├── package.json       # Node dependencies
    ├── public/
    │   └── index.html
    └── src/
        ├── App.js         # Main React component
        ├── App.css        # Modern styling
        ├── index.js       # React entry point
        └── index.css      # Global styles
```

## Development

### Backend Development

The FastAPI server includes auto-reload:

```bash
uvicorn main:app --reload
```

### Frontend Development

React hot-reload is enabled by default:

```bash
cd frontend
npm start
```

## Production Deployment

### Backend

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Frontend

```bash
cd frontend
npm run build
```

Serve the `frontend/build` directory with a static file server or CDN.

### Environment Variables

Ensure production environment variables are set:
- `DEEPSEEK_API_KEY`: Your DeepSeek API key
- `CHROMA_DB_PATH`: Path to ChromaDB storage (default: ./chroma_db)
- `REACT_APP_API_URL`: Your backend API URL (for frontend)

**Important**: Update CORS settings in `main.py` to match your production frontend URL:
```python
allow_origins=["https://your-frontend-domain.com"]
```

## Limitations

- Maximum file size depends on your server configuration
- DeepSeek API rate limits apply
- Hugging Face Inference API rate limits apply (free tier available)
- ChromaDB storage is local (stored in `./chroma_db` directory)
- Requires internet connection for embedding generation (via Hugging Face API)

## Future Enhancements

- [ ] Multiple document format support (Markdown, HTML)
- [ ] Document management UI (list, view, delete)
- [ ] User authentication
- [ ] Conversation history
- [ ] Advanced search filters
- [ ] Support for other LLM providers
- [ ] Batch document upload

## License

MIT License

## Contributing

Pull requests are welcome! Please ensure your code follows the existing style and includes appropriate tests.

## Support

For issues and questions, please use the GitHub issue tracker.