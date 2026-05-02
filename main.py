import uvicorn
import os
from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from index import run_indexing
from pydantic import BaseModel
from typing import Optional

from app.engine import RAGEngine

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

engine = RAGEngine()


@app.on_event("startup")
def auto_index():
    try:
        count = engine.collection.count()
        print(f"[Startup] Total chunks terdeteksi: {count}")

        if count == 0:
            print("[Startup] Collection kosong, mulai indexing...")
            run_indexing()

            engine.collection = engine.client.get_or_create_collection(
                name="rag_cache",
                embedding_function=engine.embedding
            )

            print(f"[Startup] Indexing selesai. Sekarang ada {engine.collection.count()} chunks.")

        else:
            print("[Startup] Collection sudah ada, skip indexing.")

    except Exception as e:
        print(f"[Startup Error] Terjadi kesalahan: {e}")


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
    """Upload file PDF baru dan jalankan ulang proses indexing."""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Hanya file PDF yang diperbolehkan")

    os.makedirs("docs", exist_ok=True)
    file_path = f"docs/{file.filename}"

    # Simpan file
    with open(file_path, "wb") as f:
        f.write(await file.read())

    try:
        run_indexing()

        engine.collection = engine.client.get_or_create_collection(
            name="rag_cache",
            embedding_function=engine.embedding
        )
    except Exception as e:
        print(f"Error saat indexing file baru: {e}")
        raise HTTPException(status_code=500, detail="Gagal mengindeks file baru")

    return {
        "status": "success",
        "message": f"File {file.filename} uploaded & indexed"
    }


@app.post("/reindex")
def reindex_docs():
    """Membangun ulang seluruh index dari folder docs."""
    try:
        run_indexing()
        # Refresh database di memory
        engine.collection = engine.client.get_or_create_collection(
            name="rag_cache",
            embedding_function=engine.embedding
        )
        return {
            "status": "success",
            "message": "Reindex successfully"
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
        reload=False
    )
