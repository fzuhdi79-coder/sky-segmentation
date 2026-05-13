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
    form.append("conf", "0.1");
    form.append("iou", "0.5");
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
        alert("Error koneksi ke API");
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
        resultList.innerHTML = `<li class="text-danger">Tidak ada deteksi</li>`;
        return;
    }

    const img = resultImage;
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;
    const scaleX = canvas.width / img.naturalWidth;
    const scaleY = canvas.height / img.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    results.forEach((pred, i) => {
        const { x1, y1, x2, y2 } = pred.box || {};
        if (!x1) return;

        const left = x1 * scaleX;
        const top = y1 * scaleY;
        const w = (x2 - x1) * scaleX;
        const h = (y2 - y1) * scaleY;

        // Warna hijau untuk langit
        const color = "#22c55e";

        // Bounding Box
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.strokeRect(left, top, w, h);

        // Label
        const className = pred.name || "sky";
        const label = `${className} (${(pred.confidence * 100).toFixed(1)}%)`;
        
        ctx.fillStyle = color;
        ctx.fillRect(left, top - 28, 220, 28);
        ctx.fillStyle = "#000";
        ctx.font = "bold 15px Arial";
        ctx.fillText(label, left + 8, top - 8);

        // List hasil
        const li = document.createElement("li");
        li.innerHTML = `✅ <strong>${label}</strong>`;
        resultList.appendChild(li);

        // Segmentation Mask
        if (pred.segments?.x?.length > 0) {
            ctx.beginPath();
            const segX = pred.segments.x;
            const segY = pred.segments.y;
            for (let j = 0; j < segX.length; j++) {
                const x = segX[j] * scaleX;
                const y = segY[j] * scaleY;
                j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fillStyle = "rgba(34, 197, 94, 0.35)";
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });
}
