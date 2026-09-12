from ultralytics import YOLO

# Muat model hasil training 9 epoch Anda
model_path = "runs/detect/runs/bestari_yolo/bestari_ulat_grayak_model/weights/best.pt"
print(f"Loading model from {model_path}...")
model = YOLO(model_path)

# Ekspor ke ONNX
print("Exporting model to ONNX format...")
onnx_path = model.export(format="onnx")
print(f"Success! Model ONNX exported to: {onnx_path}")
