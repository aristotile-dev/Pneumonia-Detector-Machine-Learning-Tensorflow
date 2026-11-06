---
title: PneumoScan API
emoji: 🫁
colorFrom: blue
colorTo: yellow
sdk: docker
app_port: 8000
pinned: false
---

FastAPI backend for PneumoScan: chest X-ray pneumonia screening (DenseNet121, Grad-CAM) with an LLM explanation and chat.
Endpoints: `/health`, `/predict`, `/explain`, `/chat`. Screening aid only, not a diagnosis.
