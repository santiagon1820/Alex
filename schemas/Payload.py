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
    codigo: str

class Category(BaseModel):
    id_category: Optional[int] = None
    category: str

class Code(BaseModel):
    codigo: str
    descripcion: str

class Ticket(BaseModel):
    email: Optional[str] = "email@example.com"
    type_ticket: int = 1
    subject: str

class TicketJoin(BaseModel):
    ticket_id: int = 1

class SendMessage(BaseModel):
    ticket_id: int = 1
    type: int = 1
    email: Optional[str] = "email@example.com"
    message: str = ""
    files: Optional[str] = "url1|url2|url3"