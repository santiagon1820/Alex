# Importamos librerias que vayamos a utilizar 
from fastapi import FastAPI, Depends, Cookie, Form, File, UploadFile
from typing import List
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
import controllers.ProductsController as ProductsController
import controllers.PermissionsController as PermissionsController
import controllers.TicketsController as TicketsController
import controllers.UploadsController as UploadsController
import controllers.GmailController as GmailController
import controllers.NotificationsController as NotificationsController

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
    
    # Verificar permisos
    if not PermissionsController.has_permission(is_logged_in.get("type", 0), "/panel/cotizaciones"):
        return RedirectResponse(url="/panel", status_code=302)

    response = FileResponse("templates/cotizaciones.html")
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.get("/panel/productos", include_in_schema=False)
def read_productos(is_logged_in: dict = Depends(VerifyTokenController.check_is_logged_in)):
    if not is_logged_in:
        return RedirectResponse(url="/", status_code=302)

    # Verificar permisos
    if not PermissionsController.has_permission(is_logged_in.get("type", 0), "/panel/productos"):
        return RedirectResponse(url="/panel", status_code=302)

    response = FileResponse("templates/productos.html")
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.get("/panel/seguimiento", include_in_schema=False)
def read_seguimiento(is_logged_in: dict = Depends(VerifyTokenController.check_is_logged_in)):
    if not is_logged_in:
        return RedirectResponse(url="/", status_code=302)

    # Verificar permisos
    if not PermissionsController.has_permission(is_logged_in.get("type", 0), "/panel/seguimiento"):
        return RedirectResponse(url="/panel", status_code=302)

    response = FileResponse("templates/seguimiento.html")
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.get("/tickets", include_in_schema=False)
def read_tickets(is_logged_in: dict = Depends(VerifyTokenController.check_is_logged_in)):
    if not is_logged_in:
        return RedirectResponse(url="/login", status_code=302)

    user_type = is_logged_in.get("type", 0)

    # Si no tiene permiso de admin, lo mandamos directo a /tickets/usuario
    if not PermissionsController.has_permission(user_type, "/tickets/admin"):
        return RedirectResponse(url="/tickets/usuario", status_code=302)

    # Si llegó aquí es porque sí es admin o tiene permiso
    response = FileResponse("templates/tickets.html")
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.get("/tickets/usuario", include_in_schema=False)
def read_tickets_user(is_logged_in: dict = Depends(VerifyTokenController.check_is_logged_in)):
    if not is_logged_in:
        return RedirectResponse(url="/login", status_code=302)

    # Verificar permisos
    if not PermissionsController.has_permission(is_logged_in.get("type", 0), "/tickets/usuario"):
        return RedirectResponse(url="/tickets", status_code=302)

    response = FileResponse("templates/tickets_user.html")
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.get("/tickets/admin", include_in_schema=False)
def read_tickets_admin(is_logged_in: dict = Depends(VerifyTokenController.check_is_logged_in)):
    if not is_logged_in:
        return RedirectResponse(url="/login", status_code=302)

    # Verificar permisos
    if not PermissionsController.has_permission(is_logged_in.get("type", 0), "/tickets/admin"):
        return RedirectResponse(url="/tickets", status_code=302)

    response = FileResponse("templates/tickets_admin.html")
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.get("/panel/garantias", include_in_schema=False)
def read_panel_garantias(is_logged_in: dict = Depends(VerifyTokenController.check_is_logged_in)):
    if not is_logged_in:
        return RedirectResponse(url="/login", status_code=302)

    # Verificar permisos
    if not PermissionsController.has_permission(is_logged_in.get("type", 0), "/panel/garantias"):
        return RedirectResponse(url="/panel", status_code=302)

    response = FileResponse("templates/garantias_admin.html")
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.get("/panel/OC", include_in_schema=False)
def read_panel_OC(is_logged_in: dict = Depends(VerifyTokenController.check_is_logged_in)):
    if not is_logged_in:
        return RedirectResponse(url="/login", status_code=302)

    # Verificar permisos
    if not PermissionsController.has_permission(is_logged_in.get("type", 0), "/panel/OC"):
        return RedirectResponse(url="/panel", status_code=302)

    response = FileResponse("templates/orden_compra.html")
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.get("/garantias", include_in_schema=False)
def read_garantias(correo: str = None):
    return FileResponse("templates/garantias.html")

