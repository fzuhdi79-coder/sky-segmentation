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

// ================= ANALISIS CERAH / MENDUNG (Biner) =================
function analyzeSkyCondition(pred, img) {
    const canvasTemp = document.createElement("canvas");
    const ctxTemp = canvasTemp.getContext("2d", { willReadFrequently: true });
    const { x1, y1, x2, y2 } = pred.box;
    const width = Math.max(1, Math.floor(x2 - x1));
    const height = Math.max(1, Math.floor(y2 - y1));

    canvasTemp.width = width;
    canvasTemp.height = height;
    ctxTemp.drawImage(img, x1, y1, width, height, 0, 0, width, height);

    const pixels = ctxTemp.getImageData(0, 0, width, height).data;
    let r = 0, g = 0, b = 0, count = 0;

    for (let i = 0; i < pixels.length; i += 16) {
        r += pixels[i];
        g += pixels[i+1];
        b += pixels[i+2];
        count++;
    }

    const avgR = r / count;
    const avgG = g / count;
    const avgB = b / count;
    
    // Indikator utama: seberapa dominan warna biru dibanding merah dan hijau
    const blueDominance = avgB - ((avgR + avgG) / 2);

    console.log(`[DEBUG] BlueDominance: ${blueDominance.toFixed(1)}`);

    // LOGIKA BINER:
    // Jika blueDominance di atas 25, kita anggap Cerah. 
    // Di bawah itu (termasuk awan putih atau abu-abu), kita anggap Mendung.
    if (blueDominance > 25) {
        return { 
            isClear: true, 
            label: "(Cerah)", 
            description: "Langit Biru Terdeteksi" 
        };
    } else {
        return { 
            isClear: false, 
            label: "(Mendung)", 
            description: "Langit Mendung / Tidak Biru" 
        };
    }
}
