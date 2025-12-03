from pydantic import BaseModel

class Login(BaseModel):
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