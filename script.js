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
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const detectBtn = document.getElementById("detectBtn");
const btnText = document.getElementById("btnText");
const loadingSpinner = document.getElementById("loadingSpinner");
const resultList = document.getElementById("resultList");

// Helper untuk reset tampilan
function resetResult() {
    resultImage.src = "";
    resultList.innerHTML = "";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Preview Gambar saat Upload
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

// Proses Deteksi
detectBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];
    if (!file) return alert("Pilih gambar dulu!");

    // UI Loading State
    btnText.textContent = "Processing...";
    loadingSpinner.classList.remove("d-none");
    detectBtn.disabled = true;
    resetResult();

    const form = new FormData();
    form.append("file", file);
    form.append("conf", "0.05"); // Ditingkatkan sedikit agar lebih akurat
    form.append("iou", "0.45");
    form.append("imgsz", "640");

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: form
        });
        
        if (!response.ok) throw new Error("Gagal menghubungi server");
        
        const data = await response.json();
        
        // Tampilkan gambar asli di kolom hasil, lalu gambar deteksinya
        resultImage.src = imagePreview.src;
        resultImage.onload = () => drawResult(data);

    } catch (err) {
        console.error(err);
        alert("Error: " + err.message);
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
    // Sinkronisasi ukuran canvas dengan tampilan gambar
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;
    
    const scaleX = canvas.width / img.naturalWidth;
    const scaleY = canvas.height / img.naturalHeight;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    results.forEach((pred) => {
        const { x1, y1, x2, y2 } = pred.box || {};
        if (x1 === undefined) return;

        // Analisis kondisi langit (Mendung/Cerah)
        const skyCondition = analyzeSkyCondition(pred, img);
        const color = skyCondition.isClear ? "#22c55e" : "#eab308"; // Hijau vs Kuning/Oren

        const left = x1 * scaleX;
        const top = y1 * scaleY;
        const w = (x2 - x1) * scaleX;
        const h = (y2 - y1) * scaleY;

        // 1. Draw Mask (Segmentasi)
        if (pred.segments?.x?.length > 0) {
            ctx.beginPath();
            const segX = pred.segments.x;
            const segY = pred.segments.y;
            for (let j = 0; j < segX.length; j++) {
                const sx = segX[j] * scaleX;
                const sy = segY[j] * scaleY;
                j === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
            }
            ctx.closePath();
            ctx.fillStyle = skyCondition.isClear ? "rgba(34, 197, 94, 0.4)" : "rgba(234, 179, 8, 0.4)";
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // 2. Draw Bounding Box
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(left, top, w, h);

        // 3. Draw Label
        const labelText = `Sky ${skyCondition.label} ${(pred.confidence * 100).toFixed(1)}%`;
        ctx.fillStyle = color;
        ctx.font = "bold 14px Arial";
        const textWidth = ctx.measureText(labelText).width;
        ctx.fillRect(left, top - 25, textWidth + 10, 25);
        ctx.fillStyle = "#fff";
        ctx.fillText(labelText, left + 5, top - 8);

        // 4. Update List Keterangan
        const li = document.createElement("li");
        li.className = "mb-2";
        li.innerHTML = `✅ <strong>${labelText}</strong><br><small class="text-muted">${skyCondition.description}</small>`;
        resultList.appendChild(li);
    });
}

// ================= ANALISIS CERAH / MENDUNG =================
function analyzeSkyCondition(pred, img) {
    const canvasTemp = document.createElement("canvas");
    const ctxTemp = canvasTemp.getContext("2d", { willReadFrequently: true });
    
    const { x1, y1, x2, y2 } = pred.box;
    const width = Math.max(1, Math.floor(x2 - x1));
    const height = Math.max(1, Math.floor(y2 - y1));
    
    canvasTemp.width = width;
    canvasTemp.height = height;
    
    // Ambil potongan gambar langit saja
    ctxTemp.drawImage(img, x1, y1, width, height, 0, 0, width, height);

    // Ambil data pixel sekaligus (lebih cepat)
    const imageData = ctxTemp.getImageData(0, 0, width, height).data;
    let r = 0, g = 0, b = 0;
    const totalPixels = imageData.length / 4;

    // Sampling data (loncat setiap 4 pixel untuk kecepatan)
    for (let i = 0; i < imageData.length; i += 16) {
        r += imageData[i];
        g += imageData[i+1];
        b += imageData[i+2];
    }
    
    const count = totalPixels / 4; 
    const avgR = r / count;
    const avgG = g / count;
    const avgB = b / count;
    
    const brightness = (avgR + avgG + avgB) / 3;
    const maxVal = Math.max(avgR, avgG, avgB);
    const minVal = Math.min(avgR, avgG, avgB);
    
    // Color Difference: Jika nilai R, G, B mirip, maka warna bersifat Netral (Abu-abu/Putih)
    const colorDiff = maxVal - minVal; 
    const blueBias = avgB - ((avgR + avgG) / 2);

    // LOGIKA PENENTUAN:
    
    // 1. Jika perbedaan antar warna sangat kecil (< 20), ini pasti Mendung atau Awan Putih
    if (colorDiff < 20) {
        if (brightness > 200) {
            return { isClear: false, label: "(Berawan)", description: "Langit Putih Terang" };
        }
        return { isClear: false, label: "(Mendung)", description: "Langit Mendung Abu-abu" };
    }

    // 2. Jika warna biru sangat dominan
    if (blueBias > 20 && avgB > avgR) {
        return { isClear: true, label: "(Cerah)", description: "Langit Biru Bersih" };
    }

    // 3. Cek kegelapan (jika gelap dan netral)
    if (brightness < 120) {
        return { isClear: false, label: "(Mendung)", description: "Langit Mendung Gelap" };
    }

    // Default
    return { isClear: true, label: "(Cerah)", description: "Langit Cerah Standar" };
}
