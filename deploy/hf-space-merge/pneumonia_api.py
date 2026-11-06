"""Pneumonia Detector API (FastAPI + TensorFlow DenseNet121).

Endpoints
  GET  /health   -> liveness + model status
  POST /predict  -> image upload -> label, confidence, Grad-CAM heatmap
  POST /explain  -> plain-language explanation of a result (Claude API, optional)
"""
import base64
import io
import os
import tempfile
import threading

import gdown
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel

MODEL_FILE_ID = os.getenv("MODEL_FILE_ID", "1oMcpKYkEqzDiaCoNx6D1xQAFer8x1FWq")
MODEL_PATH = os.getenv("MODEL_PATH", os.path.join(tempfile.gettempdir(), "pneumonia_model_94.keras"))  # /tmp is the only writable place on serverless hosts
# Model is hosted on Hugging Face. Set MODEL_URL="" to fall back to the old Google Drive copy.
MODEL_URL = os.getenv("MODEL_URL", "https://huggingface.co/totz07/pneumonia-detector-densenet121/resolve/main/pneumonia_model_94.keras")
HF_TOKEN = os.getenv("HF_TOKEN", "")  # only needed if the Hugging Face repo is private
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
IMG_SIZE = (150, 150)  # must match training

app = FastAPI(title="Pneumonia Detector API")
def _valid_origin_regex() -> str | None:
    """Return ALLOWED_ORIGIN_REGEX only if it compiles; a bad value must not take the whole API down."""
    import re

    pattern = os.getenv("ALLOWED_ORIGIN_REGEX", "").strip()
    if not pattern:
        return None
    try:
        re.compile(pattern)
    except re.error:
        print(f"Ignoring invalid ALLOWED_ORIGIN_REGEX: {pattern!r}")
        return None
    return pattern


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=_valid_origin_regex(),
    allow_methods=["*"],
    allow_headers=["*"],
)

_model = None
_model_error = None
_lock = threading.Lock()


def download_model():
    """Fetch the trained model once per container start."""
    if MODEL_URL:
        import requests

        headers = {"Authorization": f"Bearer {HF_TOKEN}"} if HF_TOKEN else {}
        tmp = MODEL_PATH + ".part"
        with requests.get(MODEL_URL, headers=headers, stream=True, timeout=60) as r:
            r.raise_for_status()
            with open(tmp, "wb") as f:
                for chunk in r.iter_content(chunk_size=1 << 20):
                    f.write(chunk)
        os.replace(tmp, MODEL_PATH)
    else:
        gdown.download(id=MODEL_FILE_ID, output=MODEL_PATH, quiet=False)


def get_model():
    """Load the model once (download from Drive on first run)."""
    global _model, _model_error
    if _model is not None:
        return _model
    with _lock:
        if _model is not None:
            return _model
        try:
            import tensorflow as tf

            if not os.path.exists(MODEL_PATH):
                download_model()
            _model = tf.keras.models.load_model(MODEL_PATH)
            _model_error = None
        except Exception as e:  # noqa: BLE001
            _model_error = str(e)
            raise
    return _model


@app.on_event("startup")
def warm_up():
    # Load in a background thread so the port opens immediately (Railway health check).
    def _load():
        try:
            get_model()
        except Exception:  # noqa: BLE001
            pass

    threading.Thread(target=_load, daemon=True).start()


def preprocess(img: Image.Image) -> np.ndarray:
    from tensorflow.keras.applications.densenet import preprocess_input

    arr = np.asarray(img.convert("RGB").resize(IMG_SIZE), dtype="float32")
    return preprocess_input(np.expand_dims(arr, 0))


def grad_cam(model, x: np.ndarray):
    """Grad-CAM over the nested DenseNet base. Returns a 2D [0,1] map or None."""
    import tensorflow as tf

    base_idx = next(
        (i for i, l in enumerate(model.layers) if isinstance(l, tf.keras.Model)), None
    )
    if base_idx is None:
        return None
    base = model.layers[base_idx]
    head = model.layers[base_idx + 1 :]
    with tf.GradientTape() as tape:
        feats = base(x, training=False)
        tape.watch(feats)
        out = feats
        for layer in head:
            out = layer(out, training=False)
        score = out[:, 0]
    grads = tape.gradient(score, feats)
    if grads is None:
        return None
    weights = tf.reduce_mean(grads, axis=(1, 2), keepdims=True)
    cam = tf.nn.relu(tf.reduce_sum(weights * feats, axis=-1))[0].numpy()
    if cam.max() <= 0:
        return np.zeros_like(cam)
    return cam / cam.max()


