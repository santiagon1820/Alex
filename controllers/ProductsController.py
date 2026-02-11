import models.db as DB
from fastapi.responses import JSONResponse
import json

def get_categories():
    try:
        # Usamos ctaegory o category según lo que devuelva la DB, el usuario puso ctaegory con typo
        query = "SELECT id_category, ctaegory as category FROM categories"
        result = DB.GETDB(query)
        return result if result is not None else []
    except Exception as e:
        return JSONResponse(status_code=500, content={"Error": str(e)})

def get_products(page: int = 1, limit: int = 10, search: str = None, category: str = "all"):
    try:
        offset = (page - 1) * limit
        where_clauses = []
        params = []

        if category and category != "all":
            where_clauses.append("p.category = %s")
            params.append(category)
        
        if search:
            search_param = f"%{search}%"
            where_clauses.append("(p.pn LIKE %s OR p.marca LIKE %s OR p.modelo LIKE %s OR p.description1 LIKE %s OR p.description2 LIKE %s OR p.description3 LIKE %s)")
            params.extend([search_param] * 6)

        where_sql = " WHERE " + " AND ".join(where_clauses) if where_clauses else ""
        
        # Consulta para el total
        count_query = f"SELECT COUNT(*) as total FROM products p {where_sql}"
        count_result = DB.GETDB(count_query, tuple(params))
        total = count_result[0]['total'] if count_result else 0

        # Consulta con paginación
        query = f"""
            SELECT p.*, c.ctaegory as category_name 
            FROM products p
            LEFT JOIN categories c ON p.category = c.id_category
            {where_sql}
            ORDER BY p.pn ASC
            LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])
        result = DB.GETDB(query, tuple(params))
        
        return {
            "products": result if result is not None else [],
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"Error": str(e)})

def save_product(data: dict):
    try:
        query = """
            INSERT INTO products 
            (pn, description1, description2, description3, price, um, profile, marca, modelo, category, stock, precioOC)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        # Limpiar y convertir UM a JSON
        um_raw = data.get('um', '')
        um_list = [item.strip() for item in um_raw.split(',') if item.strip()]
        um_json = json.dumps({"UM": um_list})

        params = (
            data.get('pn'),
            data.get('description1'),
            data.get('description2'),
            data.get('description3'),
            data.get('price'),
            um_json,
            data.get('profile'),
            data.get('marca'),
            data.get('modelo'),
            data.get('category'),
            data.get('stock'),
            data.get('precioOC')
        )
        success = DB.POSTDB(query, params)
        if success:
            return {"message": "Producto guardado exitosamente"}
        else:
            return JSONResponse(status_code=500, content={"Error": "Error al guardar en la base de datos"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"Error": str(e)})

def update_product(data: dict):
    try:
        # Limpiar y convertir UM a JSON
        um_raw = data.get('um', '')
        um_list = [item.strip() for item in um_raw.split(',') if item.strip()]
        um_json = json.dumps({"UM": um_list})

        # Usamos original_pn para identificar el registro, permitiendo editar el campo pn real
        target_pn = data.get('original_pn') or data.get('pn')
        
        query = """
            UPDATE products 
            SET pn=%s, description1=%s, description2=%s, description3=%s, price=%s, um=%s, 
                profile=%s, marca=%s, modelo=%s, category=%s, stock=%s, precioOC=%s
            WHERE pn = %s
        """
        params = (
            data.get('pn'),
            data.get('description1'),
            data.get('description2'),
            data.get('description3'),
            data.get('price'),
            um_json,
            data.get('profile'),
            data.get('marca'),
            data.get('modelo'),
            data.get('category'),
            data.get('stock'),
            data.get('precioOC'),
            target_pn
        )
            
        success = DB.POSTDB(query, params)
        if success:
            return {"message": "Producto actualizado exitosamente"}
        else:
            return JSONResponse(status_code=500, content={"Error": "No se encontró el producto o no hubo cambios"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"Error": str(e)})

def save_category(data: dict):
    try:
        query = "INSERT INTO categories (ctaegory) VALUES (%s)"
        params = (data.get('category'),)
        success = DB.POSTDB(query, params)
        if success:
            return {"message": "Categoría guardada exitosamente"}
        else:
            return JSONResponse(status_code=500, content={"Error": "Error al guardar la categoría"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"Error": str(e)})

def update_category(data: dict):
    try:
        query = "UPDATE categories SET ctaegory=%s WHERE id_category=%s"
        params = (data.get('category'), data.get('id_category'))
        success = DB.POSTDB(query, params)
        if success:
            return {"message": "Categoría actualizada exitosamente"}
        else:
            return JSONResponse(status_code=500, content={"Error": "Error al actualizar la categoría"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"Error": str(e)})

def delete_category(id_category: int):
    try:
        # Verificar si hay productos en esta categoría
        check_query = "SELECT COUNT(*) as total FROM products WHERE category = %s"
        check_res = DB.GETDB(check_query, (id_category,))
        if check_res and check_res[0]['total'] > 0:
            return JSONResponse(status_code=400, content={"Error": "No se puede eliminar la categoría porque tiene productos asociados. Reasigna los productos a otra categoría primero."})

        query = "DELETE FROM categories WHERE id_category = %s"
        success = DB.DELDB(query, (id_category,))
        if success:
            return {"message": "Categoría eliminada exitosamente"}
        else:
            return JSONResponse(status_code=500, content={"Error": "Error al eliminar la categoría"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"Error": str(e)})
