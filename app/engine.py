import requests
import chromadb
import cohere
from chromadb.utils import embedding_functions
from app.config import Config


class RAGEngine:

    def __init__(self):
        print("RAG Engine Initialized")

        self.client = chromadb.PersistentClient(
            path=Config.VECTOR_DB
        )

        # Embedding Function
        self.embedding = embedding_functions.OpenAIEmbeddingFunction(
            api_key=Config.OPENAI_API_KEY,
            model_name=Config.EMBEDDING_MODEL
        )

        # Collection
        self.collection = self.client.get_or_create_collection(
            name="rag_cache",
            embedding_function=self.embedding
        )

        print(f"Collection ready: {self.collection.count()} chunks")

        try:
            self.cohere = cohere.Client(
                Config.COHERE_API_KEY
            )
            print("Cohere reranker ready")
        except Exception as e:
            print("Cohere client gagal load:", e)
            self.cohere = None

    # -------------------------------------------------
    # SEARCH DOCUMENT
    # -------------------------------------------------

    def search(self, query, k=20):
        """Cari dokumen paling relevan dari vector DB"""

        if self.collection.count() == 0:
            print("Collection kosong!")
            return []

        results = self.collection.query(
            query_texts=[query],
            n_results=min(k, self.collection.count())  # Jangan minta lebih dari yang ada
        )

        # Handle jika tidak ada hasil
        if not results['documents'] or not results['documents'][0]:
            return []

        docs = results["documents"][0]
        metas = results["metadatas"][0]

        chunks = []

        for doc, meta in zip(docs, metas):

            chunks.append({
                "text": doc,
                "source": meta.get("source", "unknown")
            })

        return chunks

    def rerank_cohere(self, query, chunks, top_k=5):

        if not self.cohere or not chunks:
            return chunks

        docs = [c["text"] for c in chunks]

        response = self.cohere.rerank(
            model=Config.RERANK_MODELS["complex"],
            query=query,
            documents=docs,
            top_n=top_k
        )

        reranked = []

        for r in response.results:
            reranked.append(chunks[r.index])

        return reranked

    # -------------------------------------------------
    # FORMAT CONTEXT
    # -------------------------------------------------

    def build_context(self, chunks, max_chars=4000):
        """Format retrieval menjadi context LLM"""

        context_parts = []
        current_length = 0

        for i, chunk in enumerate(chunks, 1):

            source = chunk["source"]
            text = chunk["text"].strip()

            part = f"[Sumber {i}: {source}]\n{text}\n"

            if current_length + len(part) > max_chars:
                break

            context_parts.append(part)
            current_length += len(part)

        return "\n".join(context_parts)

    # -------------------------------------------------
    # QUESTION CLASSIFIER
    # -------------------------------------------------

    def classify_question(self, question: str) -> str:
        """Menentukan kompleksitas pertanyaan"""

        q = question.lower()

        complex_keywords = [
            "bandingkan",
            "analisis",
            "tren",
            "dampak",
            "mengapa",
            "kenapa",
            "evaluasi",
            "ringkas"
        ]

        medium_keywords = [
            "jelaskan",
            "faktor",
            "program",
            "strategi",
            "kebijakan",
            "indikator",
            "tujuan",
            "peran"
        ]

        simple_keywords = [
            "berapa",
            "apa",
            "kapan",
            "siapa",
            "dimana"
        ]

        for word in complex_keywords:
            if word in q:
                return "complex"

        for word in medium_keywords:
            if word in q:
                return "medium"

        for word in simple_keywords:
            if word in q:
                return "simple"

        # fallback
        return "medium"

    # -------------------------------------------------
    # ADAPTIVE RERANK
    # -------------------------------------------------

    def adaptive_rerank(self, route, query, chunks):

        if not chunks:
            return chunks

        # SIMPLE → tidak perlu rerank
        if route == "simple":
            print("Skip rerank (simple question)")
            return chunks[:5]

        # MEDIUM → MiniLM
        if route == "medium":
            print("MiniLM rerank")
            return self.rerank_cohere(query, chunks)

        # COMPLEX → Cohere
        if route == "complex":
            print("Cohere rerank")
            return self.rerank_cohere(query, chunks)

        return chunks[:5]

    # -------------------------------------------------
    # SEND TO N8N
    # -------------------------------------------------

    def send_to_n8n(self, route, payload):
        """Kirim request ke webhook n8n"""

        webhook = Config.N8N_WEBHOOKS.get(route)

        if not webhook:
            raise Exception("Webhook tidak ditemukan")

        response = requests.post(
            webhook,
            json=payload,
            timeout=60
        )

        data = response.json()

        # Normalisasi response dari n8n
        if isinstance(data, list) and len(data) > 0:
            answer = data[0].get("output", "")
        elif isinstance(data, dict):
            answer = data.get("output", "")
        else:
            answer = ""

        return {
            "answer": answer
        }

    # -------------------------------------------------
    # MAIN ASK FUNCTION
    # -------------------------------------------------

    def ask(self, question, session_id="default"):
        """Pipeline utama RAG"""

        print("\n--- NEW QUESTION ---")
        print("QUESTION:", question)

        # Cek dulu apakah collection punya data
        count = self.collection.count()
        print(f"Total chunks di DB: {count}")

        if count == 0:
            return {"answer": "Database kosong. Silakan upload dokumen terlebih dahulu."}

        # 1 Retrieval
        chunks = self.search(question, k=20)
        print(f"Retrieved {len(chunks)} chunks")

        # 2 Classify Question
        route = self.classify_question(question)

        # 3 Adaptive Rerank
        chunks = self.adaptive_rerank(route, question, chunks)
        print(f"Final Chunks Used: {len(chunks)}")

        # 4 Build Context
        context = self.build_context(chunks)

        print("ROUTE:", route)
        print("CONTEXT LENGTH:", len(context))

        # 4 Payload
        payload = {
            "question": question,
            "rag_context": context,
            "session_id": session_id
        }

        # 5 Send to n8n
        result = self.send_to_n8n(route, payload)

        return result
