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

class EndDay200(BaseModel):
    time: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "message":"Sesiones cerradas exitosamente"
            }
        }
    }

class GenerateSecret200(BaseModel):
    time: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "secret":"ABCDEFGHIJKLMNOPQRSTUV1234567890",
                "url":"otpauth://totp/username?secret=ABCDEFGHIJKLMNOPQRSTUV1234567890"
            }
        }
    }

class GenerateSecret404(BaseModel):
    time: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "Error":"Usuario no encontrado"
            }
        }
    }

class GenerateSecret400(BaseModel):
    time: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "Error":"El usuario ya tiene un secreto activado"
            }
        }
    }

class Verify2FA200(BaseModel):
    time: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "message":"Codigo 2FA verificado exitosamente"
            }
        }
    }

class Verify2FA404(BaseModel):
    time: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "Error":"Código 2FA incorrecto o expirado"
            }
        }
    }

class VerifySession200(BaseModel):
    time: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "message":"Ok"
            }
        }
    }

class VerifySession401(BaseModel):
    time: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "Error":"Token inválido o expirado"
            }
        }
    }