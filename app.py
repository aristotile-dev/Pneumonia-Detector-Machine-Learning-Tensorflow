import streamlit as st
import tensorflow as tf
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.densenet import preprocess_input
import numpy as np
from PIL import Image
import gdown 
import os

# --- Page Config ---
st.set_page_config(page_title="Pneumonia Detector", layout="wide")


MODEL_FILE_ID = "1oMcpKYkEqzDiaCoNx6D1xQAFer8x1FWq" 
MODEL_PATH = 'pneumonia_model_94.keras' 
# --- END CHANGE ---


@st.cache_resource
def load_my_model(model_path, file_id):
    print("Checking for model file...")
    if not os.path.exists(model_path):
        print(f"Model file not found. Downloading from Google Drive (ID: {file_id})...")
        try:
           
            gdown.download(id=file_id, output=model_path, quiet=False)
            print("Model downloaded successfully!")
        except Exception as e:
            st.error(f"Error downloading model from Google Drive: {e}")
            return None
    else:
        print("Model file already exists.")

    
    print("Loading model...")
    try:
        model = tf.keras.models.load_model(model_path)
        print("Model Loaded Successfully!")
        return model
    except Exception as e:
        st.error(f"Error loading model: {e}")
        return None

model = load_my_model(MODEL_PATH, MODEL_FILE_ID)

# --- Title ---
st.title("🩺 Pneumonia Detection from Chest X-Rays")


st.markdown("Upload X-Ray Image, The Model will Predict 'NORMAL' (or) 'PNEUMONIA'. (Model: DenseNet121, Accuracy: **94.63%**)")
# --- END CHANGE ---


# --- File Uploader ---
uploaded_file = st.file_uploader("Upload a Chest X-Ray image (JPG or PNG)", type=["jpg", "jpeg", "png"])

if model is None:
    st.error("Model is not loaded. Please check the setup.")
elif uploaded_file is not None:
    img = Image.open(uploaded_file)
    st.image(img, caption='Uploaded X-Ray.', use_column_width=True)
    
    st.divider()
    st.subheader("Prediction:")

    with st.spinner('Model is Predicting...'):
        try:
            # --- PREPROCESSING
            img_resized = img.resize((150, 150))
            img_rgb = img_resized.convert('RGB')
            img_array = image.img_to_array(img_rgb)
            img_batch = np.expand_dims(img_array, axis=0)
            img_preprocessed = preprocess_input(img_batch) # DenseNet-ku prepare pannu

            # --- Prediction ---
            prediction = model.predict(img_preprocessed)
            prob = prediction[0][0] # Namma final output (0 to 1)

            # --- Result
            if prob > 0.5:
                st.error(f"**Result: PNEUMONIA Detected** (Confidence: {prob * 100:.2f}%)")
                st.warning("Please consult a doctor immediately for confirmation.")
            else:
                st.success(f"**Result: NORMAL** (Confidence: {(1 - prob) * 100:.2f}%)")

        except Exception as e:
            st.error(f"Prediction-la error: {e}")
            st.error("Please try uploading a valid image file.")
