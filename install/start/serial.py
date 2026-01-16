import wmi
import pythoncom
from fastapi import FastAPI

app = FastAPI()

@app.get("/getSerial")
def get_serial():
    return get_serial()
def get_serial():
    pythoncom.CoInitialize()
    c = wmi.WMI()
    serial = c.Win32_BIOS()[0].SerialNumber
    pythoncom.CoUninitialize()
    return serial

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)