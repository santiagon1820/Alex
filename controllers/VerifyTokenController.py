from fastapi import Depends, HTTPException, Cookie, Response
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
    final_token = None
    if credentials:
        final_token = credentials.credentials
    elif token:
        final_token = token

    if not final_token:
        raise HTTPException(status_code=401, detail={"Error": "Token inválido o expirado"})
        
    try:
        # 1. Intentar decodificar normalmente
        payload = jwt.decode(final_token, os.getenv("JWT_SECRET"), algorithms=["HS256"])
        
        # Si el scope no es el correcto para esta función, NO borramos nada, solo damos error
        if payload.get("scope") != "full":
            raise HTTPException(status_code=401, detail={"Error": "Token inválido o expirado"})

        # 2. Verificar en la base de datos
        user_id = payload.get("user_id")
        query = "SELECT isActive FROM user_sessions WHERE user_id = %s AND token = %s"
        session = DB.GETDB(query, (user_id, final_token))
        
        if not session or session[0]["isActive"] != 1:
            # Es nuestro token pero está inactivo: Limpiamos
            raise HTTPException(
                status_code=401,
                detail={"Error": "Token inválido o expirado", "clear_cookie": True}
            )
            
        return payload

    except jwt.ExpiredSignatureError:
        # Si expiró, verificamos si era de nuestro scope antes de limpiar
        try:
            payload = jwt.decode(final_token, os.getenv("JWT_SECRET"), algorithms=["HS256"], options={"verify_exp": False})
            if payload.get("scope") == "full":
                DB.POSTDB("UPDATE user_sessions SET isActive = 0 WHERE token = %s", (final_token,))
                raise HTTPException(
                    status_code=401,
                    detail={"Error": "Token inválido o expirado", "clear_cookie": True}
                )
        except HTTPException as e: raise e
        except: pass
        raise HTTPException(status_code=401, detail={"Error": "Token inválido o expirado"})
    except HTTPException as e:
        raise e
    except Exception:
        # Error genérico: No sabemos si es nuestro, mejor no borrar nada por si es del otro scope
        raise HTTPException(status_code=401, detail={"Error": "Token inválido o expirado"})

def verify_token_2fa(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    token: Optional[str] = Cookie(None)
):
    final_token = None
    if credentials:
        final_token = credentials.credentials
    elif token:
        final_token = token

    if not final_token:
        raise HTTPException(status_code=401, detail={"Error": "Token inválido o expirado"})
        
    try:
        payload = jwt.decode(final_token, os.getenv("JWT_SECRET"), algorithms=["HS256"])
        
        if payload.get("scope") != "2fa_setup":
            raise HTTPException(status_code=401, detail={"Error": "Token inválido o expirado"})

        user_id = payload.get("user_id")
        query = "SELECT isActive FROM user_sessions WHERE user_id = %s AND token = %s"
        session = DB.GETDB(query, (user_id, final_token))
        
        if not session or session[0]["isActive"] != 1:
            raise HTTPException(
                status_code=401,
                detail={"Error": "Token inválido o expirado", "clear_cookie": True}
            )
            
        return payload
    except jwt.ExpiredSignatureError:
        try:
            payload = jwt.decode(final_token, os.getenv("JWT_SECRET"), algorithms=["HS256"], options={"verify_exp": False})
            if payload.get("scope") == "2fa_setup":
                DB.POSTDB("UPDATE user_sessions SET isActive = 0 WHERE token = %s", (final_token,))
                raise HTTPException(
                    status_code=401,
                    detail={"Error": "Token inválido o expirado", "clear_cookie": True}
                )
        except HTTPException as e: raise e
        except: pass
        raise HTTPException(status_code=401, detail={"Error": "Token inválido o expirado"})
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(status_code=401, detail={"Error": "Token inválido o expirado"})

def check_is_logged_in(
    response: Response,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    token: Optional[str] = Cookie(None)
):
    try:
        final_token = None
        if credentials:
            final_token = credentials.credentials
        elif token:
            final_token = token
        if not final_token: return None
            
        payload = jwt.decode(final_token, os.getenv("JWT_SECRET"), algorithms=["HS256"])
        if payload.get("scope") != "full": return None

        user_id = payload.get("user_id")
        query = "SELECT isActive FROM user_sessions WHERE user_id = %s AND token = %s"
        session = DB.GETDB(query, (user_id, final_token))
        
        if not session or session[0]["isActive"] != 1:
            response.delete_cookie("token", path="/")
            return None
            
        return payload
    except jwt.ExpiredSignatureError:
        try:
            payload = jwt.decode(final_token, os.getenv("JWT_SECRET"), algorithms=["HS256"], options={"verify_exp": False})
            if payload.get("scope") == "full":
                DB.POSTDB("UPDATE user_sessions SET isActive = 0 WHERE token = %s", (final_token,))
                response.delete_cookie("token", path="/")
        except: pass
        return None
    except Exception:
        return None

def check_is_logged_in_2fa(
    response: Response,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    token: Optional[str] = Cookie(None)
):
    try:
        final_token = None
        if credentials:
            final_token = credentials.credentials
        elif token:
            final_token = token
        if not final_token: return None
            
        payload = jwt.decode(final_token, os.getenv("JWT_SECRET"), algorithms=["HS256"])
        if payload.get("scope") != "2fa_setup": return None

        user_id = payload.get("user_id")
        query = "SELECT isActive FROM user_sessions WHERE user_id = %s AND token = %s"
        session = DB.GETDB(query, (user_id, final_token))
        
        if not session or session[0]["isActive"] != 1:
            response.delete_cookie("token", path="/")
            return None
            
        return payload
    except jwt.ExpiredSignatureError:
        try:
            payload = jwt.decode(final_token, os.getenv("JWT_SECRET"), algorithms=["HS256"], options={"verify_exp": False})
            if payload.get("scope") == "2fa_setup":
                DB.POSTDB("UPDATE user_sessions SET isActive = 0 WHERE token = %s", (final_token,))
                response.delete_cookie("token", path="/")
        except: pass
        return None
    except Exception:
        return None