@app.get("/manuales", include_in_schema=False)
def read_manuales(correo: str = None):
    return FileResponse("templates/manuales.html")
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
        "message": "Ok",
        "type": token_data.get("type", 0)
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
        "message": "Ok",
        "type": token_data.get("type", 0)
    }

# Endpoint para obtener permisos del usuario
@app.get(
    "/api/myPermissions",
    tags=["User"],
    summary="Obtener permisos del usuario",
    responses={
        200: {"model": dict},
        401: {"model": Schemas.VerifySession401},
        500: {"model": Schemas.InternalServerError}
    }
)
def get_my_permissions(token_data: dict = Depends(VerifyTokenController.verify_token)):
    user_type = token_data.get("type", 0)
    pages = PermissionsController.get_user_pages(user_type)
    return {
        "pages": pages,
        "type": user_type
    }

@app.post(
    "/api/logout",
    tags=["Auth"],
    summary="Cerrar sesión",
    responses={
        200: {"model": Schemas.Logout200},
        401: {"model": Schemas.VerifySession401},
        500: {"model": Schemas.InternalServerError}
    }
)
def logout(token: str = Cookie(None), credentials: HTTPBearer = Depends(HTTPBearer(auto_error=False))):
    # Obtener el token desde cookie o header Authorization
    final_token = None
    if credentials:
        final_token = credentials.credentials
    elif token:
        final_token = token

    if not final_token:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=401, content={"Error": "No hay sesión activa"})

    return AuthController.logout(final_token)


# Endpoint para cerrar todas las sesiones (CRON)
@app.post(
    "/api/endDay",
    tags=["CRON"],
    summary="Cerrar todas las sesiones",
    responses={
        200: {"model": Schemas.EndDay200},
        400: {"model": Schemas.EndDay400},
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
@app.post(
    "/api/config2FA", 
    tags=["2FA"],
    summary="Configurar 2FA",
    responses={
        200: {"model": Schemas.Verify2FA200},
        400: {"model": Schemas.Verify2FA400},
        404: {"model": Schemas.GenerateSecret404},
        401: {"model": Schemas.VerifySession401},
        500: {"model": Schemas.InternalServerError}
    }
)
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
        401: {"model": Schemas.VerifySession401},
        429: {"model": Schemas.CotizacionFolio429},
        500: {"model": Schemas.InternalServerError}
    }
)
def get_folio(empresa: str = "interlab", is_logged_in: dict = Depends(VerifyTokenController.check_is_logged_in)):
    if not is_logged_in:
        return JSONResponse(status_code=401, content={"Error": "Token inválido o expirado"})
    return CotizacionesController.get_next_folio(empresa)

from fastapi import UploadFile, File, Form
@app.post(
    "/api/cotizaciones/save",
    tags=["Cotizaciones"],
    summary="Guardar cotización",
    responses={
        200: {"model": Schemas.CotizacionSave200},
        401: {"model": Schemas.VerifySession401},
        500: {"model": Schemas.InternalServerError}
    }
)
async def save_cotizacion(
    folio: int = Form(...), 
    empresa: str = Form(...),
    file: UploadFile = File(...),
    is_logged_in: dict = Depends(VerifyTokenController.check_is_logged_in)
):
    if not is_logged_in:
        return JSONResponse(status_code=401, content={"Error": "Token inválido o expirado"})
    return await CotizacionesController.save_cotizacion(folio, file, empresa)

@app.get(
    "/api/cotizaciones/getPN",
    tags=["Cotizaciones"],
    summary="Obtener detalles del producto por PN",
    responses={
        200: {"model": Schemas.CotizacionGetPN200},
        401: {"model": Schemas.VerifySession401},
        404: {"model": Schemas.CotizacionGetPN404},
        500: {"model": Schemas.InternalServerError}
    }
)
def get_product_details(pn: str, is_logged_in: dict = Depends(VerifyTokenController.check_is_logged_in)):
    if not is_logged_in:
        return JSONResponse(status_code=401, content={"Error": "Token inválido o expirado"})
    return CotizacionesController.getPN(pn)

