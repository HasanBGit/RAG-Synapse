import os
import tempfile
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.services.vector_store import process_and_store_document

router = APIRouter()

# Maximum file size: 50MB
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB in bytes


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload and process a document (PDF, DOCX, or TXT)."""
    try:
        # Validate file type
        if not file.filename:
            raise HTTPException(status_code=400, detail="Filename is required.")
        
        file_extension = file.filename.lower().split('.')[-1]
        if file_extension not in ['pdf', 'docx', 'doc', 'txt']:
            raise HTTPException(
                status_code=400, 
                detail="نوع الملف غير مدعوم. يرجى رفع ملف PDF أو DOCX أو TXT فقط."
            )
        
        # Read file content to check size
        content = await file.read()
        file_size = len(content)
        
        # Validate file size
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"حجم الملف كبير جداً. الحد الأقصى هو 50 ميجابايت. حجم الملف الحالي: {file_size / (1024 * 1024):.2f} ميجابايت."
            )
        
        if file_size == 0:
            raise HTTPException(status_code=400, detail="الملف فارغ. يرجى رفع ملف يحتوي على محتوى.")
        
        # Store upload timestamp
        upload_timestamp = datetime.now().isoformat()
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{file_extension}') as tmp_file:
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # Process and store document with upload timestamp
            result = process_and_store_document(tmp_file_path, file.filename, upload_timestamp)
            
            return {
                "message": "تم رفع ومعالجة المستند بنجاح",
                "doc_id": result["doc_id"],
                "file_name": file.filename,
                "chunks_created": result["chunks_created"],
                "upload_timestamp": upload_timestamp
            }
        
        finally:
            # Clean up temporary file
            os.unlink(tmp_file_path)
    
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Log the full error for debugging
        print(f"Error in upload endpoint: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="حدث خطأ أثناء معالجة المستند. يرجى التحقق من تنسيق الملف والمحاولة مرة أخرى."
        )
