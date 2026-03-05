import boto3
import os
import botocore
from typing import Optional
from datetime import datetime
from fastapi import UploadFile, File, Form
from fastapi.responses import JSONResponse
# Función para subir archivo al ticket por S3
def upload_file(file: Optional[UploadFile] = File(...)):
    try:
        allowed_extensions = {'.pdf', '.jpg', '.jpeg', '.png', '.txt', '.doc', '.docx'}
        file_extension = os.path.splitext(file.filename)[1].lower()
        # 1. Validar archivo
        if not file or not file.filename:
            return JSONResponse(
                status_code=400,
                content={"Error": f"Extensión no permitida. Use: {allowed_extensions}"}
            )
        
        # 2. Validar extensión (opcional, según necesidades)      
        if file_extension not in allowed_extensions:
            return JSONResponse(
                status_code=400,
                content={"Error": f"Extensión no permitida. Use: {allowed_extensions}"}
            )
        
        # 3. Configurar S3 (mejor hacerlo fuera de la función)
        s3_client = boto3.client(
            's3',
            aws_access_key_id=os.getenv("S3_ACCESS_KEY"),
            aws_secret_access_key=os.getenv("S3_SECRET_KEY"),
            region_name=os.getenv("S3_REGION"),
            endpoint_url=os.getenv("S3_ENDPOINT"),
            verify=False  # Solo para desarrollo
        )
        
        bucket = os.getenv("S3_BUCKET")
        
        # 4. Generar nombre con timestamp y sanitizar filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = "".join(c for c in file.filename if c.isalnum() or c in '._- ').rstrip()
        file_name = f"uploads/{timestamp}_{safe_filename}"
        
        # 5. Subir archivo
        try:
            s3_client.upload_fileobj(file.file, bucket, file_name)
        except botocore.exceptions.ClientError as e:
            return JSONResponse(
                status_code=500,
                content={"Error": f"Error al subir archivo a S3: {str(e)}"}
            )
        
        # 6. Generar URL pública (asumiendo que el bucket es público)
        base_url = os.getenv("S3_ENDPOINT").rstrip('/')
        file_url = f"{base_url}/{bucket}/{file_name}"
        
        return JSONResponse(
            status_code=200,
            content={
                "message": "Archivo subido exitosamente",
                "url": file_url
            }
        )
        
    except HTTPException:
        raise  # Re-lanzar excepciones HTTP
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error interno del servidor: {str(e)}"
        )