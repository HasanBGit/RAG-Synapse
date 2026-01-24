# Quick Start Guide 🚀

## Prerequisites

- Python 3.8+
- Node.js 14+
- Hugging Face API key (get a free one at https://huggingface.co/settings/tokens)
- DeepSeek API key (get one at https://platform.deepseek.com)

## Step-by-Step Setup

### 1. Create and Activate Virtual Environment

```bash
# Create virtual environment (already created)
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate

# On Windows:
# venv\Scripts\activate
```

You should see `(venv)` in your terminal prompt when activated.

### 2. Install Python Dependencies

```bash
pip install -r requirements.txt
```

**Note**: 
- No local model download needed - embeddings are generated via Hugging Face Inference API
- Much faster setup and no disk space required for the model

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# Copy the example file
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
- `HF_PROVIDER` is optional - set to "scaleway" or other providers if you have access (default: "default")

### 4. Start the Backend Server

```bash
python main.py
```

The API will be available at `http://localhost:8000`

**Note**: Embeddings are generated via Hugging Face Inference API - no local model download required!

### 5. Start the Frontend (in a new terminal)

```bash
cd frontend
npm install
npm start
```

The UI will open at `http://localhost:3000`

## How to Use

### Upload a Document

1. **Drag and drop** a PDF, DOCX, or TXT file into the upload area, OR click "Browse Files"
2. Click **"Upload & Process"** button
3. Wait for processing (you'll see a progress bar)
4. You'll see a success message with the number of chunks created

### Ask Questions

1. Type your question in the chat input at the bottom
2. Press Enter or click the send button
3. The AI will:
   - Search your documents for relevant information
   - Generate an answer based only on your documents
   - Show sources with page numbers and chunk IDs

### Features

- **Drag & Drop**: Easy file upload
- **Progress Tracking**: See upload progress in real-time
- **Source Citations**: Every answer shows where the information came from
- **Context-Only Answers**: The AI only answers from your uploaded documents

## Troubleshooting

### Hugging Face API Issues

If you encounter API errors:
- Verify your Hugging Face API key is correct in `.env`
- Check your internet connection (API requires internet)
- Ensure your API key has access to the Qwen/Qwen3-Embedding-8B model
- Free tier has rate limits - consider upgrading if you hit limits
- Check API status at: https://status.huggingface.co/

### ChromaDB Issues

If you see ChromaDB errors:
- Delete the `./chroma_db` folder and restart
- Check that you have write permissions in the project directory

### API Errors

If you get API errors:
- Verify your DeepSeek API key is correct in `.env`
- Check your API key has sufficient credits
- Ensure the backend server is running on port 8000

## What's Different from Before?

- ✅ **No Docker needed** - ChromaDB runs locally
- ✅ **No Qdrant** - Using ChromaDB instead
- ✅ **Qwen Embeddings via API** - No local model download, faster setup
- ✅ **DeepSeek Chat** - More cost-effective than OpenAI
- ✅ **Improved UI** - Better forms, drag-and-drop, progress indicators
- ✅ **Hugging Face API** - Free tier available, no model storage needed