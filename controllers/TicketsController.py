import models.db as DB
import asyncio
import json
from fastapi.responses import JSONResponse, StreamingResponse
from controllers.NotificationsController import add_notification

def generate_ticket(data, token_data):    
    try:
        type_ticket = data.get("type_ticket")
        subject = data.get("subject")
        user_val = None

        if type_ticket == 2:
            if not token_data:
                return JSONResponse(
                    status_code=401,
                    content={"Error": "Token inválido o expirado"}
                )
            user_val = token_data.get("username")
            add_notification(2, f"Nueva ticket abierto: {subject}", "media")
        elif type_ticket == 1:
            user_val = data.get("email")
            if not user_val:
                return JSONResponse(
                    status_code=400,
                    content={"Error": "El correo es obligatorio para tickets externos"}
                )
            add_notification(1, f"Nueva garantía: {subject}", "alta")
            add_notification(2, f"Nueva garantía: {subject}", "alta")

        else:
            return JSONResponse(
                status_code=400,
                content={"Error": "Tipo de ticket inválido"}
            )

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

def join_ticket(data, ticket_id):
    try:
        if not ticket_id:
            return JSONResponse(
                status_code=400,
                content={"Error": "El ID del ticket es obligatorio"}
            )

        if not data:
            return JSONResponse(
                status_code=401,
                content={"Error": "Token inválido o expirado"}
            )

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
        
        query = "SELECT * FROM tickets WHERE id = %s"
        result = DB.GETDB(query, (ticket_id,))
        if not result:
            return JSONResponse(
                status_code=404,
                content={"Error": "Ticket no encontrado"}
            )
        
        query = "SELECT type FROM tickets WHERE id = %s"
        result = DB.GETDB(query, (ticket_id,))
        type_ticket = result[0].get("type", "")

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

def send_message(data, token_data):
    try:
        ticket_id = data.get("ticket_id")
        message = data.get("message")
        files = data.get("files")
        
        query = "SELECT user, agents, status FROM tickets WHERE id = %s"
        result = DB.GETDB(query, (ticket_id,))
        user_ticket = result[0].get("user", "")
        agents = result[0].get("agents", "")
        status = result[0].get("status", "")
        user = None

        if not result:
            return JSONResponse(
                status_code=404,
                content={"Error": "Ticket no encontrado"}
            )

        if data.get("type") == 1:
            user = data.get("email")
            if user != user_ticket:
                return JSONResponse(
                    status_code=400,
                    content={"Error": "No tienes permisos para enviar mensajes al ticket"}
                )
        elif data.get("type") == 2:
            user = token_data.get("username")
            if user not in agents.split("|"):
                return JSONResponse(
                    status_code=400,
                    content={"Error": "No tienes permisos para enviar mensajes al ticket"}
                )

        elif data.get("type") == 3:
            user = token_data.get("username")
            if user != user_ticket:
                return JSONResponse(
                    status_code=400,
                    content={"Error": "No tienes permisos para enviar mensajes al ticket"}
                )
        else:
            return JSONResponse(
                status_code=400,
                content={"Error": "Tipo de usuario inválido"}
            )

        if not message or not message.strip():
            return JSONResponse(
                status_code=400,
                content={"Error": "El mensaje no puede estar vacio"}
            )
        
        if status == "closed":
            return JSONResponse(
                status_code=400,
                content={"Error": "El ticket esta cerrado"}
            )
        
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

async def get_messages_sse(data, token_data):
    try:
        query = "SELECT user, agents FROM tickets WHERE id = %s"
        result = await asyncio.to_thread(DB.GETDB, query, (data.get("ticket_id"),))
        if not result:
            return JSONResponse(status_code=404, content={"Error": "Ticket no encontrado"})
        
        user_ticket = result[0].get("user", "")
        agents = result[0].get("agents", "") or ""

        is_participant = False
        user_type = data.get("user_type")
        current_user = None
        
        if user_type == 1:
            current_user = data.get("email")
            if data.get("email") == user_ticket:
                is_participant = True
        elif user_type == 2:
            current_user = token_data.get("username")
            if token_data.get("username") in agents.split("|"):
                is_participant = True
        elif user_type == 3:
            current_user = token_data.get("username")
            if token_data.get("username") == user_ticket:
                is_participant = True
        
        if not is_participant:
            return JSONResponse(status_code=403, content={"Error": "No tienes permisos para ver este chat"})

        async def event_generator():
            yield f"data: {json.dumps({'current_user': current_user})}\n\n"
            
            last_id = 0
            try:
                while True:
                    try:
                        query_msgs = "SELECT id, user, message, files, created_at FROM ticket_messages WHERE ticket_id = %s AND id > %s ORDER BY id ASC"
                        messages = await asyncio.to_thread(DB.GETDB, query_msgs, (data.get("ticket_id"), last_id))
                        
                        if messages:
                            for msg in messages:
                                if 'created_at' in msg and msg['created_at']:
                                    msg['created_at'] = str(msg['created_at'])
                                
                                last_id = msg['id']
                                yield f"data: {json.dumps(msg)}\n\n"
                        
                        await asyncio.sleep(2)
                    except asyncio.CancelledError:
                        break
                    except Exception as e:
                        try:
                            yield f"data: {json.dumps({'error': str(e)})}\n\n"
                        except:
                            pass
                        break
            except GeneratorExit:
                pass

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    except Exception as e:
        return JSONResponse(status_code=500, content={"Error": str(e)})

