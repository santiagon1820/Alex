from fastapi import Depends, HTTPException, Cookie
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import models.db as DB
from dotenv import load_dotenv
import jwt
import os

load_dotenv()

security = HTTPBearer(auto_error=False)

def verify_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    token: Optional[str] = Cookie(None)
):
    # Intentar obtener el token de la cabecera (Bearer) o de la cookie
    final_token = None
    
    if credentials:
        final_token = credentials.credentials
    elif token:
        final_token = token

    if not final_token:
        raise HTTPException(
            status_code=401,
            detail={"Error": "Token inválido o expirado"}
        )
        
    try:
        # Decodificar el token
        payload = jwt.decode(final_token, os.getenv("JWT_SECRET"), algorithms=["HS256"])
        user_id = payload.get("user_id")
        
        # Verificar en la base de datos si la sesión está activa y coincide el token
        query = "SELECT isActive FROM user_sessions WHERE user_id = %s AND token = %s"
        session = DB.GETDB(query, (user_id, final_token))
        
        if not session or session[0]["isActive"] != 1:
            raise HTTPException(
                status_code=401,
                detail={"Error": "Token inválido o expirado"}
            )
            
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail={"Error": "Token inválido o expirado"}
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail={"Error": "Token inválido o expirado"}
        )
    except Exception:
        raise HTTPException(
            status_code=401,
            detail={"Error": "Token inválido o expirado"}
        )

