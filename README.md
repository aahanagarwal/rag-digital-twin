# Digital Twin of Richard Feynman

_An Advanced RAG-Powered AI Conversational Agent_

Welcome to the **Digital Twin of Richard Feynman**. This project is a full-stack, voice-enabled AI application designed to provide an interactive, deeply engaging conversational experience modeled after the legendary theoretical physicist, Richard Feynman.

This system goes far beyond a simple wrapper. It features a fully decoupled architecture, advanced multi-stage Retrieval-Augmented Generation (RAG), timeline-aware psychological constraints, and an asynchronous memory distillation engine.

---

## 🚀 Key Technical Features & Achievements

### 1. Architectural Decoupling

- **Frontend**: A highly polished, responsive Next.js App Router application leveraging Tailwind CSS and Recharts.
- **Backend**: A native Python FastAPI backend that directly executes deep learning models for NLP without relying on slow Node.js bindings.

### 2. Multi-Stage Hybrid RAG Pipeline & Two-Stage Generation Engine

The system employs a state-of-the-art 4-stage RAG funnel to guarantee factual accuracy and semantic depth without breaking persona:

1. **HyDE (Hypothetical Document Embeddings)**: The query is pre-processed by the LLM to generate a hypothetical answer in Feynman's voice, which acts as a drastically superior semantic search vector.
2. **Dense Vector Search**: We bypass standard APIs using raw REST calls to Pinecone Serverless (`cosine` metric). It executes a **Dense Vector Search (E5-large)** for deep semantic meaning, fully compatible with Pinecone's Integrated Inference models.
3. **Cross-Encoder Reranking**: The top 15 results are pushed through a strict `ms-marco-MiniLM` cross-encoder, distilling the context down to the top 3 most hyper-relevant paragraphs before LLM generation.
4. **Two-Stage Generation & Fluid Prompting**: To prevent the LLM from hallucinating while juggling a complex persona, we split its "brain" into two sequential LangGraph nodes. The first node acts as an emotionless physics engine (Temp 0.0), extracting hard facts. The second node translates those cold facts into Feynman's passionate Brooklyn lingo (Temp 0.8). All prompts are centralized in `prompts.py` using fluid natural-language guardrails instead of rigid boolean overrides, allowing seamless transitions between complex physics and casual small talk.

### 3. Asynchronous "Subconscious" Memory Engine

- **Short-Term Context**: Handled via a local `sessions.json` state machine on the FastAPI backend, completely removing reliance on external caches like Redis or bloated React client states.
- **Long-Term Distillation**: Every message triggers a background LangGraph `distill` node. An advanced Llama-3 model operates in strict JSON-mode, scanning the conversation for permanent facts about the user (e.g., name, hobbies, profession) and upserting them into a Supabase PostgreSQL database.
- **Visual Matrix**: The Next.js frontend constantly polls the database to render a real-time "Memory Dashboard", offering total transparency into the AI's subconscious mind.

### 4. Timeline-Aware Prompt Engineering

The system utilizes aggressive XML-structured prompt engineering. The persona is strictly locked into the year of his death (1988). If asked about modern phenomena (like quantum computing or ChatGPT), the agent is mathematically forbidden from pretending he knows about them. Instead, he reacts with genuine shock and attempts to theorize about them based entirely on 1980s physics.

### 5. Voice Integration & The ElevenLabs Decision

The project features a fully native Speech-to-Text (STT) and Text-to-Speech (TTS) loop.

- **STT**: User audio is uploaded via `multipart/form-data` to the backend and processed instantly by **Groq Whisper (`whisper-large-v3`)**.
- **TTS**: The backend streams the generated text to the ultra-low latency **Groq Voice API (`canopylabs/orpheus-v1-english`)** for audio output.
- **Why not ElevenLabs?**: The original design intended to use **ElevenLabs** for precise, 1:1 voice cloning of Richard Feynman's actual vocal cords. However, custom voice cloning (Instant Voice Cloning) requires a paid subscription tier. To keep this project entirely free and open-source for evaluators, we explicitly implemented the free Groq TTS model instead. If budget constraints were removed, the system is architecturally ready to swap in an ElevenLabs `Voice ID` for an absolutely perfect auditory replica.

### 6. Official Data Sources & Corpus

To ensure hyper-accurate physics logic and a perfect linguistic replication of his teaching style, the entire RAG pipeline is exclusively powered by **The Feynman Lectures on Physics**.

- All Science Data (Dense vectors) and Lingo Data (Few-Shot Prompting Transcripts) are officially sourced from the online archives at **[feynmanlectures.caltech.edu](https://www.feynmanlectures.caltech.edu/)**.
- An automated Python scraping script (`backend/scripts/scrape_feynman.py`) is provided to fetch the chapters cleanly and format them for the Vector DB.

---

## 💻 Installation & Setup

### Prerequisites

- Node.js (v18+)
- Python (v3.10+)
- API Keys: **Groq**, **Pinecone**, **Supabase**

### 1. Backend Initialization (FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Database Initialization (Supabase)

Navigate to your Supabase SQL Editor and execute the provided schema script located at:
`backend/data/supabase_schema.sql`

### 3. Frontend Initialization (Next.js)

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

---

## 🛠️ Technology Stack

- **Frontend**: Next.js (App Router), React, Tailwind CSS, Recharts, Lucide Icons.
- **Backend**: Python, FastAPI, Uvicorn.
- **AI / LLM**: Groq (Llama-3 70B, Whisper-large-v3, Orpheus TTS).
- **Agent Orchestration**: LangGraph, LangChain.
- **Vector / RAG Models**: SentenceTransformers (multilingual-e5-large), MS-MARCO Cross-Encoder.
- **Databases**: Pinecone (Serverless Vector DB), Supabase (PostgreSQL).
