import os
import smtplib
import imaplib
import email
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from fastapi import Request
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
import json
import asyncio
import time
import requests
import mimetypes
from fastapi import UploadFile
from typing import List

load_dotenv()

# Configuración desde .env
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
GMAIL_USER = os.getenv("GMAIL_USER")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")
GMAIL_ALIAS = os.getenv("GMAIL_ALIAS")

def parse_email_body(msg):
    body = ""
    files = []
    
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition"))
            
            if content_type == "text/plain" and "attachment" not in content_disposition:
                payload = part.get_payload(decode=True)
                if payload:
                    body = payload.decode(errors='ignore')
            elif "attachment" in content_disposition or part.get_filename():
                filename = part.get_filename()
                if filename:
                    files.append(filename)
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            body = payload.decode(errors='ignore')
        
    # Limpiar el cuerpo del mensaje (quitar historia/quotes)
    if body:
        # 1. Quitar el bloque "On ... wrote:" y todo lo que sigue
        import re
        # Busca patrones comunes de inicio de historia
        patterns = [
            r'(\r?\n|^)\s*On\s+.*\s+wrote:.*',
            r'(\r?\n|^)\s*El\s+.*\s+escribió:.*',
            r'(\r?\n|^)\s*De:.*',
            r'(\r?\n|^)\s*From:.*',
            r'(\r?\n|^)\s*Sent\s+from\s+my.*',
            r'(\r?\n|^)\s*Enviado\s+desde\s+mi.*',
            r'(\r?\n|^)--+\s*$', # Separador de firma
        ]
        
        # Primero intentar un split agresivo que capture incluso si está en la misma línea
        # pero siendo cautelosos con "On " al inicio.
        # Algunos clientes pegan el "On..." justo después del mensaje.
        body = re.split(r'\s*On\s+.*\d{4}.*wrote:.*', body, flags=re.IGNORECASE | re.DOTALL)[0]
        body = re.split(r'\s*El\s+.*\d{4}.*escribió:.*', body, flags=re.IGNORECASE | re.DOTALL)[0]

        for pattern in patterns:
            body = re.split(pattern, body, flags=re.IGNORECASE | re.DOTALL)[0]
            
        # 2. Limpiar líneas individuales (como las que empiezan con >)
        lines = body.split('\n')
        new_lines = []
        for line in lines:
            clean_line = line.strip()
            if clean_line.startswith(">"):
                continue
            if clean_line.startswith("---") or clean_line.startswith("___"):
                break
            new_lines.append(line)
        
        body = "\n".join(new_lines).strip()
        
    return body, files

def get_emails(ticket_id):
    messages = []
    mail = None
    try:
        # Conectar a IMAP
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(GMAIL_USER, GMAIL_APP_PASSWORD)
        
        # Primero Inbox
        status, _ = mail.select("INBOX")
        if status == "OK":
            # Buscar correos con el ticket_id en el asunto
            search_query = f'SUBJECT "[#{ticket_id}]"'
            status, data = mail.search(None, search_query)
            
            if status == "OK":
                for num in data[0].split():
                    status, msg_data = mail.fetch(num, "(RFC822)")
                    if status == "OK":
                        raw_email = msg_data[0][1]
                        msg = email.message_from_bytes(raw_email)
                        
                        sender = msg.get("From")
                        date = msg.get("Date")
                        msg_id = msg.get("Message-ID")
                        
                        body, files = parse_email_body(msg)
                        
                        # Determinar si es "mio" o "del proveedor"
                        is_me = GMAIL_ALIAS in sender or GMAIL_USER in sender
                        
                        messages.append({
                            "id": num.decode(),
                            "user": "Yo" if is_me else sender,
                            "message": body.strip(),
                            "files": "|".join(files) if files else None,
                            "created_at": date,
                            "is_me": is_me,
                            "message_id": msg_id
                        })
        
        # Intentar buscar en Enviados
        sent_box = None
        status, boxes = mail.list()
        if status == "OK":
            for box in boxes:
                box_str = box.decode()
                if '\\Sent' in box_str or 'Enviados' in box_str or 'Sent' in box_str:
                    # Extraer el nombre de la carpeta (está al final entre comillas o no)
                    sent_box = box_str.split(' "/" ')[-1].strip()
                    break
        
        if sent_box:
            status, _ = mail.select(sent_box)
            if status == "OK":
                search_query = f'SUBJECT "[#{ticket_id}]"'
                status, data = mail.search(None, search_query)
                if status == "OK":
                    for num in data[0].split():
                        status, msg_data = mail.fetch(num, "(RFC822)")
                        if status == "OK":
                            raw_email = msg_data[0][1]
                            msg = email.message_from_bytes(raw_email)
                            
                            date = msg.get("Date")
                            msg_id = msg.get("Message-ID")
                            body, files = parse_email_body(msg)
                            
                            # Evitar duplicados
                            if not any(m["message"] == body.strip() and m["created_at"] == date for m in messages):
                                messages.append({
                                    "id": num.decode() + "_sent",
                                    "user": "Yo",
                                    "message": body.strip(),
                                    "files": "|".join(files) if files else None,
                                    "created_at": date,
                                    "is_me": True,
                                    "message_id": msg_id
                                })
        
    except Exception as e:
        print(f"Error fetching emails: {e}")
    finally:
        if mail:
            try:
                mail.logout()
            except:
                pass
        
    # Ordenar por fecha de más antiguo a más nuevo para el chat
    from email.utils import parsedate_to_datetime
    
    def get_timestamp(msg):
        try:
            return parsedate_to_datetime(msg["created_at"])
        except:
            return 0
            
    messages.sort(key=get_timestamp)
    
    return messages