@app.get(
    "/api/cotizaciones/pns",
    tags=["Cotizaciones"],
    summary="Obtener todos los PNs",
    responses={
        200: {"model": Schemas.CotizacionPNs200},
        401: {"model": Schemas.VerifySession401},
        500: {"model": Schemas.InternalServerError}
    }
)
def get_pns(is_logged_in: dict = Depends(VerifyTokenController.check_is_logged_in)):
    if not is_logged_in:
        return JSONResponse(status_code=401, content={"Error": "Token inválido o expirado"})
    return CotizacionesController.getPNs()

@app.get(
    "/api/categories",
    tags=["Inventario"],
    summary="Obtener todas las categorías",
    responses={
        200: {"model": List[Schemas.CategoryRecord]},
        401: {"model": Schemas.VerifySession401},
        500: {"model": Schemas.InternalServerError}
    },
    dependencies=[Depends(VerifyTokenController.verify_token)]
)
def get_categories():
    return ProductsController.get_categories()

@app.get(
    "/api/getProducts",
    tags=["Inventario"],
    summary="Obtener productos con paginación",
    responses={
        200: {"model": Schemas.ProductPaginationResponse200},
        401: {"model": Schemas.VerifySession401},
        500: {"model": Schemas.InternalServerError}
    },
    dependencies=[Depends(VerifyTokenController.verify_token)]
)
def get_products(page: int = 1, limit: int = 10, search: str = None, category: str = "all"):
    return ProductsController.get_products(page, limit, search, category)

@app.post(
    "/api/saveProduct",
    tags=["Inventario"],
    summary="Guardar un producto",
    responses={
        200: {"model": Schemas.InventoryMessage200},
        401: {"model": Schemas.VerifySession401},
        500: {"model": Schemas.InternalServerError}
    },
    dependencies=[Depends(VerifyTokenController.verify_token)]
)
def save_product(data: schemasPayload.Product):
    return ProductsController.save_product(data.dict())

@app.put(
    "/api/updateProduct",
    tags=["Inventario"],
    summary="Actualizar un producto",
    responses={
        200: {"model": Schemas.InventoryMessage200},
        401: {"model": Schemas.VerifySession401},
        500: {"model": Schemas.InternalServerError}
    },
    dependencies=[Depends(VerifyTokenController.verify_token)]
)
def update_product(data: schemasPayload.Product):
    return ProductsController.update_product(data.dict())

@app.post(
    "/api/saveCategory",
    tags=["Inventario"],
    summary="Guardar una categoría",
    responses={
        200: {"model": Schemas.InventoryMessage200},
        401: {"model": Schemas.VerifySession401},
        500: {"model": Schemas.InternalServerError}
    },
    dependencies=[Depends(VerifyTokenController.verify_token)]
)
def save_category(data: schemasPayload.Category):
    return ProductsController.save_category(data.dict())

@app.patch(
    "/api/updateCategory",
    tags=["Inventario"],
    summary="Actualizar una categoría",
    responses={
        200: {"model": Schemas.InventoryMessage200},
        401: {"model": Schemas.VerifySession401},
        500: {"model": Schemas.InternalServerError}
    },
    dependencies=[Depends(VerifyTokenController.verify_token)]
)
def update_category(data: schemasPayload.Category):
    return ProductsController.update_category(data.dict())

@app.delete(
    "/api/deleteCategory/{id_category}",
    tags=["Inventario"],
    summary="Eliminar una categoría",
    responses={
        200: {"model": Schemas.InventoryMessage200},
        401: {"model": Schemas.VerifySession401},
        400: {"model": Schemas.CategoryDelete400},
        500: {"model": Schemas.InternalServerError}
    },
    dependencies=[Depends(VerifyTokenController.verify_token)]
)
def delete_category(id_category: int):
    return ProductsController.delete_category(id_category)

@app.get(
    "/api/getCodes",
    tags=["Inventario"],
    summary="Obtener todos los códigos",
    responses={
        200: {"model": List[Schemas.CodeRecord]},
        401: {"model": Schemas.VerifySession401},
        500: {"model": Schemas.InternalServerError}
    },
    dependencies=[Depends(VerifyTokenController.verify_token)]
)
def get_codes():
    return ProductsController.get_codes()

