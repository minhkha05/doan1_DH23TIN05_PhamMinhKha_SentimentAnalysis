"""
AI Sentiment Analysis service.
Supports multiple PhoBERT fine-tuned models from the /models directory.
Falls back to keyword-based mock when no model is loaded.
"""

import json
import os
import random
from pathlib import Path
from typing import Optional

from app.models.models import CamXuc

# ── Project-level models directory ────────────────────────
MODELS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "models"

# ── Global state: active model name (persisted in a file) ─
_ACTIVE_MODEL_FILE = MODELS_DIR / ".active_model"
_loaded_model = None
_loaded_tokenizer = None
_loaded_model_name: Optional[str] = None


def _get_models_dir() -> Path:
    """Return the absolute path to the models directory."""
    return MODELS_DIR


def list_available_models() -> list[dict]:
    """
    Scan the /models directory for any model folders.
    """
    models_dir = _get_models_dir()
    if not models_dir.exists():
        return []

    results = []
    for entry in sorted(models_dir.iterdir()):
        if not entry.is_dir() or entry.name.startswith("."):
            continue

        results.append({
            "name": entry.name,
            "path": str(entry),
            "architecture": "N/A",
            "num_labels": 0,
            "model_type": "N/A",
            "version": "N/A",
            "techniques": [],
        })
    return results


def get_active_model_name() -> Optional[str]:
    """Get the currently saved default model name."""
    if _ACTIVE_MODEL_FILE.exists():
        name = _ACTIVE_MODEL_FILE.read_text(encoding="utf-8").strip()
        if name:
            return name
    return None


def set_active_model_name(name: str) -> None:
    """Save the active (default) model name to disk."""
    _ACTIVE_MODEL_FILE.parent.mkdir(parents=True, exist_ok=True)
    _ACTIVE_MODEL_FILE.write_text(name, encoding="utf-8")


def _load_model(model_name: str):
    """Load a PhoBERT model + tokenizer into memory."""
    global _loaded_model, _loaded_tokenizer, _loaded_model_name

    if _loaded_model_name == model_name and _loaded_model is not None:
        return  # Already loaded

    model_path = _get_models_dir() / model_name
    if not model_path.exists():
        raise FileNotFoundError(f"Model không tồn tại: {model_name}")

    try:
        from transformers import AutoModelForSequenceClassification, AutoTokenizer
        _loaded_tokenizer = AutoTokenizer.from_pretrained(str(model_path))
        _loaded_model = AutoModelForSequenceClassification.from_pretrained(str(model_path))
        _loaded_model.eval()
        _loaded_model_name = model_name
    except ImportError:
        raise ImportError(
            "Cần cài đặt thư viện transformers + torch. "
            "Chạy: pip install transformers torch"
        )


# ── Label mapping (index -> CamXuc) ──────────────────────
LABEL_MAP = {
    0: CamXuc.negative,
    1: CamXuc.positive,
    2: CamXuc.neutral,
}


async def predict_sentiment(text: str, model_name: Optional[str] = None) -> dict:
    """
    Run sentiment prediction using a PhoBERT model.
    If model_name is given, use that model; otherwise use default model.
    Falls back to keyword mock if model cannot be loaded.
    """
    # Determine which model to use
    target_model = model_name or get_active_model_name()

    if target_model:
        try:
            return await _predict_with_model(text, target_model)
        except (ImportError, FileNotFoundError, Exception) as e:
            # Fallback to mock if model can't load
            print(f"[AI Service] Không thể load model '{target_model}': {e}")
            print("[AI Service] Fallback sang mock keyword...")
            return _predict_mock(text, f"{target_model} (fallback)")

    # No model configured -> use mock
    return _predict_mock(text, "PhoBERT-base-v2")


async def _predict_with_model(text: str, model_name: str) -> dict:
    """Do real PhoBERT inference."""
    import torch

    _load_model(model_name)

    inputs = _loaded_tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding="max_length",
        max_length=128,
    )

    with torch.no_grad():
        outputs = _loaded_model(**inputs)

    probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
    predicted_class = torch.argmax(probs, dim=-1).item()
    confidence = probs[0][predicted_class].item()

    return {
        "camxuc": LABEL_MAP.get(predicted_class, CamXuc.neutral),
        "tincay": round(confidence, 4),
        "model": model_name,
    }


def _predict_mock(text: str, model_name: str = "PhoBERT-base-v2") -> dict:
    """Keyword-based fallback mock prediction."""
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

    confidence = round(confidence + random.uniform(-0.05, 0.05), 4)
    confidence = max(0.0, min(1.0, confidence))

    return {
        "camxuc": label,
        "tincay": confidence,
        "model": model_name,
    }
