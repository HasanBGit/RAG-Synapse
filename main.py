import os
import uuid
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tempfile
from dotenv import load_dotenv

# Document processing
import PyPDF2
import docx
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

# Load environment variables
load_dotenv()

app = FastAPI(title="RAG Synapse")

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Restrict to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI and Qdrant
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")

if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY not found in environment variables")

# Set environment variable for OpenAI SDK
os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY

embeddings = OpenAIEmbeddings()
llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)
qdrant_client = QdrantClient(url=QDRANT_URL)

# Collection name
COLLECTION_NAME = "documents"

# Ensure collection exists
try:
    qdrant_client.get_collection(COLLECTION_NAME)
except Exception as e:
    # Create collection if it doesn't exist
    if "not found" in str(e).lower() or "doesn't exist" in str(e).lower():
        qdrant_client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
        )

# Text splitter configuration (1000 chunk size, 150 overlap)
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=150,
    length_function=len,
)


def extract_text_from_pdf(file_path: str) -> List[tuple]:
    """Extract text from PDF with page numbers."""
    texts = []
    with open(file_path, 'rb') as pdf_file:
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        for page_num, page in enumerate(pdf_reader.pages, start=1):
            text = page.extract_text()
            if text.strip():
                texts.append((text, page_num))
    return texts


def extract_text_from_docx(file_path: str) -> List[tuple]:
    """Extract text from DOCX (no page numbers for DOCX)."""
    doc = docx.Document(file_path)
    full_text = []
    for para in doc.paragraphs:
        if para.text.strip():
            full_text.append(para.text)
    text = "\n".join(full_text)
    return [(text, 1)] if text.strip() else []


def extract_text_from_txt(file_path: str) -> List[tuple]:
    """Extract text from TXT file."""
    with open(file_path, 'r', encoding='utf-8') as txt_file:
        text = txt_file.read()
    return [(text, 1)] if text.strip() else []


def extract_text(file_path: str, file_name: str) -> List[tuple]:
    """Extract text based on file extension."""
    extension = file_name.lower().split('.')[-1]
    
    if extension == 'pdf':
        return extract_text_from_pdf(file_path)
    elif extension in ['docx', 'doc']:
        return extract_text_from_docx(file_path)
    elif extension == 'txt':
        return extract_text_from_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type: {extension}")


class ChatRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5


class ChatResponse(BaseModel):
    answer: str
    sources: List[dict]


@app.get("/")
async def root():
    return {"message": "RAG Synapse API", "status": "running"}


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload and process a document (PDF, DOCX, or TXT)."""
    try:
        # Validate file type
        file_extension = file.filename.lower().split('.')[-1]
        if file_extension not in ['pdf', 'docx', 'doc', 'txt']:
            raise HTTPException(status_code=400, detail="Unsupported file type. Only PDF, DOCX, and TXT are supported.")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{file_extension}') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # Extract text with page numbers
            text_pages = extract_text(tmp_file_path, file.filename)
            
            if not text_pages:
                raise HTTPException(status_code=400, detail="No text could be extracted from the document.")
            
            # Generate document ID
            doc_id = str(uuid.uuid4())
            
            # Process each page and create chunks
            all_points = []
            chunk_id = 0
            
            for text, page_num in text_pages:
                # Split text into chunks
                chunks = text_splitter.split_text(text)
                
                for chunk in chunks:
                    # Generate embedding
                    embedding = embeddings.embed_query(chunk)
                    
                    # Create point with metadata
                    point = PointStruct(
                        id=str(uuid.uuid4()),
                        vector=embedding,
                        payload={
                            "doc_id": doc_id,
                            "file_name": file.filename,
                            "page": page_num,
                            "chunk_id": chunk_id,
                            "text": chunk,
                        }
                    )
                    all_points.append(point)
                    chunk_id += 1
            
            # Store in Qdrant
            qdrant_client.upsert(
                collection_name=COLLECTION_NAME,
                points=all_points
            )
            
            return {
                "message": "Document uploaded and processed successfully",
                "doc_id": doc_id,
                "file_name": file.filename,
                "chunks_created": len(all_points)
            }
        
        finally:
            # Clean up temporary file
            os.unlink(tmp_file_path)
    
    except Exception as e:
        # Log the full error for debugging
        print(f"Error in upload endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Error processing document. Please check the file format and try again.")


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat endpoint that retrieves context and generates response with citations."""
    try:
        # Generate query embedding
        query_embedding = embeddings.embed_query(request.query)
        
        # Search in Qdrant
        search_results = qdrant_client.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_embedding,
            limit=request.top_k
        )
        
        if not search_results:
            return ChatResponse(
                answer="I don't have any documents in my knowledge base yet. Please upload some documents first so I can help answer your questions.",
                sources=[]
            )
        
        # Prepare context with sources
        context_parts = []
        sources = []
        
        for idx, result in enumerate(search_results, start=1):
            payload = result.payload
            context_parts.append(
                f"[Source {idx}] (File: {payload['file_name']}, Page: {payload['page']}, Chunk: {payload['chunk_id']})\n{payload['text']}"
            )
            sources.append({
                "file_name": payload['file_name'],
                "page": payload['page'],
                "chunk_id": payload['chunk_id'],
                "score": result.score
            })
        
        context = "\n\n".join(context_parts)
        
        # Create prompt with strict instructions
        prompt = f"""You are a helpful assistant that ONLY answers questions based on the provided context. 

STRICT RULES:
1. You MUST answer ONLY using information from the context below
2. You MUST include inline citations for every fact using the format [source:filename | page X | chunk Y]
3. If the answer is not in the context, you MUST refuse to answer and ask ONE clarifying question
4. Do NOT use any external knowledge or make assumptions

Context:
{context}

User Question: {request.query}

Answer (remember to include citations):"""

        # Get response from OpenAI
        response = llm.invoke(prompt)
        answer = response.content
        
        return ChatResponse(
            answer=answer,
            sources=sources
        )
    
    except Exception as e:
        # Log the full error for debugging
        print(f"Error processing chat request: {str(e)}")
        raise HTTPException(status_code=500, detail="Error processing your request. Please try again.")


@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document and all its chunks from the vector store."""
    try:
        # Search for all points with this doc_id
        # Note: This requires scrolling through the collection
        # For production, consider adding a separate index
        scroll_result = qdrant_client.scroll(
            collection_name=COLLECTION_NAME,
            scroll_filter={
                "must": [
                    {"key": "doc_id", "match": {"value": doc_id}}
                ]
            },
            limit=1000
        )
        
        point_ids = [point.id for point in scroll_result[0]]
        
        if point_ids:
            qdrant_client.delete(
                collection_name=COLLECTION_NAME,
                points_selector=point_ids
            )
            return {"message": f"Deleted {len(point_ids)} chunks for document {doc_id}"}
        else:
            raise HTTPException(status_code=404, detail="Document not found")
    
    except Exception as e:
        # Log the full error for debugging
        print(f"Error deleting document: {str(e)}")
        raise HTTPException(status_code=500, detail="Error deleting document. Please try again.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
