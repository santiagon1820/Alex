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

class CheckSession(BaseModel):
    token: str
    model_config = {
        "json_schema_extra":{
            "example":{
                "token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwiZXhwIjoxNzM2MTE2NDAwfQ.abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
            }
        }
    }
