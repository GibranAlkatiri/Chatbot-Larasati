import os
import pdfplumber
import chromadb
import camelot
import shutil
from chromadb.utils import embedding_functions
from app.config import Config


def chunk_text(text, chunk_size=1200, overlap=150):
    paragraphs = text.split("\n")
    chunks = []
    current_chunk = ""

    for p in paragraphs:
        p = p.strip()
        if not p:
            continue

        if len(current_chunk) + len(p) < chunk_size:
            current_chunk += p + "\n"
        else:
            chunks.append(current_chunk.strip())
            current_chunk = current_chunk[-overlap:] + "\n" + p + "\n"

    if current_chunk:
        chunks.append(current_chunk.strip())
    return chunks


def clean_row(row):
    cells = []
    for cell in row:
        if not cell:
            continue
        cell = str(cell).replace("\n", " ").strip()
        if cell:
            cells.append(cell)
    return " | ".join(cells) if cells else None


def merge_rows(rows):
    merged = []
    buffer = ""
    for row in rows:
        if "|" not in row:
            buffer += " " + row
            continue
        if buffer:
            row = buffer + " " + row
            buffer = ""
        merged.append(row)
    return merged


def extract_tables_camelot(path):
    table_rows = []
    try:
        tables = camelot.read_pdf(path, pages="all", flavor="stream")
        for table in tables:
            df = table.df
            rows = [clean_row(row) for _, row in df.iterrows() if clean_row(row)]
            rows = merge_rows(rows)
            table_rows.extend(rows)
    except Exception as e:
        print("Camelot gagal:", e)
    return table_rows


def extract_tables_as_block(pdf_document, file_path):
    table_rows = extract_tables_camelot(file_path)

    # Fallback ke pdfplumber
    if not table_rows:
        for page in pdf_document.pages:
            tables = page.extract_tables()
            if not tables: continue
            for table in tables:
                for row in table:
                    clean = clean_row(row)
                    if clean: table_rows.append(clean)

    if not table_rows:
        return None

    return f"\n\nTABEL DATA:\n" + "\n".join(table_rows) + "\n\n"


# -------------------------------------------------
# FUNGSI UTAMA (MAIN ENTRY POINT)
# -------------------------------------------------

def run_indexing():
    print("Start Indexing...")

    # Init Client
    client = chromadb.PersistentClient(path=Config.VECTOR_DB)

    # Hapus collection lama jika ada (opsional, untuk clean build)
    try:
        client.delete_collection("rag_cache")
        print("Collection lama dihapus")
    except:
        print("Tidak ada collection lama untuk dihapus")

    embedding = embedding_functions.OpenAIEmbeddingFunction(
        api_key=Config.OPENAI_API_KEY,
        model_name=Config.EMBEDDING_MODEL
    )

    collection = client.get_or_create_collection(
        name="rag_cache",
        embedding_function=embedding
    )

    docs_folder = Config.DOCS_FOLDER
    doc_id = 0
    total_chunks = 0

    if not os.path.exists(docs_folder):
        print(f"Error: Folder {docs_folder} tidak ditemukan!")
        return

    for file in os.listdir(docs_folder):
        if not file.endswith(".pdf"):
            continue

        path = os.path.join(docs_folder, file)
        print(f"\nProcessing: {file}")

        try:
            with pdfplumber.open(path) as pdf:
                full_text = ""
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        full_text += text + "\n"

                table_block = extract_tables_as_block(pdf, path)

            if not full_text.strip():
                print(f"Skipping {file}: Tidak ada teks.")
                continue

            if table_block:
                full_text += table_block

            chunks = chunk_text(full_text)
            print(f"   ➜ {len(chunks)} chunks dibuat")

            # Insert ke Chroma
            batch_size = 100
            for i in range(0, len(chunks), batch_size):
                batch_chunks = chunks[i:i + batch_size]
                # Gunakan nama file agar ID unik dan tidak tertukar antar dokumen
                batch_ids = [f"{file}_{doc_id + j}" for j in range(len(batch_chunks))]

                collection.add(
                    documents=batch_chunks,
                    metadatas=[{"source": file} for _ in batch_chunks],
                    ids=batch_ids
                )
                doc_id += len(batch_chunks)
                total_chunks += len(batch_chunks)

        except Exception as e:
            print(f"Gagal memproses {file}: {e}")

    print(f"\nIndexing selesai. Total chunks: {total_chunks}")
    print(f"Verifikasi database: {collection.count()} data tersimpan.")


if __name__ == "__main__":
    run_indexing()
