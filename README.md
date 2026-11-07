#  Pneumonia Detection using Deep Learning (TensorFlow)

![Accuracy](https://img.shields.io/badge/Accuracy-94.63%25-brightgreen?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge&logo=python&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
<br>
![Machine Learning](https://img.shields.io/badge/Machine%20Learning-FF6F00?style=for-the-badge&logo=tensorflow)
![Deep Learning](https://img.shields.io/badge/Deep%20Learning-D00000?style=for-the-badge&logo=keras)
![TensorFlow](https://img.shields.io/badge/TensorFlow-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white)
![Keras](https://img.shields.io/badge/Keras-D00000?style=for-the-badge&logo=keras&logoColor=white)

**PneumoScan** is a web app that classifies chest X-rays as "Normal" or "Pneumonia" with a **TensorFlow** **DenseNet121** model, shows *where* the model looked with a Grad-CAM heatmap, and explains the result in plain language with an LLM.

It is a screening aid and a portfolio project, **not a diagnosis**: a qualified doctor must review every X-ray.

---

## 🚀 Live App

**[Open PneumoScan](https://pneumonia-detector-machine-learning.vercel.app)**

The backend may need a few seconds to wake up on the first request.

---

## 📋 Features

* **Upload or pick a sample:** Use your own chest X-ray (JPG or PNG, up to 10 MB) or one of the bundled samples.
* **Prediction with confidence:** Classifies the image as **NORMAL** or **PNEUMONIA** and shows the model's confidence.
* **Heatmap evidence:** A Grad-CAM overlay shows which regions drove the score. A zoom lens lets you inspect the X-ray.
* **Plain-language explanation and chat:** An LLM (Groq, with Gemini as fallback) explains the result and answers follow-up questions. It is instructed not to diagnose or give treatment advice.
* **Shareable result card:** Download the result as a PNG.
* **Degrades gracefully:** If the heatmap or the AI explanation is unavailable, the prediction still shows.

## 🏗️ Architecture

```
Browser ──► Next.js UI (Vercel) ──► FastAPI + TensorFlow API ──► Groq / Gemini
                                         │
                                         └─ downloads the .keras model from Hugging Face on first start
```

* `frontend/` Next.js 15 (App Router, plain JS and CSS)
* `backend/` FastAPI API with `/health`, `/predict`, `/explain`, `/chat`
* Model: [totz07/pneumonia-detector-densenet121](https://huggingface.co/totz07/pneumonia-detector-densenet121) on Hugging Face
## ☁️ Deployment

Vercel cannot host the API: its dependencies bundle to about 1.2 GB, over Vercel's 500 MB Python function limit. Run the API on any Docker host with at least 2 GB of RAM (`backend/Dockerfile` listens on `$PORT`). It has been tested on Railway and on a Hugging Face Space.

**Backend variables**
* `GROQ_API_KEY` or `GEMINI_API_KEY`: one is enough
* `ALLOWED_ORIGINS`: the frontend URL, comma-separated for several
* Optional: `ALLOWED_ORIGIN_REGEX`, `MODEL_URL`, `HF_TOKEN` (see `backend/.env.example`)

Check `/health`: `model_loaded: true` means the model is ready.

**Frontend (Vercel):** set the Root Directory to `frontend` and `NEXT_PUBLIC_API_URL` to the API base URL, with no trailing slash. It is baked in at build time, so redeploy after changing it.

---

## 🧠 The Machine Learning Model

The core of this project is the **deep learning model**. The final model achieves **94.63% accuracy** through a process of iteration and problem-solving.

### 1. Model Architecture
* **Transfer Learning:** The model is built using **Transfer Learning** with the **DenseNet121** architecture, pre-trained on the ImageNet dataset.
* **Custom Head:** The pre-trained base was frozen, and a new classification "head" was added.
* **Strong Regularization:** To prevent overfitting, the custom head includes:
    * `kernel_regularizer=L2(0.001)`
    * `Dropout(0.5)`

### 2. The Dataset & Training
* **Data Source:** The project uses the "Chest X-Ray Images (Pneumonia)" dataset from Kaggle.
* **Addressing Domain Shift:** Initial training revealed a "domain shift" problem—the model performed well on validation data from the `train` folder (96%) but poorly on the `test` folder (87%).
* **Solution (Data Merging):** To solve this, all 5,856 images from the `train`, `test`, and `val` folders were **merged into a single master dataset**. This master dataset was then re-split (80/20) into a new, more reliable training set (4,684 images) and validation set (1,172 images).
* **Final Training:** The model was trained on this new, mixed dataset using:
    * `Adam` optimizer (learning rate: 0.0001)
    * `EarlyStopping` callback (monitoring `val_loss`)

This final approach solved the domain shift and resulted in a stable, generalized model with **94.63% accuracy** on the new validation set.

---

## 🛠️ Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **TensorFlow & Keras** | **Core ML library for building, training, and running the `DenseNet121` model.** |
| **Next.js** | The web UI (hosted on Vercel). |
| **FastAPI** | The API that serves predictions, heatmaps, explanations and chat. |
| **Python** | The backend language. |
| **Pillow (PIL)** | For loading, resizing, and processing user-uploaded images. |
| **NumPy** | For numerical operations and preparing image arrays for the model. |
| **Hugging Face Hub** | Hosts the trained `.keras` model; the backend downloads it on first start. |
| **Groq / Gemini** | LLMs for the plain-language explanation and chat. |
| **Google Colab** | Used for GPU-powered model training and experimentation. |

---

## How to Run Locally

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/aristotile-dev/Pneumonia-Detector-Machine-Learning-Tensorflow.git
    cd Pneumonia-Detector-Machine-Learning-Tensorflow
    ```

2.  **Run the backend** (downloads the model from Hugging Face on first start; set `GROQ_API_KEY` or `GEMINI_API_KEY` for explanations and chat, see `backend/.env.example`):
    ```bash
    cd backend
    pip install -r requirements.txt
    uvicorn main:app --reload
    ```

3.  **Run the frontend** in a second terminal:
    ```bash
    cd frontend
    cp .env.example .env.local
    npm install
    npm run dev
    ```
    Open http://localhost:3000.

---

## 📄 License

This project is licensed under the MIT License.

MIT License

Copyright (c) 2025 Aristotile S

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
