import os
import glob
import uuid
import requests
from dotenv import load_dotenv
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
import sys

# Removed SpladeEncoder import as we are using Dense-only index

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))

def get_pinecone_host(api_key, index_name="feynman-twin-index"):
    headers = {"Api-Key": api_key, "Content-Type": "application/json"}
    res = requests.get(f"https://api.pinecone.io/indexes/{index_name}", headers=headers)
    if res.status_code != 200:
        print(f"Error getting Pinecone host: {res.text}")
        return None
    return res.json().get("host")

def extract_text(file_path):
    ext = file_path.lower().split('.')[-1]
    if ext == 'txt':
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    elif ext == 'pdf':
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
        return text
    return ""

def main():
    print("Loading model (this might take a moment)...")
    dense_model = SentenceTransformer('intfloat/multilingual-e5-large')
    
    api_key = os.getenv("PINECONE_API_KEY")
    if not api_key:
        print("Error: PINECONE_API_KEY not found in backend/.env.local")
        return
        
    host = get_pinecone_host(api_key)
    if not host:
        return
        
    headers = {"Api-Key": api_key, "Content-Type": "application/json"}
    
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data", "science")
    if not os.path.exists(data_dir):
        os.makedirs(data_dir, exist_ok=True)
        print(f"Created directory {data_dir}. Please add files and run again.")
        return
        
    files = glob.glob(os.path.join(data_dir, "*.*"))
    if not files:
        print("No files found in data/science directory. Please add .txt or .pdf files.")
        return
        
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    
    vectors_to_upsert = []
    
    print(f"Found {len(files)} files to process.")
    for file_path in files:
        if not (file_path.endswith('.txt') or file_path.endswith('.pdf')):
            continue
            
        print(f"Processing {os.path.basename(file_path)}...")
        text = extract_text(file_path)
        if not text.strip():
            continue
            
        chunks = splitter.split_text(text)
        
        for i, chunk in enumerate(chunks):
            # E5 uses "passage: " prefix for indexing
            dense_vec = dense_model.encode([f"passage: {chunk}"])[0].tolist()
            
            vec_id = str(uuid.uuid4())
            
            vectors_to_upsert.append({
                "id": vec_id,
                "values": dense_vec,
                "metadata": {
                    "text": chunk,
                    "source": os.path.basename(file_path)
                }
            })
            
    if not vectors_to_upsert:
        print("No vectors to upsert.")
        return
        
    # Batch upsert (Pinecone limit is usually 100 vectors per request)
    batch_size = 50
    print(f"Upserting {len(vectors_to_upsert)} chunks to Pinecone...")
    
    for i in range(0, len(vectors_to_upsert), batch_size):
        batch = vectors_to_upsert[i:i+batch_size]
        payload = {"vectors": batch}
        res = requests.post(f"https://{host}/vectors/upsert", headers=headers, json=payload)
        if res.status_code == 200:
            print(f"Upserted batch {i//batch_size + 1}")
        else:
            print(f"Error upserting batch: {res.text}")

    print("Ingestion complete!")

if __name__ == "__main__":
    main()
