import gradio as gr
from ultralytics import YOLO
from PIL import Image

import os
from pathlib import Path

# Cek lokasi file bobot model hasil training Anda
MODEL_PATH = "runs/pest_detection/bestari_yolov8s_pest/weights/best.pt"
ALT_PATH_1 = "runs/detect/runs/bestari_yolo/bestari_ulat_grayak_model/weights/best.pt"
ALT_PATH_2 = "runs/bestari_yolo/bestari_ulat_grayak_model/weights/best.pt"
BASE_PATH = "yolov8n.pt"

if Path(MODEL_PATH).exists():
    model_file = MODEL_PATH
elif Path(ALT_PATH_1).exists():
    model_file = ALT_PATH_1
elif Path(ALT_PATH_2).exists():
    model_file = ALT_PATH_2
else:
    model_file = BASE_PATH

print(f"🌿 Memuat model YOLO dari: {model_file}")
model = YOLO(model_file)

def predict_pest(input_image, confidence):
    results = model.predict(input_image, conf=confidence)
    res_plotted = results[0].plot()
    # Konversi BGR ke RGB untuk tampilan Gradio
    return Image.fromarray(res_plotted[:, :, ::-1])

iface = gr.Interface(
    fn=predict_pest,
    inputs=[
        gr.Image(type="pil", label="Upload Foto Daun/Hama"),
        gr.Slider(0.1, 0.95, value=0.5, label="Confidence Threshold")
    ],
    outputs=gr.Image(type="pil", label="Hasil Deteksi YOLOv8"),
    title="🌿 BESTARI AI - Model & Labeling Tester"
)

iface.launch()
