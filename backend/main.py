from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path='.env.local')

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.agent.graph import FeynmanAgent

agent = FeynmanAgent()
workflow = agent.build_graph()

class ChatRequest(BaseModel):
    userId: str
    sessionId: str
    message: str
    chatHistory: list = []

class LoginRequest(BaseModel):
    userId: str

@app.post("/login")
async def login_endpoint(request: LoginRequest):
    user_id = request.userId
    # Check if user exists
    user_check = agent.supabase.table("users").select("id").eq("id", user_id).execute()
    if not user_check.data:
        # Create user explicitly on login
        agent.supabase.table("users").insert({"id": user_id}).execute()
    return {"status": "success", "userId": user_id}

import json
from pathlib import Path

# Local Short-Term Memory Store
SESSIONS_FILE = Path(__file__).parent / "data" / "sessions.json"

def load_sessions():
    if SESSIONS_FILE.exists():
        with open(SESSIONS_FILE, "r") as f:
            return json.load(f)
    return {}

def save_sessions(data):
    # Ensure directory exists
    SESSIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(SESSIONS_FILE, "w") as f:
        json.dump(data, f)

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    sessions = load_sessions()
    
    # Retrieve local short-term memory for this session
    session_id = request.sessionId
    if session_id not in sessions:
        sessions[session_id] = []
        
    chat_history = sessions[session_id]
    
    initial_state = {
        "user_id": request.userId,
        "session_id": session_id,
        "query": request.message,
        "chat_history": chat_history
    }
    
    # Run the graph
    final_state = workflow.invoke(initial_state)
    response_text = final_state["response"]
    
    # Append to local short term memory
    chat_history.append({"role": "user", "content": request.message})
    chat_history.append({"role": "assistant", "content": response_text})
    sessions[session_id] = chat_history
    save_sessions(sessions)
    
    return {"response": response_text}

@app.get("/dashboard")
async def get_dashboard(userId: str):
    user_facts = agent.supabase.table("long_term_memory").select("*").eq("user_id", userId).execute()
    
    nodes = []
    for f in user_facts.data or []:
        nodes.append({
            "name": f.get("fact_key", "Fact"),
            "value": f.get("confidence_score", 0.9) * 100,
            "detail": f.get("fact_value", ""),
            "timestamp": f.get("created_at", "")
        })
        
    return {
        "nodes": nodes,
        "semanticTrends": [
            {"topic": "Physics", "weight": 85},
            {"topic": "Mathematics", "weight": 60},
            {"topic": "Curiosity", "weight": 95},
            {"topic": "Teaching", "weight": 70},
            {"topic": "Music (Bongos)", "weight": 40},
        ]
    }

@app.get("/health")
async def health():
    return {"status": "ok"}

from fastapi import File, UploadFile
from fastapi.responses import Response
import requests

class TTSRequest(BaseModel):
    text: str

from fastapi import HTTPException

@app.post("/voice/tts")
async def text_to_speech(request: TTSRequest):
    # Groq TTS using the new CanopyLabs Orpheus model
    headers = {
        "Authorization": f"Bearer {os.getenv('GROQ_API_KEY')}",
        "Content-Type": "application/json"
    }
    
    # Orpheus model has a 200 character limit
    input_text = request.text[:200]
    
    payload = {
        "model": "canopylabs/orpheus-v1-english",
        "input": input_text,
        "voice": "austin", 
        "response_format": "wav"
    }
    
    res = requests.post("https://api.groq.com/openai/v1/audio/speech", headers=headers, json=payload)
    if not res.ok:
        print(f"TTS Error: {res.text}")
        raise HTTPException(status_code=500, detail="TTS generation failed")
        
    return Response(content=res.content, media_type="audio/wav")

@app.post("/voice/stt")
async def speech_to_text(audio: UploadFile = File(...)):
    # Groq STT using whisper-large-v3
    try:
        content = await audio.read()
        file_tuple = (audio.filename, content, audio.content_type)
        
        transcription = agent.groq_client.audio.transcriptions.create(
            file=file_tuple,
            model="whisper-large-v3",
            prompt="Specify context or spelling if needed",
            response_format="json",
            temperature=0.0
        )
        return {"text": transcription.text}
    except Exception as e:
        return {"error": str(e)}
