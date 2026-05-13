// =========================================
// KONFIGURASI
// =========================================
const url = "https://predict-6a047d4a843ee5421261-dproatj77a-et.a.run.app/predict";
const apiKey = "ul_a8b80a07c79ff47679476137091f3136eac6aa75";

const fileInput = document.getElementById("fileInput");
const imagePreview = document.getElementById("imagePreview");
const resultImage = document.getElementById("resultImage");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const detectBtn = document.getElementById("detectBtn");
const btnText = document.getElementById("btnText");
const loadingSpinner = document.getElementById("loadingSpinner");
const resultList = document.getElementById("resultList");

function resetResult() {
    resultImage.src = "";
    resultList.innerHTML = "";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

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

detectBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];
    if (!file) return alert("Pilih gambar dulu!");

    btnText.textContent = "Processing...";
    loadingSpinner.classList.remove("d-none");
    detectBtn.disabled = true;

    const form = new FormData();
    form.append("file", file);
    form.append("conf", "0.01"); // Tetap rendah agar semua area terdeteksi
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
        if (x1 === undefined) return;

        const sky = analyzeSkyCondition(pred, img);
        
        // Warna Bounding Box: Cerah = Hijau, Berawan = Biru Muda, Mendung = Oranye
        let color = "#22c55e"; 
        if (sky.label === "(Berawan)") color = "#3b82f6";
        if (sky.label === "(Mendung)") color = "#f59e0b";

        const left = x1 * scaleX;
        const top = y1 * scaleY;
        const w = (x2 - x1) * scaleX;
        const h = (y2 - y1) * scaleY;

        // Masking
        if (pred.segments?.x?.length > 0) {
            ctx.beginPath();
            for (let j = 0; j < pred.segments.x.length; j++) {
                const sx = pred.segments.x[j] * scaleX;
                const sy = pred.segments.y[j] * scaleY;
                j === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
            }
            ctx.closePath();
            ctx.fillStyle = color + "73"; // Transparansi 45%
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Bounding Box & Label
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(left, top, w, h);

        const label = `Sky ${sky.label} (${(pred.confidence * 100).toFixed(1)}%)`;
        ctx.fillStyle = color;
        ctx.fillRect(left, top - 30, 260, 30);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 14px Arial";
        ctx.fillText(label, left + 8, top - 10);

        const li = document.createElement("li");
        li.innerHTML = `✅ <strong style="color:${color}">${label}</strong><br><small>${sky.description}</small>`;
        resultList.appendChild(li);
    });
}

// ================= ANALISIS CERAH / MENDUNG (Logika Diperketat) =================
function analyzeSkyCondition(pred, img) {
    const canvasTemp = document.createElement("canvas");
    // Gunakan 'willReadFrequently' untuk menghilangkan warning di console
    const ctxTemp = canvasTemp.getContext("2d", { willReadFrequently: true });
    
    const { x1, y1, x2, y2 } = pred.box;
    const width = Math.max(1, Math.floor(x2 - x1));
    const height = Math.max(1, Math.floor(y2 - y1));
    
    canvasTemp.width = width;
    canvasTemp.height = height;
    
    // Gambar potongan gambar langit ke canvas kecil
    ctxTemp.drawImage(img, x1, y1, width, height, 0, 0, width, height);

    // Ambil SEMUA data pixel sekaligus (jauh lebih cepat)
    const imageData = ctxTemp.getImageData(0, 0, width, height).data;
    let r = 0, g = 0, b = 0;
    const totalPixels = imageData.length / 4;

    // Sampling data (loncat setiap 4 pixel untuk kecepatan)
    for (let i = 0; i < imageData.length; i += 16) {
        r += imageData[i];
        g += imageData[i + 1];
        b += imageData[i + 2];
    }

    const avgR = r / totalPixels * 4; // Penyesuaian untuk sampling
    const avgG = g / totalPixels * 4;
    const avgB = b / totalPixels * 4;
    
    // Indikator 1: Dominasi warna Biru dibanding Merah dan Hijau
    const blueDominance = avgB - ((avgR + avgG) / 2);
    
    // Indikator 2: Kecerahan
    const brightness = (avgR + avgG + avgB) / 3;
    
    // Indikator 3: "Color Neutrality" (Sebuah 'Gap' baru)
    // Langit mendung/abu-abu memiliki nilai R, G, B yang sangat mirip.
    // Jika perbedaannya kecil, berarti warnanya netral.
    const maxVal = Math.max(avgR, avgG, avgB);
    const minVal = Math.min(avgR, avgG, avgB);
    const colorGap = maxVal - minVal; 

    // DEBUG: Lihat di console (F12) untuk melihat angka aslinya
    console.log(`[DEBUG] BlueDom: ${blueDominance.toFixed(1)} | Brightness: ${brightness.toFixed(0)} | ColorGap: ${colorGap.toFixed(1)}`);

    // ================= LOGIKA KLASIFIKASI BARU =================

    // 1. Langit Biru Cerah
    // Kita menaikkan ambang batas 'blueDominance' ke 45 dan memastikan warna tidak netral.
    // Ini akan memfilter rona biru tipis dari kamera di angka 30.
    if (blueDominance > 45 && colorGap > 30) {
        return { isClear: true, label: "(Cerah)", description: "Langit Biru Bersih" };
    }

    // 2. Langit Sangat Terang tapi Netral (Awan Putih Tebal)
    // Ini juga bukan langit cerah, tapi sering kali salah dideteksi sebagai biru.
    if (brightness > 220 && colorGap < 25) {
        return { isClear: false, label: "(Mendung)", description: "Awan Putih Tebal" };
    }

    // 3. Fallback: Langit Mendung / Abu-abu
    // Semua kondisi yang tidak memenuhi kriteria di atas dianggap mendung.
    return { isClear: false, label: "(Mendung)", description: "Langit Mendung / Abu-abu" };
}

// Pastikan di bagian drawResult, kamu menggunakan warna yang berbeda untuk visualisasi:
// sky.isClear ? "#22c55e" : "#f59e0b"; // Hijau (Cerah) : Oranye (Mendung)
