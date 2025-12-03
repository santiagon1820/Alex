import models.db as DB
import os
import bcrypt
import jwt
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
from dotenv import load_dotenv
from fastapi import Request

# Cargamos variables de entorno
load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_EXPIRES_IN = os.getenv("JWT_EXPIRES_IN")

# Función para hacer un login
def login(username, password):
    try:
        # 1 Verificar que las credenciales sean válidas
        respuesta = DB.GETDB("SELECT id, email, password FROM users WHERE username = %s", (username,))
        if respuesta != []:
            # 2 Generar token de acceso 

            # Tomar primer usuario encontrado
            user = respuesta[0] 
            stored_hashed_password = user["password"]
            # Verificar contraseña
            if bcrypt.checkpw(password.encode("utf-8"), stored_hashed_password.encode("utf-8")):                
                # Generar el Payload para el JWT 
                payload = {
                    "user_id": user["id"],
                    "email": user["email"],
                    "exp": datetime.utcnow() + timedelta(seconds=int(JWT_EXPIRES_IN))
                }   
                # Generar el token con el payload  
                token = jwt.encode(payload, JWT_SECRET, algorithm="HS256") 

                # 3 Guardar la session en la BD

                # Expira en 24 horas

                # Generar fecha de expiracion
                expires_at = datetime.now() + timedelta(hours=24)
                # Insertar en la DB
                DB.POSTDB(
                    "INSERT INTO user_sessions (user_id, token, isActive, expires_at) VALUES (%s, %s, %s, %s)",
                    (user["id"], token, 1, expires_at)
                )
                
                # 4 Crear respuesta con cookie

                # Generar la respuesta
                response = JSONResponse(
                    status_code=200,
                    content={
                        "message": "Login exitoso",
                        "token": token
                    }
                )            
                # Configurar la cookie
                response.set_cookie(
                    key="token",
                    value=token,
                    max_age=int(JWT_EXPIRES_IN),  # Tiempo en segundos
                    expires=int(JWT_EXPIRES_IN),
                    path="/",
                    domain=None,
                    secure=False,  # Cambiar a True en producción con HTTPS
                    httponly=True,  # Importante para seguridad (no accesible desde JavaScript)
                    samesite="lax"
                )
                # Configuración para producción (cuando uses HTTPS)
                # response.set_cookie(
                #     key="token",
                #     value=token,
                #     max_age=int(JWT_EXPIRES_IN),
                #     expires=int(JWT_EXPIRES_IN),
                #     path="/",
                #     domain="tudominio.com",  # Tu dominio específico
                #     secure=True,  # Solo se envía sobre HTTPS
                #     httponly=True,  # No accesible desde JavaScript
                #     samesite="strict"  # Protección contra CSRF
                # )
                return response
            else:
                return JSONResponse(
                    status_code=400,
                    content={
                        "Error": "Credenciales incorrectas"
                    }
                )
        else:
            return JSONResponse(
                status_code=400,
                content={
                    "Error": "Credenciales incorrectas"
                }
            )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "Error": str(e)
            }
        )

# Funcion auxiliar para hasear la contraseña
def hash_password(password):
    ROUNDS = int(os.getenv("ROUNDS"))
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(ROUNDS))

