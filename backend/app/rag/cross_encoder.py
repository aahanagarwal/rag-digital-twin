from sentence_transformers import CrossEncoder

class Reranker:
    def __init__(self):
        # Using a fast, highly effective cross-encoder from MS MARCO
        self.model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2', max_length=512)
        
    def rerank(self, query: str, documents: list[str], top_k: int = 3) -> list[str]:
        if not documents:
            return []
            
        pairs = [[query, doc] for doc in documents]
        scores = self.model.predict(pairs)
        
        # Sort documents by score
        scored_docs = list(zip(scores, documents))
        scored_docs.sort(key=lambda x: x[0], reverse=True)
        
        return [doc for score, doc in scored_docs[:top_k]]
