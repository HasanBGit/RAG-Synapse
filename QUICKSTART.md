# Quick Start Guide

## Prerequisites
- Python 3.8+
- Node.js 14+
- Docker
- OpenAI API key

## Setup (5 minutes)

### 1. Start Qdrant Database
```bash
docker compose up -d
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env and add your OpenAI API key
```

### 3. Start Backend
```bash
pip install -r requirements.txt
python main.py
```
Backend will run on http://localhost:8000

### 4. Start Frontend (in a new terminal)
```bash
cd frontend
npm install
npm start
```
Frontend will run on http://localhost:3000

## Usage

### Upload a Document
1. Click "Choose File" and select a PDF, DOCX, or TXT file
2. Click "Upload"
3. Wait for processing (you'll see a success message with chunk count)

### Ask Questions
1. Type your question in the chat input
2. Press "Send" or hit Enter
3. The AI will respond with:
   - An answer based ONLY on your documents
   - Inline citations showing sources
   - A refusal if the information isn't in your documents

## Example Questions

After uploading a research paper:
- "What is the main conclusion?"
- "What methodology was used?"
- "What are the key findings?"

## Troubleshooting

### "Collection already exists" error
This is normal on subsequent runs. Qdrant persists data in Docker volumes.

### OpenAI API errors
- Check your API key is correct in .env
- Ensure you have API credits available
- Check your internet connection

### Port conflicts
- Backend: Change port in main.py (default: 8000)
- Frontend: Set PORT=3001 npm start (default: 3000)
- Qdrant: Change ports in docker-compose.yml (default: 6333)

## Next Steps

1. Try uploading multiple documents
2. Ask questions that require information from multiple sources
3. Test the citation system
4. Experiment with different document types

## Production Deployment

See the main README.md for production deployment instructions.
