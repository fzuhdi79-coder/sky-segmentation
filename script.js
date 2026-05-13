// =========================================
// URL API untuk proses prediksi AI
// =========================================
const url = "https://predict-69fee9fcb990c8996f74-dproatj77a-et.a.run.app/predict";

// API Key untuk autentikasi
const apiKey = "ul_56866a2f711cfacf919849cd158f48fab82e2af9";


// =========================================
// Mengambil elemen HTML dari DOM
// =========================================

// Input upload file
const fileInput = document.getElementById("fileInput");

// Preview gambar upload (bagian kiri)
const imagePreview = document.getElementById("imagePreview");

// Gambar hasil deteksi (bagian kanan)
const resultImage = document.getElementById("resultImage");

// Canvas untuk menggambar bounding box & segmentasi
const canvas = document.getElementById("canvas");

// Context canvas 2D
const ctx = canvas.getContext("2d");

// Tombol detect
const detectBtn = document.querySelector(".detect-btn");


// ======================================================
// PREVIEW GAMBAR SAAT FILE DIPILIH
// ======================================================
fileInput.addEventListener("change", () => {

    // Ambil file pertama yang dipilih user
    const file = fileInput.files[0];

    // Jika tidak ada file → hentikan
    if (!file) return;

    // FileReader digunakan untuk membaca file gambar
    const reader = new FileReader();

    // Saat file selesai dibaca
    reader.onload = (e) => {

        // Tampilkan gambar preview
        imagePreview.src = e.target.result;

        // Hapus class d-none agar gambar muncul
        imagePreview.classList.remove("d-none");
    };

    // Membaca file sebagai URL base64
    reader.readAsDataURL(file);
});


// ======================================================
// KETIKA TOMBOL DETECT DIKLIK
// ======================================================
detectBtn.addEventListener("click", async () => {

    // Cek apakah user sudah upload gambar
    if (!fileInput.files[0]) {
        alert("Pilih gambar dulu!");
        return;
    }

    // Membuat FormData untuk dikirim ke API
    const form = new FormData();

    // File gambar
    form.append("file", fileInput.files[0]);

    // Confidence threshold
    form.append("conf", "0.25");

    // IoU threshold
    form.append("iou", "0.7");

    // Ukuran image input model
    form.append("imgsz", "640");

    try {

        // Request POST ke API
        const response = await fetch(url, {
            method: "POST",

            // Header authorization
            headers: {
                Authorization: `Bearer ${apiKey}`
            },

            // Body berisi form data
            body: form
        });

        // Konversi response menjadi JSON
        const data = await response.json();

        // Debug hasil API
        console.log(data);

        // Menampilkan gambar asli di area hasil
        resultImage.src = imagePreview.src;

        // Setelah gambar selesai dimuat
        resultImage.onload = () => {
            drawResult(data);
        };

    } catch (err) {

        // Jika terjadi error
        console.error(err);

        alert("Error API!");
    }
});


// ======================================================
// MEMBUAT WARNA BERDASARKAN NAMA CLASS
// ======================================================
function getColorFromClass(name) {

    let hash = 0;

    // Membuat hash dari string class name
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Menghasilkan RGB dari hash
    const r = (hash >> 0) & 255;
    const g = (hash >> 8) & 255;
    const b = (hash >> 16) & 255;

    return { r, g, b };
}


// ======================================================
// MENENTUKAN WARNA TEKS (HITAM / PUTIH)
// Berdasarkan brightness background
// ======================================================
function getTextColor(r, g, b) {

    // Rumus luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b);

    // Jika background terang → text hitam
    // Jika gelap → text putih
    return luminance > 186 ? "#000" : "#fff";
}


// ======================================================
// FUNGSI UTAMA UNTUK MENAMPILKAN HASIL DETEKSI
// ======================================================
function drawResult(data) {

    // Ambil hasil prediksi dari response API
    const results = data.images?.[0]?.results || [];

    // Ambil elemen list hasil deteksi
    const list = document.getElementById("resultList");

    // Reset isi list sebelumnya
    list.innerHTML = "";

    // Ambil gambar hasil
    const img = resultImage;

    // ==================================================
    // Samakan ukuran canvas dengan ukuran gambar tampil
    // ==================================================
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;

    // Scaling koordinat asli → ukuran canvas
    const scaleX = canvas.width / img.naturalWidth;
    const scaleY = canvas.height / img.naturalHeight;

    // Bersihkan canvas sebelumnya
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ==================================================
    // LOOP SETIAP HASIL DETEKSI
    // ==================================================
    results.forEach(pred => {

        // Ambil koordinat bounding box
        const { x1, y1, x2, y2 } = pred.box;

        console.log("RAW BOX:", x1, y1, x2, y2);

        // Konversi koordinat ke ukuran canvas
        const left = x1 * scaleX;
        const top = y1 * scaleY;
        const w = (x2 - x1) * scaleX;
        const h = (y2 - y1) * scaleY;

        // ==============================================
        // Generate warna unik berdasarkan class
        // ==============================================
        const { r, g, b } = getColorFromClass(pred.name);

        // Warna background box
        const bgColor = `rgb(${r}, ${g}, ${b})`;

        // Warna text label
        const textColor = getTextColor(r, g, b);

        // ==============================================
        // DRAW BOUNDING BOX
        // ==============================================

        // Warna garis box
        ctx.strokeStyle = bgColor;

        // Ketebalan garis
        ctx.lineWidth = 2;

        // Gambar rectangle
        ctx.strokeRect(left, top, w, h);

        // ==============================================
        // LABEL BACKGROUND
        // ==============================================
        ctx.fillStyle = bgColor;

        // Background label
        ctx.fillRect(left, top - 18, 120, 18);

        // ==============================================
        // TEXT LABEL
        // ==============================================
        ctx.fillStyle = textColor;

        // Font text
        ctx.font = "12px sans-serif";

        // Isi text label
        ctx.fillText(
            `${pred.name} (${(pred.confidence * 100).toFixed(1)}%)`,
            left + 5,
            top - 5
        );

        // ==============================================
        // TAMBAHKAN HASIL KE LIST HTML
        // ==============================================
        const li = document.createElement("li");

        li.textContent =
            `${pred.name} (${(pred.confidence * 100).toFixed(1)}%)`;

        list.appendChild(li);

        // ==============================================
        // DRAW SEGMENTATION MASK
        // ==============================================
        if (pred.segments && pred.segments.x.length > 0) {

            // Ambil titik koordinat segmentasi
            const segX = pred.segments.x;
            const segY = pred.segments.y;

            // Mulai path baru
            ctx.beginPath();

            // Loop semua titik polygon
            for (let i = 0; i < segX.length; i++) {

                // Scaling titik segmentasi
                const x = segX[i] * scaleX;
                const y = segY[i] * scaleY;

                // Titik pertama
                if (i === 0) {
                    ctx.moveTo(x, y);
                }

                // Titik berikutnya
                else {
                    ctx.lineTo(x, y);
                }
            }

            // Tutup polygon
            ctx.closePath();

            // ==========================================
            // Isi warna transparan segmentasi
            // ==========================================
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;

            ctx.fill();

            // ==========================================
            // Outline segmentasi
            // ==========================================
            ctx.strokeStyle = bgColor;

            ctx.lineWidth = 2;

            ctx.stroke();
        }
    });
}
