import models.db as db
import os
import boto3
from botocore.exceptions import NoCredentialsError
from fastapi import UploadFile, File, Form
from fastapi.responses import JSONResponse
import urllib3

# Ignorar advertencias de SSL inseguro (solo para este entorno local)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def get_next_folio():
    query = "SELECT MAX(id) as max_id FROM interlab"
    try:
        result = db.GETDB(query)
        
        if result and len(result) > 0 and result[0].get('max_id') is not None:
            return {"folio": int(result[0]['max_id']) + 1}
        else:
            return {"folio": 1} # Empezar en 1 si no hay datos o tabla vacia
    except Exception as e:
        return {"folio": 1, "error": str(e)}

async def save_cotizacion(folio: int, file: UploadFile = File(...)):
    # 1. Guardar en S3 (MinIO)
    s3_endpoint = os.getenv("S3_ENDPOINT")
    s3_client = boto3.client(
        's3',
        aws_access_key_id=os.getenv("S3_ACCESS_KEY"),
        aws_secret_access_key=os.getenv("S3_SECRET_KEY"),
        region_name=os.getenv("S3_REGION"),
        endpoint_url=s3_endpoint,
        verify=False
    )
    
    bucket = os.getenv("S3_BUCKET")
    file_name = f"cotizaciones/InterlabCot_{folio}.pdf"
    
    try:
        file.file.seek(0) # Asegurar que estamos al inicio del archivo
        s3_client.upload_fileobj(file.file, bucket, file_name)
        
        # Generar URL limpia para el endpoint custom
        # Si el endpoint ya incluye el protocolo, lo usamos directamente
        base_url = s3_endpoint.rstrip('/')
        file_url = f"{base_url}/{bucket}/{file_name}"
        
        # 2. Guardar en MySQL
        query = "INSERT INTO interlab (id, pdf) VALUES (%s, %s)"
        params = (folio, file_url)
        
        success = db.POSTDB(query, params)
        
        if success:
            return {"status": "success", "message": "Cotización guardada", "url": file_url}
        else:
            return JSONResponse(status_code=500, content={"status": "error", "message": "Error al guardar en BD"})
            
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})
