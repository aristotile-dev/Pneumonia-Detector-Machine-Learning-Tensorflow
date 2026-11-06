# Deploy guide

Architecture: **Next.js UI (Vercel)** -> **FastAPI + TensorFlow (Railway)** -> Claude API (explanations)

## 1. Backend on Railway
1. Railway -> New Project -> Deploy from GitHub repo -> set **Root Directory** to `backend` (Dockerfile is auto-detected).
2. Variables:
   - `GROQ_API_KEY` or `GEMINI_API_KEY` = your key (one is enough)
   - `ALLOWED_ORIGINS` = `https://<your-app>.vercel.app`
   - (optional) `ALLOWED_ORIGIN_REGEX` = `https://.*\.vercel\.app`
3. Settings -> Networking -> Generate Domain. Health check path: `/health`.
4. First boot downloads the model from Google Drive; `/health` shows `model_loaded: true` when ready.

## 2. Frontend on Vercel
1. Import the repo, set **Root Directory** to `frontend`.
2. Env var `NEXT_PUBLIC_API_URL` = your Railway domain (https://...up.railway.app).
3. Deploy.

## Local dev
- Backend: `cd backend && pip install -r requirements.txt && uvicorn main:app --reload`
- Frontend: `cd frontend && cp .env.example .env.local && npm install && npm run dev`

## Model hosting (Hugging Face)
The trained model lives at https://huggingface.co/totz07/pneumonia-detector-densenet121 (public, 31 MB).
The backend downloads it on first start from:
`https://huggingface.co/totz07/pneumonia-detector-densenet121/resolve/main/pneumonia_model_94.keras`
No Railway variable is needed. To use a different copy, set `MODEL_URL` (private repo: also `HF_TOKEN`).
