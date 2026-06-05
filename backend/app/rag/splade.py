import torch
from transformers import AutoModelForMaskedLM, AutoTokenizer

class SpladeEncoder:
    def __init__(self):
        model_id = "naver/splade-cocondenser-ensembledistil"
        self.tokenizer = AutoTokenizer.from_pretrained(model_id)
        self.model = AutoModelForMaskedLM.from_pretrained(model_id)
        
    def encode(self, text: str) -> dict:
        inputs = self.tokenizer(text, return_tensors="pt")
        with torch.no_grad():
            logits = self.model(**inputs).logits
            
        vec = torch.max(
            torch.log(1 + torch.relu(logits)) * inputs.attention_mask.unsqueeze(-1),
            dim=1
        )[0].squeeze()
        
        # Extract non-zero indices
        nonzero = vec.nonzero()
        if nonzero.numel() == 0:
            return {"indices": [], "values": []}
            
        cols = nonzero.squeeze().cpu().tolist()
        if not isinstance(cols, list):
            cols = [cols]
            
        weights = vec[cols].cpu().tolist()
        if not isinstance(weights, list):
            weights = [weights]
            
        return {"indices": cols, "values": weights}
