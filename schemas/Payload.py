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
    ticket_id: int
    type: int
    email: Optional[str] = None
    message: str
    files: Optional[str] = None
    model_config = {
        "json_schema_extra":{
            "example":{
                "ticket_id":1,
                "type":1,
                "email":"email@example.com",
                "message":"Hola",
                "files":"url1|url2|url3"
            }
        }
    }

class Chat(BaseModel):
    ticket_id: int
    type: int
    model_config = {
        "json_schema_extra":{
            "example":{
                "ticket_id":1,
                "type":1
            }
        }
    }

class TicketChangeStatus(BaseModel):
    ticket_id: int
    type: int
    status: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "ticket_id":1,
                "type":1,
                "status":"closed"
            }
        }
    }