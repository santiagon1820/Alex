import models.db as db
import os
import boto3
import json
from botocore.exceptions import NoCredentialsError
from fastapi import UploadFile, File, Form
from fastapi.responses import JSONResponse
import urllib3

# Ignorar advertencias de SSL inseguro (solo para este entorno local)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


import threading
import time
from fastapi import UploadFile, File, Form, HTTPException

# Estado global para controlar el flujo: GetFolio -> Render -> Save
# Usamos un diccionario para bloquear por empresa
generation_locks = {
    "interlab": {"is_busy": False, "timestamp": 0},
    "davana": {"is_busy": False, "timestamp": 0}
}
lock_mutex = threading.Lock()
GEN_TIMEOUT = 5 # Máximo 5 segundos por proceso completo

def get_next_folio(empresa: str):
    empresa = empresa.lower()
    with lock_mutex:
        state = generation_locks.get(empresa, {"is_busy": False, "timestamp": 0})
        
        # Si está ocupado y no ha pasado el tiempo límite, rechazamos
        if state["is_busy"] and (time.time() - state["timestamp"] < GEN_TIMEOUT):
            return JSONResponse(status_code=429, content={
                "error": "busy", 
                "message": "Otro usuario está generando una cotización. Por favor espere unos segundos."
            })
        
        # Marcamos como ocupado
        generation_locks[empresa] = {"is_busy": True, "timestamp": time.time()}

    try:
        table_map = {"interlab": "interlab", "davana": "davana"}
        table = table_map.get(empresa, "interlab")
        
        result = db.GETDB(f"SELECT MAX(id) as max_id FROM {table}")
        next_id = 1
        if result and len(result) > 0 and result[0].get('max_id') is not None:
            next_id = int(result[0]['max_id']) + 1
        
        return {"folio": next_id}
    except Exception as e:
        # Si hay error obteniendo el folio, liberamos el bloqueo
        with lock_mutex:
            generation_locks[empresa] = {"is_busy": False, "timestamp": 0}
        return JSONResponse(status_code=500, content={"error": str(e)})

async def save_cotizacion(folio: int, file: UploadFile, empresa: str):
    empresa = empresa.lower()
    try:
        # Configuración por empresa
        company_settings = {
            "interlab": {"table": "interlab", "prefix": "InterlabCot"},
            "davana": {"table": "davana", "prefix": "DavanaCot"}
        }
        
        settings = company_settings.get(empresa, company_settings["interlab"])
        table = settings["table"]
        prefix = settings["prefix"]

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
        file_name = f"cotizaciones/{prefix}_{folio}.pdf"
        
        file.file.seek(0)
        s3_client.upload_fileobj(file.file, bucket, file_name)
        
        base_url = s3_endpoint.rstrip('/')
        file_url = f"{base_url}/{bucket}/{file_name}"
        
        # 2. Guardar en MySQL
        query = f"INSERT INTO {table} (id, pdf) VALUES (%s, %s)"
        params = (folio, file_url)
        
        success = db.POSTDB(query, params)
        
        if success:
            return {"status": "success", "message": "Cotización guardada", "url": file_url}
        else:
            return JSONResponse(status_code=500, content={"status": "error", "message": "Error al guardar en BD"})
            
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})
    finally:
        # Siempre liberar el bloqueo al terminar (éxito o error)
        with lock_mutex:
            generation_locks[empresa] = {"is_busy": False, "timestamp": 0}

def get_product_details(pn: str, empresa: str):
    empresa = empresa.lower()
    table = f"{empresa}Products"
    
    query = f"SELECT description1, description2, description3, price, UM FROM {table} WHERE pn = %s"
    result = db.GETDB(query, (pn,))
    
    if result and len(result) > 0:
        row = result[0]
        # Agrupar descripciones en una lista
        descriptions = [row['description1'], row['description2'], row['description3']]
        # Filtrar descripciones vacías o None si se prefiere, pero el usuario pidió "el listado de 3"
        
        # Procesar UM si viene como string JSON
        um_list = []
        if row['UM']:
            try:
                um_data = row['UM']
                # Si es string, lo parseamos
                if isinstance(um_data, str):
                    um_data = json.loads(um_data)
                
                # Una vez que estamos seguros de que es un dict, extraemos la lista
                if isinstance(um_data, dict):
                    um_list = um_data.get("UM", [])
                elif isinstance(um_data, list):
                    um_list = um_data
            except Exception as e:
                print(f"Error parsing UM JSON: {e}")

        
        return {
            "descriptions": descriptions,
            "price": row['price'],
            "um": um_list
        }
    return JSONResponse(status_code=404, content={"message": "Producto no encontrado"})


def get_all_pns(empresa: str):
    empresa = empresa.lower()
    table = f"{empresa}Products"
    
    query = f"SELECT pn FROM {table}"
    result = db.GETDB(query)
    
    if result is not None:
        pns = [row['pn'] for row in result]
        return {"pns": pns}
    return JSONResponse(status_code=500, content={"message": "Error al obtener PNs"})
