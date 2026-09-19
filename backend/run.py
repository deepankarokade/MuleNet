import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    is_dev = os.environ.get("ENV", "development").lower() == "development"
    print(f"Starting MuleNet Financial Forensics Engine Backend on http://{host}:{port} ...")
    uvicorn.run("app.main:app", host=host, port=port, reload=is_dev)

