# Deploy guide

Architecture: **Next.js UI (Vercel)** -> **FastAPI + TensorFlow API (any Docker host)** -> Groq / Gemini (explanations and chat)

Vercel cannot host the API: its dependencies bundle to about 1.2 GB, over Vercel's 500 MB Python function limit (the build fails with LAMBDA_SIZE_EXCEEDED). Run the API on a host that can run a Docker container with at least 2 GB of RAM.

## 1. Backend
`backend/Dockerfile` listens on `$PORT` (default 8000). Tested on:
- **Railway:** New Project -> Deploy from GitHub repo, **Root Directory** `backend`. In Networking, set the domain port to the one the container logs (8080 on Railway).
- **Hugging Face Space:** the same `backend/main.py` runs inside a Space. The live demo mounts it under `/pneumoscan` in a shared multi-project Space, so its API base URL ends in `/pneumoscan`.

Variables:
- `GROQ_API_KEY` or `GEMINI_API_KEY` = your key (one is enough)
- `ALLOWED_ORIGINS` = `https://<your-app>.vercel.app` (comma-separated for several)
- (optional) `ALLOWED_ORIGIN_REGEX` = a valid regex such as `https://.*\.vercel\.app`; invalid values are ignored

Check `/health`: `model_loaded: true` means the model is ready. The first boot downloads it.

## 2. Frontend on Vercel
1. Import the repo, set **Root Directory** to `frontend`.
2. Env var `NEXT_PUBLIC_API_URL` = the API base URL, no trailing slash. It is baked in at build time, so redeploy after changing it.
3. Deploy.

## Local dev
- Backend: `cd backend && pip install -r requirements.txt && uvicorn main:app --reload`
- Frontend: `cd frontend && cp .env.example .env.local && npm install && npm run dev`

## Model hosting (Hugging Face)
The trained model lives at https://huggingface.co/totz07/pneumonia-detector-densenet121 (public, 31 MB).
The backend downloads it on first start from:
`https://huggingface.co/totz07/pneumonia-detector-densenet121/resolve/main/pneumonia_model_94.keras`
No variable is needed for this. To use a different copy, set `MODEL_URL` (private repo: also `HF_TOKEN`).
