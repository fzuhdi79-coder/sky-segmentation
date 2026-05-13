// =========================================
// KONFIGURASI
// =========================================
const url = "https://predict-6a047d4a843ee5421261-dproatj77a-et.a.run.app/predict";
const apiKey = "ul_a8b80a07c79ff47679476137091f3136eac6aa75";

// =========================================
// ELEMENTS
// =========================================
const fileInput = document.getElementById("fileInput");
const imagePreview = document.getElementById("imagePreview");
const resultImage = document.getElementById("resultImage");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const detectBtn = document.getElementById("detectBtn");
const btnText = document.getElementById("btnText");
const loadingSpinner = document.getElementById("loadingSpinner");
const resultList = document.getElementById("resultList");

function resetResult() {
    resultImage.src = "";
    resultList.innerHTML = "";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Preview
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreview.src = e.target.result;
        imagePreview.classList.remove("d-none");
        resetResult();
    };
    reader.readAsDataURL(file);
});

// Detect
detectBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];
    if (!file) return alert("Pilih gambar dulu!");

    btnText.textContent = "Processing...";
    loadingSpinner.classList.remove("d-none");
    detectBtn.disabled = true;

    const form = new FormData();
    form.append("file", file);
    form.append("conf", "0.01");
    form.append("iou", "0.45");
    form.append("imgsz", "640");

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: form
        });
        const data = await response.json();
        resultImage.src = imagePreview.src;
        resultImage.onload = () => drawResult(data);
    } catch (err) {
        console.error(err);
        alert("Error saat memproses gambar");
    } finally {
        btnText.textContent = "Detect Sky";
        loadingSpinner.classList.add("d-none");
        detectBtn.disabled = false;
    }
});

// ================= DRAW RESULT =================
function drawResult(data) {
    const results = data.images?.[0]?.results || [];
    resultList.innerHTML = "";

    if (results.length === 0) {
        resultList.innerHTML = `<li class="text-warning">⚠️ Tidak ada langit terdeteksi</li>`;
        return;
    }

    const img = resultImage;
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;
    const scaleX = canvas.width / img.naturalWidth;
    const scaleY = canvas.height / img.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    results.forEach((pred) => {
        const { x1, y1, x2, y2 } = pred.box || {};
        if (!x1) return;

        const left = x1 * scaleX;
        const top = y1 * scaleY;
        const w = (x2 - x1) * scaleX;
        const h = (y2 - y1) * scaleY;

        const sky = analyzeSkyCondition(pred, img);
        const color = sky.isClear ? "#22c55e" : "#f59e0b";

        // Mask Segmentasi
        if (pred.segments?.x?.length > 0) {
            ctx.beginPath();
            for (let j = 0; j < pred.segments.x.length; j++) {
                const sx = pred.segments.x[j] * scaleX;
                const sy = pred.segments.y[j] * scaleY;
                j === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
            }
            ctx.closePath();
            ctx.fillStyle = sky.isClear ? "rgba(34, 197, 94, 0.45)" : "rgba(245, 158, 11, 0.45)";
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            ctx.stroke();
        }

        // Bounding Box
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(left, top, w, h);

        // Label
        const label = `Sky ${sky.label} (${(pred.confidence * 100).toFixed(1)}%)`;
        ctx.fillStyle = color;
        ctx.fillRect(left, top - 34, 290, 34);
        ctx.fillStyle = "#000";
        ctx.font = "bold 15px Arial";
        ctx.fillText(label, left + 8, top - 12);

        // List
        const li = document.createElement("li");
        li.innerHTML = `✅ <strong>${label}</strong><br><small>${sky.description}</small>`;
        resultList.appendChild(li);
    });
}

// ================= ANALISIS CERAH / MENDUNG (Versi Terbaru) =================
function analyzeSkyCondition(pred, img) {
    const canvasTemp = document.createElement("canvas");
    const ctxTemp = canvasTemp.getContext("2d", { willReadFrequently: true });
    
    const { x1, y1, x2, y2 } = pred.box;
    const width = Math.floor(x2 - x1);
    const height = Math.floor(y2 - y1);

    canvasTemp.width = width;
    canvasTemp.height = height;
    ctxTemp.drawImage(img, x1, y1, width, height, 0, 0, width, height);

    const pixels = ctxTemp.getImageData(0, 0, width, height).data;
    
    let r = 0, g = 0, b = 0, count = 0;
    let maxB = 0;

    for (let i = 0; i < pixels.length; i += 12) {  // sampling lebih cepat
        r += pixels[i];
        g += pixels[i+1];
        b += pixels[i+2];
        count++;
        if (pixels[i+2] > maxB) maxB = pixels[i+2];
    }

    const avgR = r / count;
    const avgG = g / count;
    const avgB = b / count;
    const brightness = (avgR + avgG + avgB) / 3;
    const grayness = Math.max(Math.abs(avgR - avgG), Math.abs(avgG - avgB), Math.abs(avgB - avgR));

    console.log(`[DEBUG] R:${avgR.toFixed(0)} G:${avgG.toFixed(0)} B:${avgB.toFixed(0)} | Bright:${brightness.toFixed(0)} | Gray:${grayness.toFixed(1)}`);

    // Logika yang lebih baik untuk mendung
    if (brightness < 115 || grayness < 18) {
        return { isClear: false, label: "(Mendung)", description: "Langit Mendung" };
    }
    if (brightness < 145 && grayness < 35) {
        return { isClear: false, label: "(Berawan)", description: "Langit Berawan" };
    }
    if (avgB > avgR + 25 && brightness > 130) {
        return { isClear: true, label: "(Cerah)", description: "Langit Biru" };
    }

    return { isClear: true, label: "(Cerah)", description: "Langit Cerah" };
}