@app.post(
    "/api/saveCode",
    tags=["Inventario"],
    summary="Guardar un código",
    responses={
        200: {"model": Schemas.InventoryMessage200},
        401: {"model": Schemas.VerifySession401},
        500: {"model": Schemas.InternalServerError}
    },
    dependencies=[Depends(VerifyTokenController.verify_token)]
)
def save_code(data: schemasPayload.Code):
    return ProductsController.save_code(data.dict())

@app.post(
    "/api/generateTicket",
    tags=["Tickets"],
    summary="Generar un ticket",
    responses={
        200: {"model": Schemas.InventoryMessage200},
        401: {"model": Schemas.VerifySession401},
        500: {"model": Schemas.InternalServerError}
    }
)
def generate_ticket(data: schemasPayload.Ticket, token_data: dict = Depends(VerifyTokenController.check_is_logged_in)):
    return TicketsController.generate_ticket(data.dict(), token_data)

@app.post(
    "/api/joinTicket/{ticket_id}",
    tags=["Tickets"],
    summary="Unirse a un ticket",
    responses={
        200: {"model": Schemas.TicketJoin200},
        401: {"model": Schemas.VerifySession401},
        400: {"model": Schemas.TicketJoin400},
        404: {"model": Schemas.TicketJoin404},
        500: {"model": Schemas.InternalServerError}
    }
)
def join_ticket(ticket_id: int, token_data: dict = Depends(VerifyTokenController.check_is_logged_in)):
    return TicketsController.join_ticket(token_data, ticket_id)

@app.post(
    "/api/sendMessage",
    tags=["Tickets"],
    summary="Enviar un mensaje",
    responses={
        200: {"model": Schemas.SendMessage200},
        401: {"model": Schemas.VerifySession401},
        400: {"model": Schemas.SendMessage400},
        404: {"model": Schemas.TicketJoin404},
        500: {"model": Schemas.InternalServerError}
    }
)
def send_message(data: schemasPayload.SendMessage, token_data: dict = Depends(VerifyTokenController.check_is_logged_in)):
    return TicketsController.send_message(data.dict(), token_data)

@app.get(
    "/api/chat",
    tags=["Tickets"],
    summary="Obtener mensajes del chat",
    responses={
        200: {"model": Schemas.Chat200},
        401: {"model": Schemas.VerifySession401},
        403: {"model": Schemas.InternalServerError},
        404: {"model": Schemas.TicketJoin404},
        500: {"model": Schemas.InternalServerError}
    }
)
async def get_messages_sse(ticket_id: int, user_type: int, email: str = None, token_data: dict = Depends(VerifyTokenController.check_is_logged_in)):
    data = {
        "ticket_id": ticket_id,
        "user_type": user_type,
        "email": email
    }
    return await TicketsController.get_messages_sse(data, token_data)

@app.post(
    "/api/uploadFile",
    tags=["Uploads"],
    summary="Subir un archivo",
    responses={
        200: {"model": Schemas.UploadFile200},
        400: {"model": Schemas.UploadFile400},
        500: {"model": Schemas.InternalServerError}
    }
)
async def upload_file(file: UploadFile = File(...)):
    return UploadsController.upload_file(file)

@app.get(
    "/api/getTicketsByUser",
    tags=["Tickets"],
    summary="Obtener tickets por usuario",
    responses={
        200: {"model": List[Schemas.TicketByUser200]},  
        404: {"model": Schemas.TicketJoin404},
        500: {"model": Schemas.InternalServerError}
    }
)
def get_tickets_by_user(ticket_type: int, email: str = None, token_data: dict = Depends(VerifyTokenController.check_is_logged_in)):
    return TicketsController.get_tickets_by_user(email, ticket_type, token_data)

@app.get(
    "/api/getTickets",
    tags=["Tickets"],
    summary="Obtener tickets",
    responses={
        200: {"model": List[Schemas.TicketByUser200]},  
        404: {"model": Schemas.Ticket404},
        500: {"model": Schemas.InternalServerError}
    }
)
def get_tickets(ticket_type: int, token_data: dict = Depends(VerifyTokenController.check_is_logged_in)):
        return TicketsController.get_tickets(ticket_type, token_data)

