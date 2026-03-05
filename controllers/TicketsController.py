import models.db as DB
from fastapi.responses import JSONResponse

# Función para generar ticket
def generate_ticket(data, token_data):    
    try:
        type_ticket = data.get("type_ticket")
        subject = data.get("subject")
        user_val = None

        if type_ticket == 2:
            # Ticket interno: Usar username de la cookie (token_data)
            if not token_data:
                return JSONResponse(
                    status_code=401,
                    content={"Error": "Token inválido o expirado"}
                )
            user_val = token_data.get("username")
        elif type_ticket == 1:
            # Ticket externo (cliente): Usar email del payload
            user_val = data.get("email")
            if not user_val:
                return JSONResponse(
                    status_code=400,
                    content={"Error": "El correo es obligatorio para tickets externos"}
                )
        else:
            return JSONResponse(
                status_code=400,
                content={"Error": "Tipo de ticket inválido"}
            )

        # Inserción en la base de datos
        # Tabla: id, type, user, subject, status, agents, created_at
        query = "INSERT INTO tickets (type, user, subject) VALUES (%s, %s, %s)"
        DB.POSTDB(query, (type_ticket, user_val, subject))

        return JSONResponse(
            status_code=200,
            content={"message": "Ticket generado exitosamente"}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"Error": f"Error interno del servidor: {str(e)}"}
        )

# Función para unirse a un ticket
def join_ticket(data, ticket_id):
    try:
        if not ticket_id:
            return JSONResponse(
                status_code=400,
                content={"Error": "El ID del ticket es obligatorio"}
            )

        # Verificar que hay sesion activa = data
        if not data:
            return JSONResponse(
                status_code=401,
                content={"Error": "Token inválido o expirado"}
            )

        # Verificar que el agente no este en el ticket
        query = "SELECT agents FROM tickets WHERE id = %s"
        result = DB.GETDB(query, (ticket_id,))
        if result:
            agents = result[0].get("agents", "")
            if agents:
                agents_list = agents.split("|")
                if data.get("username") in agents_list:
                    return JSONResponse(
                        status_code=400,
                        content={"Error": "Ya te encuentras en el ticket"}
                    )
        
        # Verificar que el ticket exista
        query = "SELECT * FROM tickets WHERE id = %s"
        result = DB.GETDB(query, (ticket_id,))
        if not result:
            return JSONResponse(
                status_code=404,
                content={"Error": "Ticket no encontrado"}
            )
        
        # Verificar si se puede unir o no al ticket
        # 1 Comprobamos si tenemos un ticket tipo 1 o 2 haciendo una consulta a la BD
        query = "SELECT type FROM tickets WHERE id = %s"
        result = DB.GETDB(query, (ticket_id,))
        type_ticket = result[0].get("type", "")

        # Si el ticket es tipo 1 todos los igual o mayor a 1 se pueden unir y si es 2 solo los mayores o igual a 2 lo pueden hacer
        if type_ticket == 1:
            if data.get("type") < 1:
                return JSONResponse(
                    status_code=400,
                    content={"Error": "No tienes permisos para unirte al ticket"}
                )
        elif type_ticket == 2:
            if data.get("type") < 2:
                return JSONResponse(
                    status_code=400,
                    content={"Error": "No tienes permisos para unirte al ticket"}
                )
        
        query = "UPDATE tickets SET agents = CONCAT(COALESCE(NULLIF(agents,''),''), IF(agents IS NULL OR agents='', '', '|'), %s) WHERE id = %s"
        DB.PUTDB(query, (data.get("username"), ticket_id))
        
        return JSONResponse(
            status_code=200,
            content={"message": "Te has unido al ticket exitosamente"}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"Error": f"Error interno del servidor: {str(e)}"}
        )

# Función para mandar mensaje al ticket
def send_message(data, token_data):
    try:
        # Definir variables
        ticket_id = data.get("ticket_id")
        message = data.get("message")
        files = data.get("files")
        
        # Obtener quienes tienen acceso al ticket seleccionando user y agents
        query = "SELECT user, agents FROM tickets WHERE id = %s"
        result = DB.GETDB(query, (ticket_id,))
        user_ticket = result[0].get("user", "")
        agents = result[0].get("agents", "")
        user = None
        
        # Verificar que el ticket exista
        if not result:
            return JSONResponse(
                status_code=404,
                content={"Error": "Ticket no encontrado"}
            )

        # Verificar si tiene permiso para enviar mensaje
        if data.get("type") == 1:
            # Es cliente
            user = data.get("email")
            # Verificar que el cliente este en el ticket
            if user != user_ticket:
                return JSONResponse(
                    status_code=400,
                    content={"Error": "No tienes permisos para enviar mensajes al ticket"}
                )
        elif data.get("type") == 2:
            # Es agente
            user = token_data.get("username")
            # Verificar que el agente este en el ticket
            if user not in agents.split("|"):
                return JSONResponse(
                    status_code=400,
                    content={"Error": "No tienes permisos para enviar mensajes al ticket"}
                )
        else:
            return JSONResponse(
                status_code=400,
                content={"Error": "Tipo de usuario inválido"}
            )

        # Verificar que el mensaje no este vacio
        if not message or not message.strip():
            return JSONResponse(
                status_code=400,
                content={"Error": "El mensaje no puede estar vacio"}
            )
        
        # Insertar mensaje
        query = "INSERT INTO ticket_messages (ticket_id, user, message, files) VALUES (%s, %s, %s, %s)"
        DB.POSTDB(query, (ticket_id, user, message, files))
        
        return JSONResponse(
            status_code=200,
            content={"message": "Mensaje enviado exitosamente"}
        )

        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"Error": f"Error interno del servidor: {str(e)}"}
        )
