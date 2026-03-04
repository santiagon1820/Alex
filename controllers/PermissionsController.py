import models.db as DB

def get_user_pages(user_type):
    try:
        query = "SELECT pages FROM user_permissions WHERE type = %s"
        result = DB.GETDB(query, (user_type,))
        if result:
            pages_string = result[0].get("pages", "")
            if pages_string:
                return pages_string.split("|")
        return []
    except Exception as e:
        print(f"Error fetching user permissions: {e}")
        return []

def has_permission(user_type, current_path):
    # Allow base panel path always for logged in users? 
    # Or should it also be in the list? Usually /panel is the home.
    if current_path == "/panel":
        return True
        
    allowed_pages = get_user_pages(user_type)
    # Check if current_path is in the list
    return current_path in allowed_pages
