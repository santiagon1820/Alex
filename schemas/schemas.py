from pydantic import BaseModel
from typing import Optional, List

class InternalServerError(BaseModel):
    Error: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "Error":"Error interno del servidor"
            }
        }
    }

class Login400(BaseModel):
    Error: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "Error":"Credenciales incorrectas"
            }
        }
    }

class Login400_Active(BaseModel):
    Error: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "Error":"Ya tienes una sesión activa"
            }
        }
    }

class VerifySession200(BaseModel):
    message: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "message":"Ok"
            }
        }
    }

class VerifySession401(BaseModel):
    Error: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "Error":"Token inválido o expirado"
            }
        }
    }

class GenerateSecret200(BaseModel):
    secret: str
    url: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "secret":"ABCDEFGHIJKLMNOPQRSTUV1234567890",
                "url":"otpauth://totp/username?secret=ABCDEFGHIJKLMNOPQRSTUV1234567890"
            }
        }
    }

class GenerateSecret400(BaseModel):
    Error: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "Error":"El usuario ya tiene 2FA activado"
            }
        }
    }

class GenerateSecret404(BaseModel):
    Error: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "Error":"Usuario no encontrado"
            }
        }
    }

class Verify2FA200(BaseModel):
    message: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "message":"2FA activado exitosamente"
            }
        }
    }

class Verify2FA400(BaseModel):
    Error: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "Error":"Código 2FA incorrecto o expirado"
            }
        }
    }

class Verify2FA400_Secret(BaseModel):
    Error: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "Error":"Primero debes generar un secreto con generate_secret"
            }
        }
    }

class CategoryDelete400(BaseModel):
    Error: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "Error": "No se puede eliminar la categoría porque tiene productos asociados. Reasigna los productos a otra categoría primero."
            }
        }
    }

class CotizacionFolio429(BaseModel):
    Error: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "Error": "Otro usuario está generando una cotización. Por favor espere unos segundos."
            }
        }
    }

class Login200(BaseModel):
    message: str
    token: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "message":"Login exitoso",
                "token":"eyJ..."
            }
        }
    }

class EndDay200(BaseModel):
    message: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "message":"Sesiones cerradas exitosamente"
            }
        }
    }

class EndDay400(BaseModel):
    Error: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "Error": "Contraseña de administrador incorrecta"
            }
        }
    }

class CotizacionFolio200(BaseModel):
    folio: int
    model_config = {
        "json_schema_extra":{
            "example":{
                "folio": 123
            }
        }
    }

class CotizacionSave200(BaseModel):
    status: str
    message: str
    url: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "status": "success",
                "message": "Cotización guardada",
                "url": "https://s3.example.com/bucket/cotizaciones/InterlabCot_123.pdf"
            }
        }
    }

class CotizacionGetPN200(BaseModel):
    descriptions: list[str]
    price: float
    um: list[str]
    model_config = {
        "json_schema_extra":{
            "example":{
                "descriptions": ["Product Description 1", "Product Description 2", "Product Description 3"],
                "price": 100.0,
                "um": ["PZA", "CAJA"]
            }
        }
    }

class CotizacionGetPN404(BaseModel):
    Error: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "Error": "Producto no encontrado"
            }
        }
    }

class CategoryRecord(BaseModel):
    id_category: int
    category: str

class ProductRecord(BaseModel):
    pn: str
    description1: str
    description2: str
    description3: str
    price: float
    um: str
    profile: str
    marca: str
    modelo: str
    category: Optional[int]
    category_name: Optional[str] = None
    stock: int
    precioOC: float

class InventoryMessage200(BaseModel):
    message: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "message": "Operación realizada con éxito"
            }
        }
    }

class ProductPaginationResponse200(BaseModel):
    products: List[ProductRecord]
    total: int
    page: int
    limit: int
    total_pages: int

class CotizacionPNs200(BaseModel):
    pns: list[str]
    model_config = {
        "json_schema_extra":{
            "example":{
                "pns": ["PN001", "PN002", "PN003"]
            }
        }
    }