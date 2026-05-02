import os
import pdfplumber
import chromadb
import camelot
from chromadb.utils import embedding_functions
from app.config import Config

print("Mulai proses indexing dokumen...")


# -------------------------------------------------
# INIT CHROMA DB
# -------------------------------------------------
client = chromadb.PersistentClient(
    path=Config.VECTOR_DB
)


embedding = embedding_functions.OpenAIEmbeddingFunction(
    api_key=Config.OPENAI_API_KEY,
    model_name=Config.EMBEDDING_MODEL
)

collection = client.get_or_create_collection(
    name="rag_cache",
    embedding_function=embedding
)

docs_folder = Config.DOCS_FOLDER


# -------------------------------------------------
# CHUNKING
# -------------------------------------------------
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

            # overlap
            current_chunk = current_chunk[-overlap:] + "\n" + p + "\n"

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks


# -------------------------------------------------
# CLEAN TABLE ROW
# -------------------------------------------------
def clean_row(row):

    cells = []

    for cell in row:

        if not cell:
            continue

        cell = str(cell).replace("\n", " ").strip()

        if cell:
            cells.append(cell)

    if not cells:
        return None

    return " | ".join(cells)


# -------------------------------------------------
# MERGE MULTILINE ROWS
# -------------------------------------------------
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


# -------------------------------------------------
# CAMELot TABLE EXTRACTION
# -------------------------------------------------
def extract_tables_camelot(path):

    table_rows = []

    try:

        tables = camelot.read_pdf(
            path,
            pages="all",
            flavor="stream"
        )

        for table in tables:

            df = table.df
            rows = []

            for _, row in df.iterrows():

                clean = clean_row(row)

                if clean:
                    rows.append(clean)

            rows = merge_rows(rows)

            table_rows.extend(rows)

    except Exception as e:

        print("Camelot gagal:", e)

    return table_rows


# -------------------------------------------------
# TABLE EXTRACTION PIPELINE
# -------------------------------------------------
def extract_tables_as_block(pdf_document, file_path):

    table_rows = extract_tables_camelot(file_path)

    # Fallback ke pdfplumber jika camelot kosong
    if not table_rows:

        for page_num, page in enumerate(pdf_document.pages, 1):

            tables = page.extract_tables()

            if not tables:
                continue

            for table in tables:

                for row in table:

                    clean = clean_row(row)

                    if clean:
                        table_rows.append(clean)

    if not table_rows:
        return None

    # Gabungkan semua row menjadi 1 block
    table_block = "\n".join(table_rows)

    return f"\n\nTABEL DATA:\n{table_block}\n\n"


# -------------------------------------------------
# INDEX DOCUMENTS
# -------------------------------------------------
doc_id = 0
total_chunks = 0

for file in os.listdir(docs_folder):

    if not file.endswith(".pdf"):
        continue

    path = os.path.join(docs_folder, file)

    print(f"\nProcessing: {file}")

    with pdfplumber.open(path) as pdf:

        full_text = ""

        for page in pdf.pages:

            text = page.extract_text()

            if text:
                full_text += text + "\n"

        # Extract table block
        table_block = extract_tables_as_block(pdf, path)

    if not full_text.strip():

        print("Tidak ada teks ditemukan di PDF")
        continue

    # Tambahkan tabel ke teks utama
    if table_block:
        full_text += table_block

    # Chunking
    chunks = chunk_text(full_text)

    print(f"   ➜ {len(chunks)} chunks dibuat")

    # -------------------------------------------------
    # INSERT TO CHROMA
    # -------------------------------------------------
    batch_size = 100

    for i in range(0, len(chunks), batch_size):

        batch_chunks = chunks[i:i + batch_size]

        batch_ids = [
            f"doc_{doc_id + j}"
            for j in range(len(batch_chunks))
        ]

        collection.add(
            documents=batch_chunks,
            metadatas=[{"source": file} for _ in batch_chunks],
            ids=batch_ids
        )

        doc_id += len(batch_chunks)
        total_chunks += len(batch_chunks)

        print(f"   ➜ Batch {i // batch_size + 1}: {len(batch_chunks)} chunks ditambahkan")


# -------------------------------------------------
# FINAL REPORT
# -------------------------------------------------
print("\nIndexing selesai")
print("Total chunks:", total_chunks)
print("Folder docs:", docs_folder)

count = collection.count()

print(f"Verifikasi - Total chunks di DB: {count}")