@app.post(
    "/api/changeStatus",
    tags=["Tickets"],
    summary="Cambiar status de un ticket",
    responses={
        200: {"model": Schemas.TicketChangeStatus200},
        401: {"model": Schemas.VerifySession401},
        400: {"model": Schemas.TicketChangeStatus400},
        404: {"model": Schemas.TicketJoin404},
        500: {"model": Schemas.InternalServerError}
    }
)
def change_status(data: schemasPayload.TicketChangeStatus, token_data: dict = Depends(VerifyTokenController.check_is_logged_in)):
    return TicketsController.change_status(data.dict(), token_data)

# ----------- GMAIL CHAT ----------- #
@app.get("/api/getGmailAttachment", tags=["Gmail"])
def get_gmail_attachment(ticket_id: int, msg_id: str, filename: str, token_data: dict = Depends(VerifyTokenController.check_is_logged_in)):
    # Limpiar el id por si es de enviados
    clean_id = msg_id.replace("_sent", "")
    return GmailController.get_gmail_attachment(ticket_id, clean_id, filename)

@app.post(
    "/api/sendGmailMessage",
    tags=["Gmail"],
    summary="Enviar un mensaje de Gmail al proveedor",
    responses={
        200: {"model": dict},
        401: {"model": Schemas.VerifySession401},
        500: {"model": Schemas.InternalServerError}
    }
)
def send_gmail_message(
    ticket_id: int = Form(...),
    to_email: str = Form(...),
    subject: str = Form(...),
    message: str = Form(...),
    bcc: str = Form(None),
    files: List[UploadFile] = File(None),
    token_data: dict = Depends(VerifyTokenController.check_is_logged_in)
):
    # Verificar que el agente esté unido y el ticket abierto
    from models import db as DB
    query = "SELECT agents, status FROM tickets WHERE id = %s"
    result = DB.GETDB(query, (ticket_id,))
    if not result:
        return JSONResponse(status_code=404, content={"Error": "Ticket no encontrado"})
    
    agents = result[0].get("agents", "") or ""
    status = result[0].get("status", "")
    
    if token_data.get("username") not in agents.split("|"):
        return JSONResponse(status_code=403, content={"Error": "No estás unido a este ticket"})
    
    if status == "closed":
        return JSONResponse(status_code=400, content={"Error": "El ticket está cerrado"})

    return GmailController.send_gmail_message(
        ticket_id, 
        to_email, 
        subject, 
        message, 
        files,
        bcc
    )

@app.get(
    "/api/gmailChat",
    tags=["Gmail"],
    summary="Obtener mensajes de Gmail vía SSE",
    responses={
        200: {"model": dict},
        401: {"model": Schemas.VerifySession401},
        500: {"model": Schemas.InternalServerError}
    }
)
async def gmail_chat_sse(ticket_id: int, token_data: dict = Depends(VerifyTokenController.check_is_logged_in)):
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        GmailController.gmail_chat_sse(ticket_id), 
        media_type="text/event-stream"
    )

@app.post(
    "/api/updateProviderEmail",
    tags=["Gmail"],
    summary="Actualizar el correo del proveedor para un ticket",
    responses={
        200: {"model": dict},
        401: {"model": Schemas.VerifySession401},
        500: {"model": Schemas.InternalServerError}
    }
)
def update_provider_email(ticket_id: int, email: str, token_data: dict = Depends(VerifyTokenController.check_is_logged_in)):
    return TicketsController.update_provider_email(ticket_id, email, token_data)

# ----------- NOTIFICACIONES ----------- #
@app.get(
    "/api/notifications",
    tags=["Notificaciones"],
    summary="Obtener notificaciones del usuario",
    responses={
        200: {"model": List[Schemas.NotificationRecord]},
        401: {"model": Schemas.VerifySession401},
        500: {"model": Schemas.InternalServerError}
    }
)
def get_notifications(token_data: dict = Depends(VerifyTokenController.check_is_logged_in)):
    return NotificationsController.get_notifications(token_data)

@app.post(
    "/api/notifications/read/{notification_id}",
    tags=["Notificaciones"],
    summary="Marcar notificación como leída",
    responses={
        200: {"model": Schemas.NotificationStatus200},
        401: {"model": Schemas.VerifySession401},
        403: {"model": Schemas.InternalServerError},
        404: {"model": Schemas.InternalServerError},
        500: {"model": Schemas.InternalServerError}
    }
)
def mark_as_read(notification_id: int, token_data: dict = Depends(VerifyTokenController.check_is_logged_in)):
    return NotificationsController.mark_as_read(notification_id, token_data)
