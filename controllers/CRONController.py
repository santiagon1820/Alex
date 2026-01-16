import models.db as DB
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv
load_dotenv()

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

def endDay(adminPassword):
    if adminPassword != ADMIN_PASSWORD:
        return JSONResponse(
            status_code=400,
            content={
                "Error": "Credenciales incorrectas"
            }
        )
    try:
        DB.POSTDB(
            "UPDATE user_sessions SET isActive = 0"
        )
        return JSONResponse(
            status_code=200,
            content={
                "message": "Sesiones cerradas exitosamente"
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "Error": str(e)
            }
        )