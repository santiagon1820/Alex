# Importamos librerias que vayamos a utilizar 
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.requests import Request
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.security import HTTPBearer

# Importar archivos necesarios
import schemas.schemas as Schemas
import controllers.AuthController as AuthController

# Importamos schemas
import schemas.Payload as schemasPayload

# Crear app
app = FastAPI(
    title="MgLab",
    version="1.0.0.0",
    description="Intranet de MgLab",
)

# Definir staticos
app.mount("/js", StaticFiles(directory="templates/js"), name="js")
app.mount("/css", StaticFiles(directory="templates/css"), name="css")

# Definimos pagina de 404
@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404:
        return FileResponse("templates/404.html", status_code=404)

# ----------- FRONTEND ----------- #
@app.get("/", include_in_schema=False)
def read_root():
    return FileResponse("templates/index.html")
@app.get("/login", include_in_schema=False)
def read_root():
    return FileResponse("templates/login.html")

# ----------- BACKEND ----------- #
# Endpoint Login
@app.post(
    "/api/login",
    tags=["Auth"],
    summary="Iniciar sesión",
    responses={
        200: {"model": Schemas.Login200},
        400: {"model": Schemas.Login400},
        500: {"model": Schemas.InternalServerError}
    }
)
def login(data: schemasPayload.Login):
    return AuthController.login(data.username, data.password)

# Endpoint GetSerial
@app.get(
    "/api/getSerial",
    tags=["Tools"],
    summary="Obtener serial",
    responses={
        200: {"model": Schemas.GetSerial200},
        500: {"model": Schemas.InternalServerError}
    }
)
def getserial(request: Request):
    return AuthController.generate_device_cookie(request)

# Endpoint RenewSerial
@app.get(
    "/api/renewSerial",
    tags=["Tools"],
    summary="Renovar serial",
    responses={
        200: {"model": Schemas.GetSerial200},
        202: {"model": Schemas.GetSerial200},
        500: {"model": Schemas.InternalServerError}
    }
)
def getserial(request: Request):
    return AuthController.renew_device_cookie(request)