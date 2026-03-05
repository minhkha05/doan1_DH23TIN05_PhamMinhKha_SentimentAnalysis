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
    Reads config.json and training_config.json for detailed metrics.
    """
    models_dir = _get_models_dir()
    if not models_dir.exists():
        return []

    results = []
    for entry in sorted(models_dir.iterdir()):
        if not entry.is_dir() or entry.name.startswith("."):
            continue

        model_info = {
            "name": entry.name,
            "path": str(entry),
            "architecture": "N/A",
            "num_labels": 0,
            "model_type": "N/A",
            "version": "N/A",
            "techniques": [],
            "hidden_size": None,
            "num_hidden_layers": None,
            "num_attention_heads": None,
            "vocab_size": None,
            "max_position_embeddings": None,
            "problem_type": None,
        }

        # Read config.json
        config_path = entry / "config.json"
        if config_path.exists():
            try:
                with open(config_path, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
                archs = cfg.get("architectures", [])
                model_info["architecture"] = archs[0] if archs else "N/A"
                model_info["num_labels"] = cfg.get("num_labels", len(cfg.get("id2label", {})))
                model_info["model_type"] = cfg.get("model_type", "N/A")
                model_info["hidden_size"] = cfg.get("hidden_size")
                model_info["num_hidden_layers"] = cfg.get("num_hidden_layers")
                model_info["num_attention_heads"] = cfg.get("num_attention_heads")
                model_info["vocab_size"] = cfg.get("vocab_size")
                model_info["max_position_embeddings"] = cfg.get("max_position_embeddings")
                model_info["problem_type"] = cfg.get("problem_type")
            except Exception:
                pass

        # Read training_config.json
        train_config_path = entry / "training_config.json"
        if train_config_path.exists():
            try:
                with open(train_config_path, "r", encoding="utf-8") as f:
                    tcfg = json.load(f)
                model_info["version"] = tcfg.get("version", "N/A")
                model_info["techniques"] = tcfg.get("techniques", [])
                # Additional training metrics if available
                for key in ["accuracy", "f1_score", "precision", "recall",
                            "epochs", "learning_rate", "batch_size",
                            "train_samples", "val_samples", "test_accuracy",
                            "val_accuracy", "train_loss", "val_loss"]:
                    if key in tcfg:
                        model_info[key] = tcfg[key]

                # Support nested format: {"results": {...}, "training": {...}, "data": {...}}
                results_cfg = tcfg.get("results", {}) if isinstance(tcfg, dict) else {}
                if isinstance(results_cfg, dict):
                    if "test_accuracy" in results_cfg and "test_accuracy" not in model_info:
                        model_info["test_accuracy"] = results_cfg["test_accuracy"]
                    if "test_f1_macro" in results_cfg and "f1_score" not in model_info:
                        model_info["f1_score"] = results_cfg["test_f1_macro"]
                    if "test_precision" in results_cfg and "precision" not in model_info:
                        model_info["precision"] = results_cfg["test_precision"]
                    if "test_recall" in results_cfg and "recall" not in model_info:
                        model_info["recall"] = results_cfg["test_recall"]

                training_cfg = tcfg.get("training", {}) if isinstance(tcfg, dict) else {}
                if isinstance(training_cfg, dict):
                    if "epochs" in training_cfg and "epochs" not in model_info:
                        model_info["epochs"] = training_cfg["epochs"]
                    if "batch_size" in training_cfg and "batch_size" not in model_info:
                        model_info["batch_size"] = training_cfg["batch_size"]
                    if "lr" in training_cfg and "learning_rate" not in model_info:
                        model_info["learning_rate"] = training_cfg["lr"]

                data_cfg = tcfg.get("data", {}) if isinstance(tcfg, dict) else {}
                if isinstance(data_cfg, dict):
                    if "train" in data_cfg and "train_samples" not in model_info:
                        model_info["train_samples"] = data_cfg["train"]
                    if "val" in data_cfg and "val_samples" not in model_info:
                        model_info["val_samples"] = data_cfg["val"]

                # Normalize alternative metric keys
                if "test_f1_macro" in tcfg and "f1_score" not in model_info:
                    model_info["f1_score"] = tcfg["test_f1_macro"]
                if "test_precision_macro" in tcfg and "precision" not in model_info:
                    model_info["precision"] = tcfg["test_precision_macro"]
                if "test_recall_macro" in tcfg and "recall" not in model_info:
                    model_info["recall"] = tcfg["test_recall_macro"]
            except Exception:
                pass

        # Read alternative metrics files (for v5 / TF-IDF-SVM / custom training scripts)
        for metrics_name in ["metrics_v5.json", "metrics_tfidf_svm.json", "metrics.json"]:
            metrics_path = entry / metrics_name
            if not metrics_path.exists():
                continue
            try:
                with open(metrics_path, "r", encoding="utf-8") as f:
                    mcfg = json.load(f)

                if model_info.get("version") in (None, "N/A") and "version" in mcfg:
                    model_info["version"] = mcfg["version"]

                # Unified metrics mapping
                if "accuracy" in mcfg:
                    model_info["accuracy"] = mcfg["accuracy"]
                if "test_accuracy" in mcfg and "test_accuracy" not in model_info:
                    model_info["test_accuracy"] = mcfg["test_accuracy"]
                if "f1_score" in mcfg:
                    model_info["f1_score"] = mcfg["f1_score"]
                if "precision" in mcfg:
                    model_info["precision"] = mcfg["precision"]
                if "recall" in mcfg:
                    model_info["recall"] = mcfg["recall"]

                if "test_f1_macro" in mcfg and "f1_score" not in model_info:
                    model_info["f1_score"] = mcfg["test_f1_macro"]
                if "test_precision_macro" in mcfg and "precision" not in model_info:
                    model_info["precision"] = mcfg["test_precision_macro"]
                if "test_recall_macro" in mcfg and "recall" not in model_info:
                    model_info["recall"] = mcfg["test_recall_macro"]

                for key in ["epochs", "learning_rate", "batch_size", "train_samples", "val_samples", "train_loss", "val_loss"]:
                    if key in mcfg and key not in model_info:
                        model_info[key] = mcfg[key]
            except Exception:
                pass

        # Backward compatibility: some old configs store eval metrics in config.json
        if config_path.exists():
            try:
                with open(config_path, "r", encoding="utf-8") as f:
                    cfg2 = json.load(f)
                eval_metrics = cfg2.get("eval") if isinstance(cfg2, dict) else None
                if isinstance(eval_metrics, dict):
                    if "acc" in eval_metrics and "test_accuracy" not in model_info:
                        model_info["test_accuracy"] = eval_metrics["acc"]
                    if "f1" in eval_metrics and "f1_score" not in model_info:
                        model_info["f1_score"] = eval_metrics["f1"]
            except Exception:
                pass

        # Fallbacks so frontend can always render useful values
        if model_info.get("accuracy") is None and model_info.get("test_accuracy") is not None:
            model_info["accuracy"] = model_info["test_accuracy"]

        # Traditional TF-IDF + SVM models are also 3-class in this project.
        if (not model_info.get("num_labels") or model_info.get("num_labels") == 0) and (
            entry.name.lower().startswith("tf_idf")
            or "tfidf" in entry.name.lower()
        ):
            model_info["num_labels"] = 3

        if model_info.get("version") in (None, "N/A"):
            if entry.name.lower().startswith("phobert-"):
                model_info["version"] = entry.name.replace("phobert-", "").upper()
            elif entry.name.lower().startswith("tf_idf"):
                model_info["version"] = "TF-IDF"

        results.append(model_info)
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