def heatmap_overlay(img: Image.Image, cam: np.ndarray) -> str:
    """Blend a warm heatmap over the original X-ray; return data-URL PNG."""
    base = img.convert("RGB")
    base.thumbnail((640, 640))
    cam_img = Image.fromarray((cam * 255).astype("uint8")).resize(base.size, Image.BILINEAR)
    c = np.asarray(cam_img, dtype="float32") / 255.0
    # simple black->red->yellow ramp
    heat = np.stack([np.clip(c * 2, 0, 1), np.clip(c * 2 - 1, 0, 1), np.zeros_like(c)], axis=-1) * 255
    alpha = (c[..., None] * 0.65)
    out = np.asarray(base, dtype="float32") * (1 - alpha) + heat * alpha
    buf = io.BytesIO()
    Image.fromarray(out.astype("uint8")).save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": _model is not None, "model_error": _model_error}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Image too large (max 10MB).")
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except Exception:  # noqa: BLE001
        raise HTTPException(400, "That file isn't a valid image.")
    try:
        model = get_model()
    except Exception as e:  # noqa: BLE001
        raise HTTPException(503, f"Model not ready: {e}")

    x = preprocess(img)
    prob = float(model.predict(x, verbose=0)[0][0])
    pneumonia = prob > 0.5
    confidence = prob if pneumonia else 1 - prob

    heatmap = None
    try:
        cam = grad_cam(model, x)
        if cam is not None:
            heatmap = heatmap_overlay(img, cam)
    except Exception:  # noqa: BLE001
        heatmap = None  # heatmap is a bonus; never fail the prediction

    return {
        "label": "PNEUMONIA" if pneumonia else "NORMAL",
        "confidence": round(confidence * 100, 2),
        "pneumonia_probability": round(prob * 100, 2),
        "heatmap": heatmap,
    }


class ExplainRequest(BaseModel):
    label: str
    confidence: float


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    label: str
    confidence: float
    messages: list[ChatMessage]


SYSTEM_PROMPT = (
    "You are the assistant inside PneumoScan, a chest X-ray pneumonia screening demo. "
    "A DenseNet121 model has produced a result; the user may ask about it. "
    "Answer in plain, calm language, in at most 4 short sentences unless asked for more. "
    "You are not a doctor: never diagnose, never give treatment, medication or dosage advice, "
    "and say that a qualified doctor must review the X-ray when it is relevant. "
    "If symptoms such as severe breathlessness, chest pain or blue lips are mentioned, advise urgent medical care. "
    "Stay on topic (this result, pneumonia, chest X-rays, how the model works). "
    "Politely decline anything unrelated. Reply in plain text only: no markdown, no asterisks, no bullet symbols."
)


def call_llm(system: str, turns: list[dict]) -> str:
    """turns: [{'role': 'user'|'assistant', 'content': str}]. Uses Groq if configured, else Gemini."""
    import requests

    groq_key = os.getenv("GROQ_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not (groq_key or gemini_key):
        raise HTTPException(503, "AI is not configured.")
    try:
        if groq_key:
            groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
            body = {
                "model": groq_model,
                "messages": [{"role": "system", "content": system}, *turns],
                # gpt-oss models spend part of this budget on hidden reasoning, so keep it generous
                "max_tokens": 1024,
            }
            if groq_model.startswith("openai/gpt-oss"):
                body["reasoning_effort"] = "low"
            r = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {groq_key}"},
                json=body,
                timeout=45,
            )
            r.raise_for_status()
            text = (r.json()["choices"][0]["message"].get("content") or "").strip()
            if not text:
                raise ValueError("empty reply")
            return text
        model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
        r = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            headers={"x-goog-api-key": gemini_key},
            json={
                "systemInstruction": {"parts": [{"text": system}]},
                "contents": [
                    {"role": "user" if t["role"] == "user" else "model", "parts": [{"text": t["content"]}]}
                    for t in turns
                ],
            },
            timeout=30,
        )
        r.raise_for_status()
        return r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    except HTTPException:
        raise
    except Exception:  # noqa: BLE001
        raise HTTPException(502, "AI service error.")


@app.post("/explain")
def explain(req: ExplainRequest):
    if req.label not in ("NORMAL", "PNEUMONIA"):
        raise HTTPException(400, "Invalid label.")
    prompt = (
        f"A screening model analysed a chest X-ray and predicted {req.label} "
        f"with {req.confidence:.1f}% confidence. In 4-5 short sentences for a non-medical "
        "reader: explain what this result means, what pneumonia is (briefly), "
        "what sensible next steps are, and clearly state this is an AI screening aid, "
        "not a diagnosis, and a doctor must confirm. Do not give treatment or dosage advice."
    )
    return {"explanation": call_llm(SYSTEM_PROMPT, [{"role": "user", "content": prompt}])}


@app.post("/chat")
def chat(req: ChatRequest):
    if req.label not in ("NORMAL", "PNEUMONIA"):
        raise HTTPException(400, "Invalid label.")
    turns = [
        {"role": m.role, "content": m.content.strip()[:500]}
        for m in req.messages[-8:]
        if m.role in ("user", "assistant") and m.content.strip()
    ]
    if not turns or turns[-1]["role"] != "user":
        raise HTTPException(400, "Send a question to continue the chat.")
    context = (
        f"{SYSTEM_PROMPT} Current result: the model predicted {req.label} "
        f"with {req.confidence:.1f}% confidence."
    )
    return {"reply": call_llm(context, turns)}