async def gmail_chat_sse(ticket_id: int):
    seen_ids = set()
    
    # Enviar el usuario actual primero
    yield f"data: {json.dumps({'current_user': 'Yo'})}\n\n"
    
    while True:
        try:
            messages = get_emails(ticket_id)
            
            for msg in messages:
                msg_id = msg.get("id")
                if msg_id not in seen_ids:
                    yield f"data: {json.dumps(msg)}\n\n"
                    seen_ids.add(msg_id)
            
            # Ping para mantener conexión y detectar desconexión del cliente
            yield ": ping\n\n"
                
        except Exception as e:
            yield f"data: {json.dumps({'Error': str(e)})}\n\n"
            
        await asyncio.sleep(3)

def send_gmail_message(ticket_id, destination_email, subject, message, files: List[UploadFile] = None, bcc: str = None):
    try:
        # Buscar el último Message-ID para este ticket para poder responder
        all_emails = get_emails(ticket_id)
        last_msg_id = None
        if all_emails:
            last_msg_id = all_emails[-1].get("message_id")

        msg = MIMEMultipart()
        msg['From'] = f"Garantias MgLab <{GMAIL_ALIAS}>"
        msg['To'] = destination_email
        if bcc:
            msg['Bcc'] = bcc
        msg['Subject'] = f"[#{ticket_id}] MGLAB"
        msg.add_header('Reply-To', GMAIL_ALIAS)
        
        if last_msg_id:
            msg.add_header('In-Reply-To', last_msg_id)
            msg.add_header('References', last_msg_id)

        msg.attach(MIMEText(message, 'plain'))
        
        if files:
            for file in files:
                try:
                    content = file.file.read()
                    filename = file.filename
                    content_type = file.content_type or 'application/octet-stream'
                    
                    part = MIMEApplication(content, Name=filename)
                    part['Content-Disposition'] = f'attachment; filename="{filename}"'
                    msg.attach(part)
                except Exception as e:
                    print(f"Error attaching uploaded file {file.filename}: {e}")

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        return {"message": "Correo enviado exitosamente"}
    except Exception as e:
        return {"Error": str(e)}

def get_gmail_attachment(ticket_id, msg_num, filename):
    mail = None
    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(GMAIL_USER, GMAIL_APP_PASSWORD)
        
        # Primero buscar en Inbox, luego en Enviados si no está
        box_options = ["INBOX"]
        sent_box = None
        status, boxes = mail.list()
        if status == "OK":
            for box in boxes:
                box_str = box.decode()
                if '\\Sent' in box_str or 'Enviados' in box_str or 'Sent' in box_str:
                    sent_box = box_str.split(' "/" ')[-1].strip()
                    box_options.append(sent_box)
                    break
        
        for box in box_options:
            if not box: continue
            status, _ = mail.select(box)
            if status != "OK": continue
            
            status, data = mail.fetch(msg_num, "(RFC822)")
            if status == "OK" and data and data[0]:
                raw_email = data[0][1]
                if not raw_email: continue
                
                msg = email.message_from_bytes(raw_email)
                for part in msg.walk():
                    # Usar get_filename y limpiar posibles whitespaces o encodings
                    fn = part.get_filename()
                    if fn and fn.strip() == filename.strip():
                        content = part.get_payload(decode=True)
                        content_type = part.get_content_type()
                        from fastapi.responses import Response
                        return Response(content=content, media_type=content_type, headers={
                            "Content-Disposition": f'attachment; filename="{filename}"'
                        })
        
        return {"Error": "Archivo no encontrado"}
    except Exception as e:
        return {"Error": str(e)}
    finally:
        if mail:
            mail.logout()
