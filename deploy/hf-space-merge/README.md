# Add the pneumonia API to an existing Hugging Face Docker Space

Result: the Space keeps its current routes and gains
`/pneumonia/health`, `/pneumonia/predict`, `/pneumonia/explain`, `/pneumonia/chat`.

1. Upload `pneumonia_api.py` to the Space root (next to its `main.py`).
2. Append `requirements.add.txt` to the Space `requirements.txt`.
3. Append `main_append.py` to the END of the Space `main.py`.
4. Space Settings -> Secrets: `GROQ_API_KEY` (or `GEMINI_API_KEY`).
5. Frontend env: `NEXT_PUBLIC_API_URL=https://<space>.hf.space/pneumonia`

If the build breaks, revert the last commit from the Space's Files -> History.
