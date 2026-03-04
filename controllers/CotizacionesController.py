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
    "davana": {"is_busy": False, "timestamp": 0},
    "ddv": {"is_busy": False, "timestamp": 0}
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
                "Error": "Otro usuario está generando una cotización. Por favor espere unos segundos."
            })
        
        # Marcamos como ocupado
        generation_locks[empresa] = {"is_busy": True, "timestamp": time.time()}

    try:
        table_map = {"interlab": "interlab", "davana": "davana", "ddv": "ddv"}
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
        return JSONResponse(status_code=500, content={"Error": str(e)})

async def save_cotizacion(folio: int, file: UploadFile, empresa: str):
    empresa = empresa.lower()
    try:
        # Configuración por empresa
        company_settings = {
            "interlab": {"table": "interlab", "prefix": "InterlabCot"},
            "davana": {"table": "davana", "prefix": "DavanaCot"},
            "ddv": {"table": "ddv", "prefix": "DDVCot"}
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
            return {"message": "Cotización guardada", "url": file_url}
        else:
            return JSONResponse(status_code=500, content={"Error": "Error al guardar en BD"})
            
    except Exception as e:
        return JSONResponse(status_code=500, content={"Error": str(e)})
    finally:
        # Siempre liberar el bloqueo al terminar (éxito o error)
        with lock_mutex:
            generation_locks[empresa] = {"is_busy": False, "timestamp": 0}

def getPN(pn: str):
    # 1. Intentar buscar primero si el identificador es un CÓDIGO en la tabla de códigos
    query_code = "SELECT codigo, descripcion FROM codes WHERE codigo = %s"
    result_code = db.GETDB(query_code, (pn,))
    
    if result_code and len(result_code) > 0:
        code_info = result_code[0]
        # Si es un código, queremos su descripción
        descriptions = [code_info['descripcion'], "", ""]
        
        # Pero intentamos obtener precio y UM de los productos que tengan este código
        query_prod = "SELECT price, um FROM products WHERE codigo = %s"
        result_prods = db.GETDB(query_prod, (pn,))
        
        price = 0.0
        unique_ums = set()
        
        if result_prods and len(result_prods) > 0:
            # Tomamos el precio del primero como referencia (o podrías promediarlos, pero usualmente son iguales para el mismo código)
            price = result_prods[0]['price']
            
            for row in result_prods:
                if row['um']:
                    try:
                        um_data = json.loads(row['um']) if isinstance(row['um'], str) else row['um']
                        # um_data es {"UM": ["PIEZA", "CAJA"]}
                        if isinstance(um_data, dict) and "UM" in um_data:
                            for u in um_data["UM"]:
                                if u: unique_ums.add(u.strip())
                        elif isinstance(um_data, list):
                            for u in um_data:
                                if u: unique_ums.add(u.strip())
                    except: pass
        
        return {
            "descriptions": descriptions,
            "price": price,
            "um": sorted(list(unique_ums))
        }

    # 2. Si no es un código, buscar por PN en la tabla de productos
    query_prod_pn = "SELECT description1, description2, description3, price, um FROM products WHERE pn = %s LIMIT 1"
    result_pn = db.GETDB(query_prod_pn, (pn,))
    
    if result_pn and len(result_pn) > 0:
        row = result_pn[0]
        descriptions = [row['description1'], row['description2'], row['description3']]
        
        um_list = []
        if row['um']:
            try:
                um_data = json.loads(row['um']) if isinstance(row['um'], str) else row['um']
                um_list = um_data.get("UM", []) if isinstance(um_data, dict) else (um_data if isinstance(um_data, list) else [])
            except: pass

        return {
            "descriptions": descriptions,
            "price": row['price'],
            "um": um_list
        }

    return JSONResponse(status_code=404, content={"Error": "Producto o Código no encontrado"})


def getPNs():
    table = "products"
    
    query = f"SELECT pn, codigo FROM {table}"
    result = db.GETDB(query)
    
    if result is not None:
        pns_and_codes = set()
        for row in result:
            if row['pn']:
                pns_and_codes.add(row['pn'])
            if row['codigo']:
                pns_and_codes.add(row['codigo'])
        
        # También incluir códigos que no tengan productos asociados aún
        query_codes = "SELECT codigo FROM codes"
        result_codes = db.GETDB(query_codes)
        if result_codes:
            for row in result_codes:
                if row['codigo']:
                    pns_and_codes.add(row['codigo'])

        return {"pns": sorted(list(pns_and_codes))}
    return JSONResponse(status_code=500, content={"Error": "Error al obtener identificadores"})
