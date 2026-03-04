import os
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error

# Cargamos variables de entorno
load_dotenv()

HOST = os.getenv("DB_HOST")
USER = os.getenv("DB_USER")
PASSWORD = os.getenv("DB_PASSWORD")
DATABASE = os.getenv("DB_NAME")

# CFuncion para conectar a la BD
def get_connection():
    try:
        conn = mysql.connector.connect(
            host=HOST,
            user=USER,
            password=PASSWORD,
            database=DATABASE
        )
        return conn
    except Error as e:
        print("Error while connecting to MySQL", e)
        return None

# Funcion para ejecutar un SQL
def run_query(query, params=None):
    conn = get_connection()
    if conn is None:
        raise Exception("Error al conectar con la base de datos MySQL")
    cursor = conn.cursor()
    try:
        cursor.execute(query, params)
        conn.commit()
        return True
    except Error as e:
        print("Error while connecting to MySQL", e)
        raise e # Re-lanzar el error para que el controlador lo capture
    finally:
        cursor.close()
        conn.close()

# Funcion para Insertar datos
def POSTDB(query, params=None):
    return run_query(query, params)

# Funcion para actualizar datos
def PUTDB(query, params=None):
    return run_query(query, params)

# Funcion para eliminar datos
def DELDB(query, params=None):
    return run_query(query, params)

# Funcion para Obtener datos
def GETDB(query, params=None):
    conn = get_connection()
    if conn is None:
        raise Exception("Error al conectar con la base de datos MySQL")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(query, params)
        result = cursor.fetchall()
        return result
    except Error as e:
        print("Error a la hora de obtener datos:", e)
        raise e # Re-lanzar el error
    finally:
        cursor.close()
        conn.close()
