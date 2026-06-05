from groq import Groq
import os
from app.agent.prompts import HYDE_PROMPT_TEMPLATE

class HyDEGenerator:
    def __init__(self):
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        
    def generate(self, query: str) -> str:
        prompt = HYDE_PROMPT_TEMPLATE.format(query=query)
        
        try:
            response = self.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                temperature=0.7,
                max_tokens=256
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"HyDE generation failed: {e}")
            return query # Fallback to original query
