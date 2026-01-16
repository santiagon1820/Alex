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
import controllers.CRONController as CronController
import controllers.TwoFAController as TwoFAController

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
    return AuthController.login(data.username, data.password, data.code)

# Endpoint para comprobar si tiene una sesion abierta y es valida
@app.post(
    "/api/checkSession",
    tags=["Auth"],
    summary="Comprobar si tiene una sesion abierta y es valida",
    responses={
        200: {"model": Schemas.CheckSession200},
        400: {"model": Schemas.CheckSession400},
        500: {"model": Schemas.InternalServerError}
    }
)
def check_session(data: schemasPayload.CheckSession):
    return AuthController.check_session(data.token)

# Endpoint para cerrar todas las sesiones (CRON)
@app.post(
    "/api/endDay",
    tags=["CRON"],
    summary="Cerrar todas las sesiones",
    responses={
        200: {"model": Schemas.EndDay200},
        500: {"model": Schemas.InternalServerError}
    }
)
def endDay(data: schemasPayload.EndDay):
    return CronController.endDay(data.adminPassword)

# Endpoint para generar secreto 2FA
@app.post(
    "/api/generateSecret",
    tags=["2FA"],
    summary="Generar secreto 2FA",
    responses={
        200: {"model": Schemas.GenerateSecret200},
        404: {"model": Schemas.GenerateSecret404},
        400: {"model": Schemas.GenerateSecret400},
        500: {"model": Schemas.InternalServerError}
    }
)
def generateSecret(data: schemasPayload.GenerateSecret):
    return TwoFAController.generate_secret(data.username)

# Endpoint para configurar codigo 2FA
@app.post(
    "/api/config2FA",
    tags=["2FA"],
    summary="Configurar codigo 2FA",
    responses={
        200: {"model": Schemas.Verify2FA200},
        404: {"model": Schemas.Verify2FA404},
        500: {"model": Schemas.InternalServerError}
    }
)
def config2FA(data: schemasPayload.Verify2FA):
    return TwoFAController.config2FA(data.username, data.code)