import models.db as DB
from fastapi.responses import JSONResponse

def get_notifications(token_data: dict):
    if not token_data:
        return JSONResponse(status_code=401, content={"Error": "Token inválido o expirado"})
    
    user_id = str(token_data.get("user_id"))
    user_type = token_data.get("type", 0)
    
    # Traer todas las notificaciones de este tipo
    query = """
        SELECT id_notification, message, isRead, priority 
        FROM notifications 
        WHERE type = %s 
        ORDER BY 
            CASE priority 
                WHEN 'alta' THEN 1 
                WHEN 'media' THEN 2 
                WHEN 'baja' THEN 3 
                ELSE 4 
            END, 
            id_notification DESC
    """
    try:
        all_notifications = DB.GETDB(query, (user_type,))
        
        # Transformamos la lista para que isRead sea 1 si el usuario ya lo leyó, o 0 si no.
        # Además, filtramos para que el sistema "no nos muestre" las ya leídas si así se prefiere,
        # pero devolviendo el valor 0/1 limpio en lugar de la cadena interna.
        processed = []
        for n in all_notifications:
            read_by = (n["isRead"] or "").split("|")
            
            if user_id in read_by:
                # Si ya la leyó, no se incluye en la respuesta (según petición previa de no mostrarla)
                continue
            
            # Si llegó aquí es que NO la ha leído
            n["isRead"] = 0
            processed.append(n)
                
        return processed
    except Exception as e:
        return JSONResponse(status_code=500, content={"Error": str(e)})

def mark_as_read(notification_id: int, token_data: dict):
    if not token_data:
        return JSONResponse(status_code=401, content={"Error": "Token inválido o expirado"})
    
    user_id = str(token_data.get("user_id"))
    user_type = token_data.get("type", 0)
    
    # Verificar existencia y permisos
    query_check = "SELECT type, isRead FROM notifications WHERE id_notification = %s"
    try:
        result = DB.GETDB(query_check, (notification_id,))
        
        if not result:
            return JSONResponse(status_code=404, content={"Error": "Notificación no encontrada"})
        
        if result[0]["type"] != user_type:
            return JSONResponse(status_code=403, content={"Error": "No tienes permiso para marcar esta notificación"})
        
        current_read_by = result[0]["isRead"] or ""
        read_list = current_read_by.split("|") if current_read_by else []
        
        if user_id not in read_list:
            read_list.append(user_id)
            new_read_by = "|".join(read_list)
            
            # Actualizar la lista en la DB
            query = "UPDATE notifications SET isRead = %s WHERE id_notification = %s"
            DB.PUTDB(query, (new_read_by, notification_id))
            
        return {"message": "Notificación marcada como leída"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"Error": str(e)})

# Función interna para agregar notificaciones (sin endpoint)
def add_notification(type_user: int, message: str, priority: str = 'baja'):
    query = "INSERT INTO notifications (type, message, priority) VALUES (%s, %s, %s)"
    try:
        DB.POSTDB(query, (type_user, message, priority))
        return True
    except Exception as e:
        print(f"Error al agregar notificación: {str(e)}")
        return False
