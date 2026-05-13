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

// =========================================
// PREVIEW GAMBAR + DRAG & DROP
// =========================================
fileInput.addEventListener("change", handleFile);

function handleFile() {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreview.src = e.target.result;
        imagePreview.classList.remove("d-none");
        
        // Reset hasil sebelumnya
        resultImage.src = "";
        resultList.innerHTML = "";
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    reader.readAsDataURL(file);
}

// Drag & Drop Support
const uploadLabel = document.getElementById("uploadLabel");
uploadLabel.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadLabel.style.borderColor = "#38bdf8";
});
uploadLabel.addEventListener("dragleave", () => {
    uploadLabel.style.borderColor = "";
});
uploadLabel.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadLabel.style.borderColor = "";
    fileInput.files = e.dataTransfer.files;
    handleFile();
});

// =========================================
// DETECT BUTTON
// =========================================
detectBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];
    if (!file) {
        alert("Silakan pilih gambar terlebih dahulu!");
        return;
    }

    btnText.textContent = "Processing...";
    loadingSpinner.classList.remove("d-none");
    detectBtn.disabled = true;

    const form = new FormData();
    form.append("file", file);
    form.append("conf", "0.15");     // Diturunkan agar lebih sensitif
    form.append("iou", "0.6");
    form.append("imgsz", "640");

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: form
        });

        const data = await response.json();
        console.log("Full API Response:", data);

        resultImage.src = imagePreview.src;

        resultImage.onload = () => {
            drawResult(data);
        };

    } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan saat memproses gambar.");
    } finally {
        btnText.textContent = "Detect Sky";
        loadingSpinner.classList.add("d-none");
        detectBtn.disabled = false;
    }
});

// =========================================
// DRAW RESULT
// =========================================
function drawResult(data) {
    const results = data.images?.[0]?.results || [];
    resultList.innerHTML = "";

    const img = resultImage;
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;

    const scaleX = canvas.width / img.naturalWidth;
    const scaleY = canvas.height / img.naturalHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.length === 0) {
        resultList.innerHTML = `<li class="text-warning">⚠️ Tidak ada langit terdeteksi. Coba gambar lain atau turunkan confidence.</li>`;
        return;
    }

    results.forEach(pred => {
        const { x1, y1, x2, y2 } = pred.box || {};
        if (x1 === undefined) return;

        const left = x1 * scaleX;
        const top = y1 * scaleY;
        const width = (x2 - x1) * scaleX;
        const height = (y2 - y1) * scaleY;

        const { r, g, b } = getColorFromClass(pred.name || "sky");
        const color = `rgb(${r},${g},${b})`;

        // Bounding Box
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(left, top, width, height);

        // Label
        const label = `${pred.name || "sky"} (${(pred.confidence * 100).toFixed(1)}%)`;
        ctx.fillStyle = color;
        const textWidth = ctx.measureText(label).width;
        ctx.fillRect(left, top - 25, textWidth + 10, 25);

        ctx.fillStyle = "#fff";
        ctx.font = "bold 14px Arial";
        ctx.fillText(label, left + 5, top - 8);

        // List
        const li = document.createElement("li");
        li.innerHTML = `✅ <strong>${label}</strong>`;
        resultList.appendChild(li);

        // Segmentation Mask
        if (pred.segments?.x?.length > 0) {
            ctx.beginPath();
            const segX = pred.segments.x;
            const segY = pred.segments.y;
            for (let i = 0; i < segX.length; i++) {
                const x = segX[i] * scaleX;
                const y = segY[i] * scaleY;
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.closePath();

            ctx.fillStyle = `rgba(${r},${g},${b}, 0.35)`;
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            ctx.stroke();
        }
    });
}

// Helper Warna
function getColorFromClass(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return {
        r: (hash >> 0) & 255,
        g: (hash >> 8) & 255,
        b: (hash >> 16) & 255
    };
}
