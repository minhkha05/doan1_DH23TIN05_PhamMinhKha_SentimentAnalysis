"""
Mock AI Sentiment Analysis service.
Replace this with actual PhoBERT inference in production.
"""

import random
from app.models.models import CamXuc


async def predict_sentiment(text: str) -> dict:
    """
    Mock AI function – simulates sentiment prediction.
    
    In production, this would:
      1. Load PhoBERT tokenizer + model
      2. Tokenize input text
      3. Run inference
      4. Return predicted label + confidence
    
    Returns:
        dict with keys: camxuc (CamXuc enum), tincay (float), model (str)
    """
    # ── Simple keyword-based mock for development ─────────
    text_lower = text.lower()

    negative_keywords = [
        "tệ", "kém", "dở", "tồi", "ghét", "chán", "thất vọng",
        "không tốt", "rất tệ", "tức giận", "buồn", "xấu", "hỏng",
        "chậm", "đắt", "lừa đảo", "kém chất lượng",
    ]
    positive_keywords = [
        "tuyệt", "tốt", "hay", "đẹp", "thích", "yêu", "xuất sắc",
        "tuyệt vời", "hài lòng", "nhanh", "rẻ", "chất lượng",
        "đáng mua", "ưng ý", "hoàn hảo", "tận tâm",
    ]

    neg_score = sum(1 for kw in negative_keywords if kw in text_lower)
    pos_score = sum(1 for kw in positive_keywords if kw in text_lower)

    if neg_score > pos_score:
        label = CamXuc.negative
        confidence = min(0.95, 0.60 + neg_score * 0.08)
    elif pos_score > neg_score:
        label = CamXuc.positive
        confidence = min(0.95, 0.60 + pos_score * 0.08)
    else:
        label = CamXuc.neutral
        confidence = round(random.uniform(0.45, 0.65), 4)

    # Add small random noise to simulate real model behavior
    confidence = round(confidence + random.uniform(-0.05, 0.05), 4)
    confidence = max(0.0, min(1.0, confidence))

    return {
        "camxuc": label,
        "tincay": confidence,
        "model": "mock-keyword-v1",
    }
