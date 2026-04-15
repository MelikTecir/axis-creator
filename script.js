// ─── Veri ────────────────────────────────────────────────────────────────────
let konularData = {};

async function loadData() {
    try {
        const response = await fetch('konular.json');
        konularData = await response.json();
    } catch (e) {
        console.warn('konular.json yüklenemedi, varsayılan veri kullanılıyor.');
        konularData = {};
    }
    populateDropdown();
    setCurrentWeek();
}

// ─── Hafta Tarihleri ─────────────────────────────────────────────────────────
function setCurrentWeek() {
    const today = new Date();
    const fmt  = d => d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const fmtS = d => d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 6);
    document.getElementById('display-date').innerText = `${fmt(today)} - ${fmt(nextWeek)}`;

    const indexMap = { pazartesi: 1, sali: 2, carsamba: 3, persembe: 4, cuma: 5, cumartesi: 6, pazar: 0 };
    const todayIdx = today.getDay();

    Object.entries(indexMap).forEach(([gunId, targetIdx]) => {
        let diff = targetIdx - todayIdx;
        if (diff < 0) diff += 7;
        const hedef = new Date(today);
        hedef.setDate(today.getDate() + diff);
        const el = document.getElementById(`date-${gunId}`);
        if (el) el.innerText = fmtS(hedef);
    });
}

// ─── Dropdown ────────────────────────────────────────────────────────────────
function populateDropdown(filter = "") {
    const select = document.getElementById('subjectSelect');
    select.innerHTML = "";
    const lc = filter.toLowerCase();
    for (const ders in konularData) {
        konularData[ders].forEach(konu => {
            const combined = `${ders} - ${konu}`;
            if (!filter || combined.toLowerCase().includes(lc)) {
                const opt = document.createElement('option');
                opt.value = combined;
                opt.textContent = combined;
                select.appendChild(opt);
            }
        });
    }
}

document.getElementById('searchInput').addEventListener('input', e => populateDropdown(e.target.value));

// ─── Ekleme ──────────────────────────────────────────────────────────────────
function addToSchedule() {
    const day      = document.getElementById('daySelect').value;
    const selected = document.getElementById('subjectSelect').value;
    const note     = document.getElementById('noteInput').value.trim();

    if (!selected) { alert("Lütfen bir konu seçin!"); return; }

    const [category, ...rest] = selected.split(' - ');
    const topic = rest.join(' - ');
    const cell  = document.getElementById(day);

    const item = document.createElement('div');
    item.className = "item-container group relative mb-3 p-2 border-b border-gray-200 hover:bg-gray-50 transition-colors text-left";
    item.innerHTML = `
        <div class="font-black text-gray-800 uppercase text-[9px] mb-0.5 leading-none">${category}</div>
        <div class="text-gray-700 font-bold text-[10px] leading-tight mb-1 uppercase">${topic}</div>
        ${note ? `<div class="text-gray-400 italic text-[9px] mt-1 border-t border-gray-100 pt-1">📍 ${note}</div>` : ''}
        <button onclick="this.parentElement.remove()"
            class="delete-btn no-print absolute -right-1 -top-1 bg-gray-800 text-white w-4 h-4 rounded-full text-[8px] flex items-center justify-center shadow-md">✕</button>
    `;
    cell.appendChild(item);
    document.getElementById('noteInput').value = "";
}

// ─── PDF ─────────────────────────────────────────────────────────────────────
async function generatePDF() {
    const btn = document.getElementById('pdf-btn');
    btn.disabled = true;
    btn.textContent = 'Hazırlanıyor...';

    const name = document.getElementById('studentName').value.trim();
    document.getElementById('display-name').innerText = name || "ÖĞRENCİ ADI";

    const source = document.getElementById('pdf-content');

    // Klonu oluştur, silme butonlarını ve yazdırılmayacak elemanları kaldır
    const clone = source.cloneNode(true);
    clone.querySelectorAll('.no-print').forEach(el => el.remove());
    clone.style.boxShadow = 'none';
    clone.style.margin = '0';

    // Klonu ekran DIŞI sabit kaba koy
    // left: -9999px → tarayıcı layout hesaplar ama kullanıcı görmez
    // html2canvas bu kaba (0,0)'dan referans alır → kayma imkansız
    const wrapper = document.getElementById('offscreen-wrapper');
    wrapper.innerHTML = '';
    wrapper.appendChild(clone);

    // Tarayıcıya layout tamamlaması için iki frame ver
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    try {
        const canvas = await html2canvas(clone, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0,
            x: 0,
            y: 0,
            width:  clone.offsetWidth,
            height: clone.offsetHeight,
        });

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

        const pageW = pdf.internal.pageSize.getWidth();   // 210mm
        const pageH = pdf.internal.pageSize.getHeight();  // 297mm
        const imgH  = (canvas.height * pageW) / canvas.width;

        pdf.addImage(
            canvas.toDataURL('image/jpeg', 0.98),
            'JPEG',
            0, 0,                           // x=0, y=0 → sol üst köşe, kayma yok
            pageW,
            imgH > pageH ? pageH : imgH     // sayfayı taşırma
        );

        pdf.save(`${name || 'yks'}_programi.pdf`);

    } finally {
        wrapper.innerHTML = '';
        btn.disabled = false;
        btn.textContent = 'PDF İNDİR';
    }
}

window.onload = loadData;
