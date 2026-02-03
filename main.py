# Importamos librerias que vayamos a utilizar 
from fastapi import FastAPI, Depends
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.requests import Request
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.security import HTTPBearer

# Importar controladores
import controllers.AdminController as AdminController
import controllers.AuthController as AuthController
import controllers.CRONController as CronController
import controllers.TwoFAController as TwoFAController
import controllers.VerifyTokenController as VerifyTokenController
import controllers.CotizacionesController as CotizacionesController


# Importamos schemas
import schemas.Payload as schemasPayload
import schemas.Schemas as Schemas

# Crear app
app = FastAPI(
    title="MgLab",
    version="1.0.0.0",
    description="Intranet de MgLab",
)

# Definir staticos
app.mount("/js", StaticFiles(directory="templates/js"), name="js")
app.mount("/css", StaticFiles(directory="templates/css"), name="css")

# Definimos pagina de 404 y manejo de errores
@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404:
        return FileResponse("templates/404.html", status_code=404)
    
    # Si el detalle es un diccionario (como el que enviamos en verify_token), lo usamos directamente
    content = exc.detail if isinstance(exc.detail, dict) else {"detail": exc.detail}
    
    # Verificar si debemos eliminar la cookie
    if isinstance(content, dict) and content.pop("clear_cookie", None):
        response = JSONResponse(
            status_code=exc.status_code,
            content=content
        )
        response.delete_cookie("token", path="/")
    else:
        response = JSONResponse(
            status_code=exc.status_code,
            content=content
        )
    
    return response

# ----------- FRONTEND ----------- #
@app.get("/", include_in_schema=False)
def read_root(is_logged_in: dict = Depends(VerifyTokenController.check_is_logged_in)):
    if is_logged_in:
        return RedirectResponse(url="/panel", status_code=302)
    return FileResponse("templates/index.html")

@app.get("/login", include_in_schema=False)
def read_login(is_logged_in: dict = Depends(VerifyTokenController.check_is_logged_in)):
    if is_logged_in:
        return RedirectResponse(url="/panel", status_code=302)
    return FileResponse("templates/login.html")

@app.get("/2FA", include_in_schema=False)
def read_2fa(is_logged_in: dict = Depends(VerifyTokenController.check_is_logged_in)):
    if is_logged_in:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/2FA.html")

@app.get("/panel", include_in_schema=False)
def read_panel(is_logged_in: dict = Depends(VerifyTokenController.check_is_logged_in)):
    if not is_logged_in:
        return RedirectResponse(url="/", status_code=302)
    response = FileResponse("templates/panel.html")
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.get("/panel/cotizaciones", include_in_schema=False)
def read_cotizaciones(is_logged_in: dict = Depends(VerifyTokenController.check_is_logged_in)):
    if not is_logged_in:
        return RedirectResponse(url="/", status_code=302)
    response = FileResponse("templates/cotizaciones.html")
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

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
def login(data: schemasPayload.Login, is_logged_in: dict = Depends(VerifyTokenController.check_is_logged_in)):
    if is_logged_in:
        return JSONResponse(
            status_code=400,
            content={"Error": "Ya tienes una sesión activa"}
        )
    return AuthController.login(data.username, data.password, data.code)

# Endpoint para iniciar sesion en el panel para añadir 2FA
@app.post(
    "/api/2FA",
    tags=["Auth"],
    summary="Iniciar sesión para el panel de 2FA",
    responses={
        200: {"model": Schemas.Login200},
        400: {"model": Schemas.Login400},
        500: {"model": Schemas.InternalServerError}
    }
)
def login(data: schemasPayload.Login2FA, is_logged_in: dict = Depends(VerifyTokenController.check_is_logged_in)):
    if is_logged_in:
        return JSONResponse(
            status_code=400,
            content={"Error": "Ya tienes una sesión activa"}
        )
    return AuthController.login2FA(data.username, data.password)

# Endpoint para verificar sesion
@app.get(
    "/api/isLogin",
    tags=["Auth"],
    summary="Verificar sesión",
    responses={
        200: {"model": Schemas.VerifySession200},
        401: {"model": Schemas.VerifySession401},
        500: {"model": Schemas.InternalServerError}
    },
    dependencies=[Depends(VerifyTokenController.verify_token)]
)
def verifySession(token_data: dict = Depends(VerifyTokenController.verify_token)):
    return {
        "message": "Ok"
    }

@app.get(
    "/api/isLogin2FA",
    tags=["Auth"],
    summary="Verificar sesión 2FA",
    responses={
        200: {"model": Schemas.VerifySession200},
        401: {"model": Schemas.VerifySession401},
        500: {"model": Schemas.InternalServerError}
    },
    dependencies=[Depends(VerifyTokenController.verify_token_2fa)]
)
def verifySession2FA(token_data: dict = Depends(VerifyTokenController.verify_token_2fa)):
    return {
        "message": "Ok"
    }

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
        401: {"model": Schemas.VerifySession401},
        500: {"model": Schemas.InternalServerError}
    },
    dependencies=[Depends(VerifyTokenController.verify_token_2fa)]
)
def generateSecret(data: schemasPayload.GenerateSecret, token_data: dict = Depends(VerifyTokenController.verify_token_2fa)):
    username = token_data.get("username") or data.username
    return TwoFAController.generate_secret(username)

# Endpoint para configurar codigo 2FA
@app.post("/api/config2FA", tags=["2FA"])
def config2FA(data: schemasPayload.Verify2FA, token_data: dict = Depends(VerifyTokenController.verify_token_2fa)):
    username = token_data.get("username") or data.username
    return TwoFAController.config2FA(username, data.code)

# ----------- COTIZACIONES ----------- #
@app.get(
    "/api/cotizaciones/folio",
    tags=["Cotizaciones"],
    summary="Obtener siguiente folio",
    responses={
        200: {"model": Schemas.CotizacionFolio200},
        500: {"model": Schemas.InternalServerError}
    }
)
def get_folio(is_logged_in: dict = Depends(VerifyTokenController.check_is_logged_in)):
    if not is_logged_in:
        return JSONResponse(status_code=401, content={"detail": "No autorizado"})
    return CotizacionesController.get_next_folio()

from fastapi import UploadFile, File, Form
@app.post(
    "/api/cotizaciones/save",
    tags=["Cotizaciones"],
    summary="Guardar cotización",
    responses={
        200: {"model": Schemas.CotizacionSave200},
        500: {"model": Schemas.InternalServerError}
    }
)
async def save_cotizacion(
    folio: int = Form(...), 
    file: UploadFile = File(...),
    is_logged_in: dict = Depends(VerifyTokenController.check_is_logged_in)
):
    if not is_logged_in:
        return JSONResponse(status_code=401, content={"detail": "No autorizado"})
    return await CotizacionesController.save_cotizacion(folio, file)
