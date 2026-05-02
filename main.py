import uvicorn
from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional
import os
import subprocess

from app.engine import RAGEngine

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

engine = RAGEngine()


@app.on_event("startup")
def auto_index():
    try:
        count = engine.collection.count()
        print(f"[Startup] Total chunks: {count}")

        if count == 0:
            print("[Startup] Collection kosong, mulai indexing...")

            result = subprocess.run(
                ["python", "index.py"],
                capture_output=True,
                text=True,
                cwd=os.getcwd()
            )

            print(result.stdout)
            if result.stderr:
                print("Index Error:", result.stderr)

            print("[Startup] Indexing selesai")

        else:
            print("[Startup] Collection sudah ada, skip indexing")

    except Exception as e:
        print(f"[Startup Error] {e}")


class ChatRequest(BaseModel):
    question: str
    session_id: Optional[str] = "default"


@app.get("/", response_class=HTMLResponse)
async def serve_home(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "province": "Maluku Utara"
        }
    )


@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    # Validasi
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Hanya file PDF yang diperbolehkan")

    file_path = f"docs/{file.filename}"

    # Simpan file
    with open(file_path, "wb") as f:
        f.write(await file.read())

    # Panggil script indexing
    try:
        result = subprocess.run(
            ["python", "index.py"],
            capture_output=True,
            text=True,
            cwd=os.getcwd()
        )
        print(result.stdout)
        if result.stderr:
            print("Error:", result.stderr)
    except Exception as e:
        print(f"Error running index.py: {e}")

    return {
        "status": "success",
        "message": "File uploaded & indexed"
    }


@app.post("/reindex")
def reindex_docs():
    """Rebuild index dengan menjalankan index.py"""
    try:
        result = subprocess.run(
            ["python", "index.py"],
            capture_output=True,
            text=True,
            cwd=os.getcwd()
        )
        print(result.stdout)
        if result.stderr:
            print("Error:", result.stderr)

        return {
            "status": "success",
            "message": "Index berhasil dibangun ulang",
            "output": result.stdout
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat")
async def chat_endpoint(request: ChatRequest):

    if not request.question.strip():
        raise HTTPException(
            status_code=400,
            detail="Pertanyaan tidak boleh kosong"
        )

    try:
        result = engine.ask(request.question)
        return result

    except Exception as e:
        print(f"[API ERROR] {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Terjadi kesalahan internal: {str(e)}"
        )


if __name__ == "__main__":
    print(f"Docs folder: docs/")
    print(f"Vector DB: ./vector_db")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
