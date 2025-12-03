from pydantic import BaseModel

class InternalServerError(BaseModel):
    time: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "Error":"Error interno del servidor"
            }
        }
    }

class Login200(BaseModel):
    time: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "message":"Login exitoso",
                "token":"eyJ..."
            }
        }
    }

class Login400(BaseModel):
    time: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "Error":"Credenciales incorrectas"
            }
        }
    }
class GetSerial200(BaseModel):
    time: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "token": "27-...",
                "expires_at": "27-11-2026"
            }
        }
    }
