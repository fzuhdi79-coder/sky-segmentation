// =========================================
// KONFIGURASI API
// =========================================
const url = "https://predict-6a047d4a843ee5421261-dproatj77a-et.a.run.app/predict";
const apiKey = "ul_a8b80a07c79ff47679476137091f3136eac6aa75";

// =========================================
// ELEMENT HTML
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
// PREVIEW GAMBAR
// =========================================
fileInput.addEventListener("change", () => {
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
});

// =========================================
// TOMBOL DETECT
// =========================================
detectBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];
    if (!file) {
        alert("Silakan pilih gambar terlebih dahulu!");
        return;
    }

    // Loading state
    btnText.textContent = "Processing...";
    loadingSpinner.classList.remove("d-none");
    detectBtn.disabled = true;

    const form = new FormData();
    form.append("file", file);
    form.append("conf", "0.25");
    form.append("iou", "0.7");
    form.append("imgsz", "640");

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`
            },
            body: form
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("API Response:", data);

        // Tampilkan gambar asli di hasil
        resultImage.src = imagePreview.src;

        resultImage.onload = () => {
            drawResult(data);
        };

    } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan saat memproses gambar. Coba lagi.");
    } finally {
        // Reset loading state
        btnText.textContent = "Detect Sky";
        loadingSpinner.classList.add("d-none");
        detectBtn.disabled = false;
    }
});

// =========================================
// FUNGSI DRAW HASIL SEGMENTASI
// =========================================
function drawResult(data) {
    const results = data.images?.[0]?.results || [];
    resultList.innerHTML = "";

    const img = resultImage;

    // Sesuaikan ukuran canvas dengan gambar
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;

    const scaleX = canvas.width / img.naturalWidth;
    const scaleY = canvas.height / img.naturalHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    results.forEach((pred, index) => {
        // Bounding Box
        const { x1, y1, x2, y2 } = pred.box || {};
        if (!x1 && !y1) return;

        const left = x1 * scaleX;
        const top = y1 * scaleY;
        const width = (x2 - x1) * scaleX;
        const height = (y2 - y1) * scaleY;

        // Warna berdasarkan class
        const { r, g, b } = getColorFromClass(pred.name || "sky");
        const color = `rgb(${r}, ${g}, ${b})`;

        // === DRAW BOUNDING BOX ===
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(left, top, width, height);

        // === LABEL ===
        const label = `${pred.name || "sky"} (${(pred.confidence * 100).toFixed(1)}%)`;
        ctx.fillStyle = color;
        ctx.fillRect(left, top - 22, ctx.measureText(label).width + 10, 22);

        ctx.fillStyle = "#fff";
        ctx.font = "bold 14px Arial";
        ctx.fillText(label, left + 5, top - 7);

        // === TAMBAH KE LIST ===
        const li = document.createElement("li");
        li.className = "mb-1";
        li.innerHTML = `✅ <strong>${label}</strong>`;
        resultList.appendChild(li);

        // === DRAW SEGMENTATION MASK (Paling Penting untuk Sky) ===
        if (pred.segments && pred.segments.x && pred.segments.x.length > 0) {
            const segX = pred.segments.x;
            const segY = pred.segments.y;

            ctx.beginPath();
            for (let i = 0; i < segX.length; i++) {
                const x = segX[i] * scaleX;
                const y = segY[i] * scaleY;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();

            // Fill mask dengan transparan
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.35)`;
            ctx.fill();

            // Outline mask
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            ctx.stroke();
        }
    });

    if (results.length === 0) {
        resultList.innerHTML = `<li class="text-muted">Tidak ada langit yang terdeteksi.</li>`;
    }
}

// =========================================
// HELPER FUNCTIONS
// =========================================
function getColorFromClass(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const r = (hash >> 0) & 255;
    const g = (hash >> 8) & 255;
    const b = (hash >> 16) & 255;
    return { r, g, b };
}
