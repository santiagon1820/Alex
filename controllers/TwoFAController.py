import models.db as DB
import pyotp
from fastapi.responses import JSONResponse

# Funcion para generar secreto 2FA
def generate_secret(username):
    try:
        # Obtener ID del usuario
        user_id_result = DB.GETDB("SELECT id FROM users WHERE username = %s", (username,))
        
        if not user_id_result:
            return JSONResponse(
                status_code=404,
                content={"Error": "Usuario no encontrado"}
            )
        
        user_id = user_id_result[0]["id"]
        
        # Verificar si el usuario ya tiene un secreto activado
        secret_result = DB.GETDB(
            "SELECT challenge, isEnabled FROM TOTP WHERE id_user = %s",
            (user_id,)
        )
        
        if secret_result and secret_result[0].get("isEnabled") == 1:
            return JSONResponse(
                status_code=400,
                content={"Error": "El usuario ya tiene 2FA activado"}
            )
        
        # Generar nuevo secreto
        secret = pyotp.random_base32()
        
        if secret_result:
            # Actualizar secreto existente (deshabilitado)
            DB.POSTDB(
                "UPDATE TOTP SET challenge = %s, isEnabled = 0 WHERE id_user = %s",
                (secret, user_id)
            )
        else:
            # Insertar nuevo secreto
            DB.POSTDB(
                "INSERT INTO TOTP (id_user, challenge, isEnabled) VALUES (%s, %s, 0)",
                (user_id, secret)
            )
        
        # Generar URL para QR code (opcional pero útil)
        provisioning_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=username,
            issuer_name="MGLab"  # Cambia esto por el nombre de tu app
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "secret": secret,
                "url": provisioning_uri
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"Error": f"Error interno del servidor: {str(e)}"}
        )

# Funcion para configurar codigo 2FA
def config2FA(username, code):
    try:
        # Obtener ID del usuario
        user_id_result = DB.GETDB("SELECT id FROM users WHERE username = %s", (username,))
        
        if not user_id_result:
            return JSONResponse(
                status_code=404,
                content={"Error": "Usuario no encontrado"}
            )
        
        user_id = user_id_result[0]["id"]
        
        # Verificar si ya tiene 2FA activado
        secret_result = DB.GETDB(
            "SELECT challenge, isEnabled FROM TOTP WHERE id_user = %s",
            (user_id,)
        )
        
        if not secret_result:
            return JSONResponse(
                status_code=400,
                content={"Error": "Primero debes generar un secreto con generate_secret"}
            )
        
        if secret_result[0].get("isEnabled") == 1:
            return JSONResponse(
                status_code=400,
                content={"Error": "El usuario ya tiene 2FA activado"}
            )
        
        # Verificar el código
        secret = secret_result[0]["challenge"]
        totp = pyotp.TOTP(secret)
        
        # Validar código (con margen de tiempo)
        if totp.verify(code, valid_window=1):
            # Activar 2FA
            DB.POSTDB(
                "UPDATE TOTP SET isEnabled = 1 WHERE id_user = %s",
                (user_id,)
            )
            
            return JSONResponse(
                status_code=200,
                content={
                    "message": "2FA activado exitosamente"
                }
            )
        else:
            return JSONResponse(
                status_code=400,
                content={"Error": "Código 2FA incorrecto o expirado"}
            )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"Error": f"Error interno del servidor: {str(e)}"}
        )

# Funcion auxiliar para verificar codigo 2FA
def verify_code(username, code):
    try:
        # Obtener ID del usuario
        user_id_result = DB.GETDB("SELECT id FROM users WHERE username = %s", (username,))
        
        if not user_id_result:
            return False
        
        user_id = user_id_result[0]["id"]
        
        # Obtener secreto activado del usuario
        secret_result = DB.GETDB(
            "SELECT challenge FROM TOTP WHERE id_user = %s AND isEnabled = 1",
            (user_id,)
        )
        
        if not secret_result:
            return False
        
        secret = secret_result[0]["challenge"]
        
        # Verificar código con margen de tiempo
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=1)
        
    except Exception:
        return False