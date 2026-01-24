import uuid
from typing import List
from backend.config import chroma_client, COLLECTION_NAME, get_embedding
from backend.services.document_processor import split_text


def process_and_store_document(file_path: str, file_name: str, upload_timestamp: str = None) -> dict:
    """Process a document and store it in ChromaDB."""
    from backend.services.document_processor import extract_text
    
    # Extract text with page numbers
    text_pages = extract_text(file_path, file_name)
    
    if not text_pages:
        raise ValueError("No text could be extracted from the document.")
    
    # Generate document ID
    doc_id = str(uuid.uuid4())
    
    # Get collection
    collection = chroma_client.get_collection(COLLECTION_NAME)
    
    # Process each page and create chunks
    all_ids = []
    all_embeddings = []
    all_metadatas = []
    all_documents = []
    chunk_id = 0
    
    for text, page_num in text_pages:
        # Split text into chunks
        chunks = split_text(text)
        
        for chunk in chunks:
            # Generate embedding using Hugging Face Inference API (for documents, not a query)
            embedding = get_embedding(chunk, is_query=False)
            
            # Create unique ID for this chunk
            chunk_uuid = str(uuid.uuid4())
            
            all_ids.append(chunk_uuid)
            all_embeddings.append(embedding)
            all_metadatas.append({
                "doc_id": doc_id,
                "file_name": file_name,
                "page": page_num,
                "chunk_id": chunk_id,
                "upload_timestamp": upload_timestamp,
            })
            all_documents.append(chunk)
            chunk_id += 1
    
    # Store in ChromaDB
    collection.add(
        ids=all_ids,
        embeddings=all_embeddings,
        metadatas=all_metadatas,
        documents=all_documents
    )
    
    return {
        "doc_id": doc_id,
        "chunks_created": len(all_ids)
    }


def search_similar_chunks(query_embedding: List[float], top_k: int = 5):
    """Search for similar chunks in ChromaDB."""
    collection = chroma_client.get_collection(COLLECTION_NAME)
    
    # Query ChromaDB
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k
    )
    
    # Format results to match the expected structure
    formatted_results = []
    if results['ids'] and len(results['ids'][0]) > 0:
        for i in range(len(results['ids'][0])):
            result = {
                'id': results['ids'][0][i],
                'score': 1 - results['distances'][0][i] if 'distances' in results else 0.0,  # Convert distance to similarity
                'payload': {
                    'file_name': results['metadatas'][0][i].get('file_name', ''),
                    'page': results['metadatas'][0][i].get('page', 1),
                    'chunk_id': results['metadatas'][0][i].get('chunk_id', 0),
                    'text': results['documents'][0][i] if 'documents' in results else '',
                    'doc_id': results['metadatas'][0][i].get('doc_id', ''),
                }
            }
            formatted_results.append(result)
    
    return formatted_results


def delete_document_chunks(doc_id: str) -> int:
    """Delete all chunks for a document from ChromaDB."""
    collection = chroma_client.get_collection(COLLECTION_NAME)
    
    # Get all documents with this doc_id
    results = collection.get(
        where={"doc_id": {"$eq": doc_id}}
    )
    
    if results['ids'] and len(results['ids']) > 0:
        # Delete all chunks for this document
        collection.delete(ids=results['ids'])
        return len(results['ids'])
    return 0


def get_all_documents():
    """Get all unique documents with their metadata."""
    collection = chroma_client.get_collection(COLLECTION_NAME)
    
    # Get all documents from the collection
    results = collection.get()
    
    if not results['ids'] or len(results['ids']) == 0:
        return []
    
    # Group by doc_id to get unique documents
    documents_map = {}
    
    for i in range(len(results['ids'])):
        metadata = results['metadatas'][i]
        doc_id = metadata.get('doc_id', '')
        file_name = metadata.get('file_name', '')
        upload_timestamp = metadata.get('upload_timestamp', '')
        
        if doc_id and doc_id not in documents_map:
            # Get the first chunk's metadata to extract file info
            # We'll use the first occurrence to get document info
            documents_map[doc_id] = {
                'doc_id': doc_id,
                'file_name': file_name,
                'chunks_count': 0,
                'upload_timestamp': upload_timestamp
            }
        
        if doc_id in documents_map:
            documents_map[doc_id]['chunks_count'] += 1
            # Update timestamp if this chunk has a newer one (shouldn't happen, but just in case)
            if upload_timestamp and (not documents_map[doc_id].get('upload_timestamp') or upload_timestamp < documents_map[doc_id].get('upload_timestamp', '')):
                documents_map[doc_id]['upload_timestamp'] = upload_timestamp
    
    # Convert to list and sort by file_name
    documents_list = list(documents_map.values())
    documents_list.sort(key=lambda x: x['file_name'])
    
    return documents_list
