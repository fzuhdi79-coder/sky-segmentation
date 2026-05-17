# 🌤️ Sky Segmentation & Condition Classification

A web-based AI application designed to detect and segment the sky region from any image. Powered by the **Ultralytics YOLO API** for precise instance segmentation, this project also features a custom JavaScript image processing algorithm to classify the sky condition into **Clear (Cerah)** or **Mendung (Overcast)** based on color analytics ($Blue Dominance$ and $Color Gap$).

## 🚀 Features
* **AI-Powered Segmentation:** Uses a state-of-the-art YOLO segmentation model to map out the exact boundaries of the sky.
* **Intelligent Color Analysis:** Built-in algorithm that bypasses camera auto-white balance traps by measuring pixel-level RGB variance.
* **Binarized Classification:** Automatically determines whether the sky is **Cerah (Clear Blue)** or **Mendung (Cloudy/Overcast)**.
* **Real-time Canvas Rendering:** Draws high-fidelity colored overlay masks and bounding boxes directly over the detected areas.
* **Developer Debug Mode:** Console logging features that print real-time RGB averages, Brightness, and Color Gap for algorithm fine-tuning.

## 🛠️ Tech Stack
* **Frontend:** HTML5, CSS3, Bootstrap 5 (Custom Dark Theme Layout)
* **Core Logic:** Vanilla JavaScript (Canvas API & ImageData processing)
* **AI Model:** Ultralytics YOLO Segmentation API via Fetch requests

## 📸 Screenshots
<div align="center">
  <img src="https://via.placeholder.com/400x200?text=Clear+Sky+Detection" alt="Clear Sky Demo" width="45%"/>
  <img src="https://via.placeholder.com/400x200?text=Mendung+Sky+Detection" alt="Mendung Demo" width="45%"/>
</div>

## 🔧 How It Works (The Logic)
The script crops the bounding box provided by YOLO, samples the pixels, and runs the following mathematical evaluation:
1. **Blue Dominance:** $AvgB - \frac{AvgR + AvgG}{2}$ (Detects pure blue hues).
2. **Color Gap:** $Max(R,G,B) - Min(R,G,B)$ (Differentiates flat grey overcast from clear vibrant skies).

If `BlueDominance > 50` and `ColorGap > 50`, the sky is flagged as **Cerah**, otherwise it defaults to **Mendung** to filter out camera sensor rona traps.

---
Developed with ❤️ by [Zudi Jago/ fzuhdi79-coder]
