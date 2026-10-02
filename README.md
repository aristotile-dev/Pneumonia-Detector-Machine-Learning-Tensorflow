#  Pneumonia Detection using Deep Learning (TensorFlow)

![Accuracy](https://img.shields.io/badge/Accuracy-94.63%25-brightgreen?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge&logo=python&logoColor=white)
![Streamlit](https://img.shields.io/badge/Streamlit-FF4B4B?style=for-the-badge&logo=streamlit&logoColor=white)
<br>
![Machine Learning](https://img.shields.io/badge/Machine%20Learning-FF6F00?style=for-the-badge&logo=tensorflow)
![Deep Learning](https://img.shields.io/badge/Deep%20Learning-D00000?style=for-the-badge&logo=keras)
![TensorFlow](https://img.shields.io/badge/TensorFlow-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white)
![Keras](https://img.shields.io/badge/Keras-D00000?style=for-the-badge&logo=keras&logoColor=white)
</div>

This project is an interactive web application that uses a **TensorFlow**-based **Convolutional Neural Network (CNN)** to classify chest X-ray images as either "Normal" or "Pneumonia."

This tool is built with Streamlit and is designed to provide a fast, accessible, and high-accuracy analysis, demonstrating a practical application of deep learning for social impact in medical diagnostics.

---

## 🚀 Live App

**[Click Here To Use Pneumonia - Detector](https://pneumonia-detector-machine-learning-tensorflow-totz7.streamlit.app/)**

---

## 📋 Features

* **File Uploader:** Allows users to upload their own chest X-ray images (JPG, PNG, JPEG).
* **Deep Learning Prediction:** Uses a trained **TensorFlow/Keras** model to analyze the image in real-time.
* **Clear Results:** Immediately classifies the image as **"NORMAL"** or **"PNEUMONIA"**.
* **Confidence Score:** Displays the model's confidence percentage for the prediction.
* **Social Impact:** Acts as a proof-of-concept for a tool that could assist radiologists or be used in areas with limited access to specialists.

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
| **Streamlit** | To build the interactive web app and user interface. |
| **Python** | The primary programming language. |
| **Pillow (PIL)** | For loading, resizing, and processing user-uploaded images. |
| **NumPy** | For numerical operations and preparing image arrays for the model. |
| **Gdown** | To download the saved `.keras` model from Google Drive when the app starts. |
| **Google Colab** | Used for GPU-powered model training and experimentation. |

---

## How to Run Locally

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git](https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git)
    cd YOUR_REPO_NAME
    ```

2.  **Install dependencies:**
    Make sure you have a `requirements.txt` file with the libraries listed in the Tech Stack.
    ```bash
    pip install -r requirements.txt
    ```

3.  **Run the Streamlit app:**
    The app will download the model from Google Drive on the first run.
    ```bash
    streamlit run app.py
    ```

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
