from pydantic import BaseModel

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
