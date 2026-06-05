import os
import json
import time
import requests
from langgraph.graph import StateGraph, END
from typing import TypedDict, List
from groq import Groq
from sentence_transformers import SentenceTransformer
from supabase import create_client

from app.rag.hyde import HyDEGenerator
from app.rag.cross_encoder import Reranker
from app.agent.prompts import (
    GENERATE_SCIENCE_PROMPT_TEMPLATE,
    RESHAPE_LINGO_SYSTEM_PROMPT,
    RESHAPE_LINGO_USER_PROMPT_TEMPLATE,
    DISTILL_PROMPT_TEMPLATE
)

class AgentState(TypedDict):
    user_id: str
    session_id: str
    query: str
    chat_history: List[dict]
    hyde_query: str
    retrieved_chunks: List[str]
    reranked_chunks: List[str]
    factual_response: str
    response: str

class FeynmanAgent:
    def __init__(self):
        self.groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.hyde = HyDEGenerator()
        self.dense = SentenceTransformer('intfloat/multilingual-e5-large')
        self.reranker = Reranker()
        
        self.pinecone_api_key = os.getenv("PINECONE_API_KEY")
        self.pinecone_headers = {"Api-Key": self.pinecone_api_key, "Content-Type": "application/json"}
        self.index_name = "feynman-twin-index"
        
        self.supabase = create_client(os.getenv("NEXT_PUBLIC_SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
        
        self.host = None

    def get_host(self):
        if self.host: return self.host
        res = requests.get(f"https://api.pinecone.io/indexes/{self.index_name}", headers=self.pinecone_headers).json()
        self.host = res.get("host")
        return self.host

    def build_graph(self):
        workflow = StateGraph(AgentState)
        
        workflow.add_node("hyde", self.run_hyde)
        workflow.add_node("retrieve", self.run_retrieve)
        workflow.add_node("rerank", self.run_rerank)
        workflow.add_node("generate_science", self.run_generate_science)
        workflow.add_node("reshape_lingo", self.run_reshape_lingo)
        workflow.add_node("distill", self.run_distill)
        
        workflow.set_entry_point("hyde")
        workflow.add_edge("hyde", "retrieve")
        workflow.add_edge("retrieve", "rerank")
        workflow.add_edge("rerank", "generate_science")
        workflow.add_edge("generate_science", "reshape_lingo")
        workflow.add_edge("reshape_lingo", "distill")
        workflow.add_edge("distill", END)
        
        return workflow.compile()

    def run_hyde(self, state: AgentState):
        print("🧠 1. Generating HyDE...")
        query = state["query"]
        hyde_query = self.hyde.generate(query)
        return {"hyde_query": hyde_query}

    def run_retrieve(self, state: AgentState):
        print("🔍 2. Retrieving Dense...")
        query = state["query"]
        hyde_query = state["hyde_query"]
        
        search_query = f"{query}\n{hyde_query}"
        
        dense_vec = self.dense.encode([f"query: {search_query}"])[0].tolist()
        
        host = self.get_host()
        if host:
            payload = {
                "vector": dense_vec,
                "topK": 15,
                "includeMetadata": True
            }
            res = requests.post(f"https://{host}/query", headers=self.pinecone_headers, json=payload).json()
            matches = res.get("matches", [])
            chunks = [match["metadata"]["text"] for match in matches if "metadata" in match]
        else:
            chunks = []
            
        return {"retrieved_chunks": chunks}

    def run_rerank(self, state: AgentState):
        print("⚖️ 3. Reranking top chunks...")
        query = state["query"]
        chunks = state.get("retrieved_chunks", [])
        if not chunks:
            return {"reranked_chunks": []}
            
        reranked = self.reranker.rerank(query, chunks, top_k=3)
        return {"reranked_chunks": reranked}

    def run_generate_science(self, state: AgentState):
        print("📝 4a. Generating Factual Science Response...")
        
        context_str = "\n".join(state.get("reranked_chunks", []))
        system_prompt = GENERATE_SCIENCE_PROMPT_TEMPLATE.format(context=context_str)
        
        messages = [{"role": "system", "content": system_prompt}] + [{"role": "user", "content": state["query"]}]
        
        response = self.groq_client.chat.completions.create(
            messages=messages,
            model="llama-3.3-70b-versatile",
            temperature=0.0,
            max_tokens=512
        )
        return {"factual_response": response.choices[0].message.content}

    def run_reshape_lingo(self, state: AgentState):
        print("🗣️ 4b. Reshaping into Feynman Lingo...")
        
        factual_response = state.get("factual_response", "")
        system_prompt = RESHAPE_LINGO_SYSTEM_PROMPT
        
        # Inject Transcript Lingo Snippets (Few-Shot Examples)
        lingo_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data", "lingo")
        lingo_examples = ""
        if os.path.exists(lingo_dir):
            import glob
            lingo_files = glob.glob(os.path.join(lingo_dir, "*.txt"))
            for lf in lingo_files:
                with open(lf, 'r', encoding='utf-8') as f:
                    lingo_examples += f.read() + "\n\n"
                    
        if lingo_examples.strip():
            system_prompt += f"\n<speech_examples>\nHere are real examples of how you speak from your past interviews and books. Study these carefully and explicitly mimic this exact vocabulary, cadence, and sentence structure:\n\n{lingo_examples}\n</speech_examples>\n"
        
        user_facts = self.supabase.table("long_term_memory").select("fact_key, fact_value").eq("user_id", state["user_id"]).execute()
        if user_facts.data:
            system_prompt += "\n<subconscious_memory>\nYou remember the following facts about the user you are talking to:\n"
            for f in user_facts.data:
                system_prompt += f"- {f['fact_key']}: {f['fact_value']}\n"
            system_prompt += "Use these facts naturally to build rapport, but do not list them out awkwardly.\n</subconscious_memory>\n"
                
        user_prompt = RESHAPE_LINGO_USER_PROMPT_TEMPLATE.format(query=state["query"], factual_response=factual_response)
        
        messages = [{"role": "system", "content": system_prompt}] + state.get("chat_history", []) + [{"role": "user", "content": user_prompt}]
        
        response = self.groq_client.chat.completions.create(
            messages=messages,
            model="llama-3.3-70b-versatile",
            temperature=0.8,
            max_tokens=256
        )
        return {"response": response.choices[0].message.content}

    def run_distill(self, state: AgentState):
        print("📥 5. Distilling Subconscious Memory...")
        query = state["query"]
        user_id = state["user_id"]
        
        prompt = DISTILL_PROMPT_TEMPLATE.format(query=query)
        
        try:
            extraction = self.groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                response_format={"type": "json_object"},
                temperature=0.1
            )
            data = json.loads(extraction.choices[0].message.content)
            
            if "facts" in data and isinstance(data["facts"], list):
                for fact in data["facts"]:
                    # Upsert explicitly by key
                    existing = self.supabase.table("long_term_memory").select("id").eq("user_id", user_id).eq("fact_key", fact["fact_key"]).execute()
                    if existing.data:
                        self.supabase.table("long_term_memory").update({
                            "fact_value": fact["fact_value"],
                            "updated_at": "now()"
                        }).eq("id", existing.data[0]["id"]).execute()
                    else:
                        self.supabase.table("long_term_memory").insert({
                            "user_id": user_id,
                            "fact_key": fact["fact_key"],
                            "fact_value": fact["fact_value"],
                            "confidence_score": 0.9
                        }).execute()
        except Exception as e:
            print(f"Distill error: {e}")
            
        return {}
