# RAG Synapse 🧠

A minimal RAG (Retrieval-Augmented Generation) web application built with Python, FastAPI, LangChain, OpenAI API, and Qdrant. Upload documents and ask questions with AI-powered responses backed by your documents.

## Features

- 📄 **Document Upload**: Support for PDF, DOCX, and TXT files
- 🔍 **Intelligent Chunking**: Automatically splits documents into 1000-character chunks with 150-character overlap
- 🧮 **Vector Embeddings**: Uses OpenAI embeddings for semantic search
- 💾 **Vector Storage**: Stores embeddings in Qdrant with metadata (doc_id, file_name, page, chunk_id)
- 💬 **Context-Aware Chat**: Retrieves relevant chunks and generates answers using OpenAI GPT
- 📚 **Inline Citations**: Answers include citations in the format [source:file | page | chunk]
- ✅ **Context-Only Responses**: Refuses to answer when information is not in the uploaded documents
- ⚛️ **React UI**: Simple and intuitive user interface

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│   React UI  │────▶│FastAPI Server│────▶│  Qdrant    │
│  (Frontend) │     │  (Backend)   │     │  Vector DB │
└─────────────┘     └──────────────┘     └────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  OpenAI API  │
                    │  Embeddings  │
                    │  + Chat GPT  │
                    └──────────────┘
```

## Prerequisites

- Python 3.8+
- Node.js 14+
- Docker (for Qdrant)
- OpenAI API key

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/HasanBGit/RAG-Synapse.git
cd RAG-Synapse
```

### 2. Start Qdrant Vector Database

```bash
docker-compose up -d
```

This will start Qdrant on `http://localhost:6333`

### 3. Set Up Backend

#### Install Python Dependencies

```bash
pip install -r requirements.txt
```

#### Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:

```
OPENAI_API_KEY=sk-your-api-key-here
QDRANT_URL=http://localhost:6333
```

#### Run the FastAPI Server

```bash
python main.py
```

The API will be available at `http://localhost:8000`

### 4. Set Up Frontend

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

1. Click "Choose File" and select a PDF, DOCX, or TXT file
2. Click "Upload" to process the document
3. The system will extract text, create chunks, generate embeddings, and store them in Qdrant

### Chat with Your Documents

1. Type a question in the chat input
2. The system will:
   - Retrieve the top 5 most relevant chunks from your documents
   - Send them to OpenAI GPT along with your question
   - Generate an answer with inline citations
3. If the answer is not in your documents, the system will refuse to answer and ask a clarifying question

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
   - OpenAI embeddings (1536 dimensions)
   - Stored in Qdrant with cosine similarity

4. **Metadata**:
   - doc_id: Unique document identifier
   - file_name: Original filename
   - page: Page number (for PDFs)
   - chunk_id: Sequential chunk identifier
   - text: Raw chunk text

### Chat System

1. Query embedding generated using OpenAI
2. Top-k similar chunks retrieved from Qdrant
3. Context assembled with source information
4. Prompt sent to OpenAI GPT-3.5-turbo with strict instructions:
   - Answer ONLY from context
   - Include inline citations
   - Refuse if information not available
5. Response formatted and returned with sources

## Project Structure

```
RAG-Synapse/
├── main.py                 # FastAPI backend
├── requirements.txt        # Python dependencies
├── docker-compose.yml      # Qdrant setup
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore rules
└── frontend/              # React frontend
    ├── package.json       # Node dependencies
    ├── public/
    │   └── index.html
    └── src/
        ├── App.js         # Main React component
        ├── App.css        # Styling
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
- `OPENAI_API_KEY`: Your OpenAI API key
- `QDRANT_URL`: Your Qdrant instance URL
- `REACT_APP_API_URL`: Your backend API URL (for frontend)

## Limitations

- Maximum file size depends on your server configuration
- OpenAI API rate limits apply
- Qdrant storage depends on your setup (local volume or cloud)

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