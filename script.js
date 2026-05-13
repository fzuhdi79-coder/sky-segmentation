// =========================================
// KONFIGURASI
// =========================================
const url = "https://predict-6a04026fc6ff28d6705e-dproatj77a-et.a.run.app/predict";
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

// Preview Gambar
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

// Detect Button
detectBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];
    if (!file) return alert("Pilih gambar dulu!");

    btnText.textContent = "Processing...";
    loadingSpinner.classList.remove("d-none");
    detectBtn.disabled = true;

    const form = new FormData();
    form.append("file", file);
    form.append("conf", "0.01");
    form.append("iou", "0.5");
    form.append("imgsz", "640");

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: form
        });

        const data = await response.json();
        
        // DEBUG LENGKAP
        console.log("=== FULL API RESPONSE ===", data);
        console.dir(data);                    // Lebih detail
        console.log("Keys utama:", Object.keys(data));

        resultImage.src = imagePreview.src;
        resultImage.onload = () => drawResult(data);

    } catch (err) {
        console.error(err);
        alert("Error koneksi ke API");
    } finally {
        btnText.textContent = "Detect Sky";
        loadingSpinner.classList.add("d-none");
        detectBtn.disabled = false;
    }
});

// ================= DRAW RESULT =================
function drawResult(data) {
    resultList.innerHTML = "";

    let results = [];

    // Coba berbagai kemungkinan struktur
    if (data.images?.[0]?.results) {
        results = data.images[0].results;
    } else if (data.results) {
        results = data.results;
    } else if (data.predictions) {
        results = data.predictions;
    } else if (data.data) {
        results = Array.isArray(data.data) ? data.data : [];
    } else if (Array.isArray(data)) {
        results = data;
    }

    console.log("✅ Jumlah detection setelah parsing:", results.length);

    if (results.length === 0) {
        resultList.innerHTML = `
            <li class="text-danger">
                ❌ Masih tidak ada deteksi.<br>
                <small>Kirim screenshot Console (F12) yang baru ke saya.</small>
            </li>`;
        return;
    }

    // Jika ada hasil, gambar
    const img = resultImage;
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;
    const scaleX = canvas.width / img.naturalWidth;
    const scaleY = canvas.height / img.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    results.forEach((pred, i) => {
        const box = pred.box || pred.bbox || pred.xyxy || {};
        const { x1, y1, x2, y2 } = box;

        if (typeof x1 === 'undefined') return;

        const left = x1 * scaleX;
        const top = y1 * scaleY;
        const w = (x2 - x1) * scaleX;
        const h = (y2 - y1) * scaleY;

        const color = `hsl(${i * 70}, 90%, 60%)`;

        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.strokeRect(left, top, w, h);

        const label = `${pred.name || pred.class || 'sky'} (${(pred.confidence * 100).toFixed(1)}%)`;
        
        ctx.fillStyle = color;
        ctx.fillRect(left, top - 30, 300, 30);
        ctx.fillStyle = "#000";
        ctx.font = "bold 16px Arial";
        ctx.fillText(label, left + 8, top - 8);

        const li = document.createElement("li");
        li.innerHTML = `✅ ${label}`;
        resultList.appendChild(li);
    });
}