def get_tickets_by_user(email, ticket_type, token_data):
    try:
        if ticket_type == 1:
            if not email:
                return JSONResponse(status_code=400, content={"Error": "El email es obligatorio para tickets externos"})
            query = "SELECT id, user, subject, status, type FROM tickets WHERE user = %s and type = 1"
            result = DB.GETDB(query, (email,))
        elif ticket_type == 2:
            user = token_data.get("username")
            if not user:
                return JSONResponse(status_code=401, content={"Error": "Token inválido o expirado"})
            query = "SELECT id, user, subject, status, type FROM tickets WHERE user = %s and type = 2"
            result = DB.GETDB(query, (user,))
        else:
            return JSONResponse(status_code=400, content={"Error": "Tipo de ticket inválido"})

        if not result:
            return JSONResponse(status_code=404, content={"Error": "Tickets no encontrados"})
        
        return JSONResponse(status_code=200, content=result)
    except Exception as e:
        return JSONResponse(status_code=500, content={"Error": str(e)})

def get_tickets(ticket_type, token_data):
    try:
        if not token_data:
            return JSONResponse(status_code=401, content={"Error": "Token inválido o expirado"})

        if ticket_type == 1:
            if token_data.get("type") < 1:
                return JSONResponse(status_code=403, content={"Error": "No tienes permisos para ver todos los tickets"})
            query = "SELECT id, user, subject, status, type, provider_email FROM tickets WHERE type = 1"
            result = DB.GETDB(query, ())
            if not result:
                return JSONResponse(status_code=404, content={"Error": "Tickets no encontrado"})
            return JSONResponse(status_code=200, content=result)
        elif ticket_type == 2:
            if token_data.get("type") < 2:
                return JSONResponse(status_code=403, content={"Error": "No tienes permisos para ver todos los tickets"})
            query = "SELECT id, user, subject, status, type, provider_email FROM tickets WHERE type = 2"
            result = DB.GETDB(query, ())
            if not result:
                return JSONResponse(status_code=404, content={"Error": "Tickets no encontrado"})
            return JSONResponse(status_code=200, content=result)
        else:
            return JSONResponse(status_code=400, content={"Error": "Tipo de ticket inválido"})

    except Exception as e:
        return JSONResponse(status_code=500, content={"Error": str(e)})

def change_status(data, token_data):
    try:
        ticket_id = data.get("ticket_id")
        new_status = data.get("status")
        
        query = "SELECT status, type FROM tickets WHERE id = %s"
        result = DB.GETDB(query, (ticket_id,))
        if not result:
            return JSONResponse(status_code=404, content={"Error": "Ticket no encontrado"})
        
        real_ticket_type = result[0].get("type")
        user_type = token_data.get("type")
        username = token_data.get("username")

        if new_status not in ["open", "closed"]:
            return JSONResponse(status_code=400, content={"Error": "Status inválido"})
        
        if real_ticket_type == 2 and user_type < 2:
            return JSONResponse(status_code=403, content={"Error": "No tienes permisos"})
        
        query = "UPDATE tickets SET status = %s WHERE id = %s"
        DB.PUTDB(query, (new_status, ticket_id))
        
        if real_ticket_type == 2:
            if new_status == "open":
                add_notification(2, f"{username} ha abierto el ticket: {ticket_id}", "baja")
            else:
                add_notification(2, f"{username} ha cerrado el ticket: {ticket_id}", "baja")
        elif real_ticket_type == 1:
            if new_status == "open":
                add_notification(1, f"{username} ha abierto la garantía: {ticket_id}", "baja")
                add_notification(2, f"{username} ha abierto la garantía: {ticket_id}", "baja")
            else:
                add_notification(1, f"{username} ha cerrado la garantía: {ticket_id}", "media")
                add_notification(2, f"{username} ha cerrado la garantía: {ticket_id}", "media")

        return JSONResponse(status_code=200, content={"message": "Status cambiado exitosamente"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"Error": str(e)})

def update_provider_email(ticket_id, email, token_data):
    try:
        if not token_data or token_data.get("type") < 1:
            return JSONResponse(status_code=403, content={"Error": "No tienes permisos"})
        
        query = "UPDATE tickets SET provider_email = %s WHERE id = %s"
        DB.PUTDB(query, (email, ticket_id))
        
        return JSONResponse(status_code=200, content={"message": "Correo del proveedor actualizado"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"Error": str(e)})