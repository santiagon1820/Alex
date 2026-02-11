from pydantic import BaseModel
from typing import Optional

class Login(BaseModel):
    username: str
    password: str
    code: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "username":"admin",
                "password":"admin",
                "code":"123456"
            }
        }
    }

class Login2FA(BaseModel):
    username: str
    password: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "username":"admin",
                "password":"admin"
            }
        }
    }

class EndDay(BaseModel):
    adminPassword: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "adminPassword":"admin"
            }
        }
    }

class GenerateSecret(BaseModel):
    username: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "username":"admin"
            }
        }
    }

class Verify2FA(BaseModel):
    username: str
    code: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "username":"admin",
                "code":"123456"
            }
        }
    }

class Product(BaseModel):
    pn: str
    original_pn: Optional[str] = None
    description1: str
    description2: Optional[str] = ""
    description3: Optional[str] = ""
    price: float = 0.0
    um: str
    profile: Optional[str] = ""
    marca: Optional[str] = ""
    modelo: Optional[str] = ""
    category: Optional[int] = 1
    stock: int = 0
    precioOC: float = 0.0

class Category(BaseModel):
    id_category: Optional[int] = None
    category: str
