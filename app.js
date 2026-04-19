const SUPABASE_URL = window.ENV.SUPABASE_URL;
const SUPABASE_KEY = window.ENV.SUPABASE_KEY;
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// Uygulama Durumu (State)
// ============================================================
let programData = {
    studentName: "",
    items: [[], [], [], [], [], [], []]
};
let konularData = {};

function generateSecureCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const array = new Uint8Array(12);
    crypto.getRandomValues(array);
    return Array.from(array, byte => chars[byte % chars.length]).join('');
}

// ============================================================
// Konuları JSON'dan Çekme
// ============================================================
async function loadData() {
    try {
        const response = await fetch('konular.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        konularData = await response.json();
    } catch (e) {
        console.warn('konular.json yüklenemedi:', e);
        konularData = { "Hata": ["Veriler Yüklenemedi"] };
    }
    setCategoryFilter('TYT');
    setCurrentWeek();
}

let currentCategoryFilter = 'TYT';
let currentSubjectFilter = '';

function setCategoryFilter(category) {
    currentCategoryFilter = category;
    currentSubjectFilter = '';
    
    const btnIds = {
        'TYT': 'btn-tyt',
        'AYT': 'btn-ayt',
        'LGS': 'btn-lgs',
        '7. Sınıf': 'btn-7'
    };
    
    Object.values(btnIds).forEach(id => {
        const btn = document.getElementById(id);
        if(btn) {
            btn.classList.remove('bg-blue-600', 'text-white');
            btn.classList.add('bg-gray-200', 'text-gray-700');
        }
    });
    
    const activeBtn = document.getElementById(btnIds[category]);
    if (activeBtn) {
        activeBtn.classList.add('bg-blue-600', 'text-white');
        activeBtn.classList.remove('bg-gray-200', 'text-gray-700');
    }
    
    renderSubjectButtons();
    populateDropdown(document.getElementById('searchInput').value);
}

function renderSubjectButtons() {
    const container = document.getElementById('subTopicContainer');
    container.innerHTML = "";
    
    const matchingSubjects = Object.keys(konularData).filter(ders => ders.startsWith(currentCategoryFilter));
    
    if (matchingSubjects.length > 0) {
        container.classList.remove('hidden');
        
        const allBtn = document.createElement('button');
        allBtn.className = `px-2 py-1 text-[9px] font-bold rounded flex-shrink-0 transition-colors ${currentSubjectFilter === '' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`;
        allBtn.textContent = 'TÜMÜ';
        allBtn.onclick = () => {
            currentSubjectFilter = '';
            renderSubjectButtons();
            populateDropdown(document.getElementById('searchInput').value);
        };
        container.appendChild(allBtn);
        
        matchingSubjects.forEach(ders => {
            let cleanName = ders.replace(currentCategoryFilter, '').trim() || ders;
            
            const btn = document.createElement('button');
            const isActive = currentSubjectFilter === ders;
            btn.className = `px-2 py-1 text-[9px] font-bold rounded flex-shrink-0 transition-colors ${isActive ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`;
            btn.textContent = cleanName.toUpperCase();
            btn.onclick = () => {
                if (currentSubjectFilter === ders) {
                    currentSubjectFilter = '';
                } else {
                    currentSubjectFilter = ders;
                }
                renderSubjectButtons();
                populateDropdown(document.getElementById('searchInput').value);
            };
            container.appendChild(btn);
        });
    } else {
        container.classList.add('hidden');
    }
}

function populateDropdown(filter = "") {
    const select = document.getElementById('subjectSelect');
    select.innerHTML = "";

    select.value = select.value || "";

    const lc = filter.toLowerCase();
    for (const ders in konularData) {
        if (!ders.startsWith(currentCategoryFilter)) continue;
        if (currentSubjectFilter && ders !== currentSubjectFilter) continue;

        const cleanDersAdı = ders.replace(currentCategoryFilter, '').trim();

        konularData[ders].forEach(konu => {
            const combined = `${ders} - ${konu}`;
            if (!filter || combined.toLowerCase().includes(lc)) {
                const opt = document.createElement('div');
                opt.className = 'px-2 py-1.5 cursor-pointer text-gray-700 hover:bg-blue-500 hover:text-white transition-colors text-xs flex justify-between items-center group opt-item';
                
                const spanKonu = document.createElement('span');
                spanKonu.className = 'truncate';
                spanKonu.textContent = konu;
                opt.appendChild(spanKonu);

                if (currentSubjectFilter === '') {
                    const spanDers = document.createElement('span');
                    spanDers.className = 'text-[9px] opacity-40 group-hover:opacity-100 uppercase ml-2 flex-shrink-0';
                    spanDers.textContent = cleanDersAdı;
                    opt.appendChild(spanDers);
                }
                
                opt.draggable = true;

                if (select.value === combined) {
                    opt.classList.add('bg-blue-500', 'text-white');
                    opt.classList.remove('text-gray-700');
                }

                opt.addEventListener('click', () => {
                    select.value = combined;
                    Array.from(select.parentElement.querySelectorAll('.opt-item')).forEach(child => {
                        child.classList.remove('bg-blue-500', 'text-white');
                        child.classList.add('text-gray-700');
                    });
                    opt.classList.add('bg-blue-500', 'text-white');
                    opt.classList.remove('text-gray-700');
                });
                
                opt.addEventListener('dblclick', () => {
                    select.value = combined;
                    addItem();
                });

                opt.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', combined);
                    e.dataTransfer.effectAllowed = 'copy';
                    
                    select.value = combined;
                    Array.from(select.parentElement.querySelectorAll('.opt-item')).forEach(child => {
                        child.classList.remove('bg-blue-500', 'text-white');
                        child.classList.add('text-gray-700');
                    });
                    opt.classList.add('bg-blue-500', 'text-white');
                    opt.classList.remove('text-gray-700');
                });

                select.appendChild(opt);
            }
        });
    }
}

document.getElementById('searchInput').addEventListener('input', e => populateDropdown(e.target.value));

// ============================================================
// Hafta Tarihleri
// ============================================================
function setCurrentWeek() {
    const today = new Date();
    const fmt = d => d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const fmtS = d => d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 6);
    document.getElementById('display-date').innerText = `${fmt(today)} - ${fmt(nextWeek)}`;

    const todayIdx = today.getDay();

    const appToJsDayMap = [1, 2, 3, 4, 5, 6, 0];

    for (let appDay = 0; appDay < 7; appDay++) {
        let jsDay = appToJsDayMap[appDay];
        let diff = jsDay - todayIdx;
        if (diff < 0) diff += 7;
        const hedef = new Date(today);
        hedef.setDate(today.getDate() + diff);
        const el = document.getElementById(`date-${appDay}`);
        if (el) el.innerText = fmtS(hedef);
    }
}

// Öğrenci ismi değiştiğinde
document.getElementById('studentName').addEventListener('input', (e) => {
    programData.studentName = e.target.value;
    document.getElementById('display-name').innerText = e.target.value || "ÖĞRENCİ ADI";
});

// ============================================================
// Veri Ekleme
// ============================================================
// Dosyanın en üstüne, diğer değişkenlerin yanına ekle
let isAdding = false;

function addItem() {
    // 🛡️ Koruma Kalkanı: Eğer işlem zaten sürüyorsa (kilitliyse) geri dön
    if (isAdding) return;

    const day = parseInt(document.getElementById('daySelect').value, 10);
    const selected = document.getElementById('subjectSelect').value;
    const note = document.getElementById('noteInput').value.trim();

    if (!selected) {
        showNotification("Lütfen bir konu seçin!", "error");
        return;
    }

    // İşlem başladığı an kilidi devreye sok
    isAdding = true;

    const splitIdx = selected.indexOf(' - ');
    let category = selected;
    let topic = "";
    if (splitIdx !== -1) {
        category = selected.substring(0, splitIdx);
        topic = selected.substring(splitIdx + 3);
    }

    programData.items[day].push({ category, topic, note });
    document.getElementById('noteInput').value = "";
    renderTable();

    // Görsel Geri Bildirim (Önceki adımda eklediğimiz animasyon)
    const dayCell = document.getElementById(`day-${day}`);
    if (dayCell) {
        dayCell.classList.add('added-flash');
        setTimeout(() => { dayCell.classList.remove('added-flash'); }, 450);
    }

    // 🕒 Kilidi 300ms sonra aç (Böylece çift tıklamanın ikinci vuruşu süzülmüş olur)
    setTimeout(() => {
        isAdding = false;
    }, 300);
}

// ============================================================
// Veri Silme
// ============================================================
function removeItem(dayIndex, itemIndex) {
    programData.items[dayIndex].splice(itemIndex, 1);
    renderTable();
}

// ============================================================
// Tabloyu Render Etme
// ============================================================
function renderTable() {
    document.getElementById('display-name').innerText = programData.studentName || "ÖĞRENCİ ADI";
    document.getElementById('studentName').value = programData.studentName || "";

    for (let i = 0; i < 7; i++) {
        const cell = document.getElementById(`day-${i}`);
        cell.innerHTML = ''; // Temizle

        programData.items[i].forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = "item-container group relative mb-3 p-2 border-b border-gray-200 hover:bg-gray-50 transition-colors text-left cursor-move bg-white";
            div.draggable = true;
            div.dataset.day = i;
            div.dataset.idx = idx;

            // Kategori
            const catDiv = document.createElement('div');
            catDiv.className = "font-black text-gray-800 uppercase text-[9px] mb-0.5 leading-none pointer-events-none";
            catDiv.textContent = item.category;
            div.appendChild(catDiv);

            // Konu
            const topicDiv = document.createElement('div');
            topicDiv.className = "text-gray-700 font-bold text-[10px] leading-tight mb-1 uppercase pointer-events-none";
            topicDiv.textContent = item.topic;
            div.appendChild(topicDiv);

            // Not
            if (item.note) {
                const noteDiv = document.createElement('div');
                noteDiv.className = "text-gray-400 italic text-[9px] mt-1 border-t border-gray-100 pt-1 pointer-events-none";
                noteDiv.textContent = "📍 " + item.note;
                div.appendChild(noteDiv);
            }

            // Silme Butonu
            const delBtn = document.createElement('button');
            delBtn.dataset.day = i;
            delBtn.dataset.idx = idx;
            delBtn.className = "del-btn delete-btn no-print absolute -right-1 -top-1 bg-red-500 text-white w-4 h-4 rounded-full text-[8px] flex items-center justify-center shadow-md cursor-pointer hover:bg-red-600";
            delBtn.textContent = "✕";
            div.appendChild(delBtn);

            div.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({ type: 'move_item', day: i, idx: idx }));
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => div.classList.add('opacity-50'), 0);
            });

            div.addEventListener('dragend', () => {
                div.classList.remove('opacity-50');
            });

            cell.appendChild(div);
        });
    }
}

// Event Delegation (Silme işlemi için)
document.getElementById('preview-container').addEventListener('click', (e) => {
    const btn = e.target.closest('.del-btn');
    if (!btn) return;
    const day = parseInt(btn.dataset.day, 10);
    const idx = parseInt(btn.dataset.idx, 10);
    removeItem(day, idx);
});

// ============================================================
// Kaydetme ve PDF Alma (jsPDF + autoTable ile)
// ============================================================
async function saveToCloud() {
    const btn = document.querySelector('.btn-save');
    btn.disabled = true;
    btn.textContent = 'KAYDEDİLİYOR…';

    programData.studentName = document.getElementById('studentName').value.trim();

    try {
        const code = generateSecureCode();

        const { error } = await supabaseClient.from('saved_plans').insert([{
            access_code: code,
            plan_data: programData,
            created_at: new Date().toISOString()
        }]);

        if (error) throw error;

        await generatePDF(code);
        showNotification('Program Kaydedildi. Kodunuz: ' + code, 'success');

        document.getElementById('code-input').value = code;

    } catch (err) {
        console.error('Kayıt hatası:', err.message);
        showNotification('Kayıt başarısız: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'KAYDET VE PDF AL';
    }
}

// ============================================================
// Yüklenen Fontlar için Yardımcı
// ============================================================
async function loadFontsToDoc(doc) {
    const urls = {
        'Roboto-Regular': 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf',
        'Roboto-Medium': 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf'
    };
    for (let fontName in urls) {
        try {
            const res = await fetch(urls[fontName]);
            const buffer = await res.arrayBuffer();
            let binary = '';
            const bytes = new Uint8Array(buffer);
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            doc.addFileToVFS(`${fontName}.ttf`, window.btoa(binary));
            doc.addFont(`${fontName}.ttf`, "Roboto", fontName === 'Roboto-Medium' ? "bold" : "normal");
        } catch (e) {
            console.error("Font yüklenemedi:", e);
        }
    }
}

// ============================================================
// PDF Üretimi (autoTable)
// ============================================================
async function generatePDF(code) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    const btn = document.querySelector('.btn-save');
    if (btn) btn.textContent = 'YAZI TİPİ İNDİRİLİYOR...';

    await loadFontsToDoc(doc);

    // Varsayılan font Roboto olsun (Türkçe karakter destekli)
    doc.setFont("Roboto", "bold");

    // Başlık
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    const titleLines = doc.splitTextToSize('HAFTALIK ÇALIŞMA PROGRAMI', 80);
    doc.text(titleLines, 14, 20);
    const titleHeight = (titleLines.length - 1) * 9; // Her satır için ~9mm ekstra

    // Sağ Üst Bölüm (Öğrenci Adı)
    const rawStudentName = programData.studentName || "ÖĞRENCİ ADI";
    doc.setFont("Roboto", "bold");
    doc.setFontSize(18);
    const nameLines = doc.splitTextToSize(rawStudentName.toLocaleUpperCase('tr-TR'), 80);
    doc.text(nameLines, 196, 20, { align: 'right' });
    const nameHeight = (nameLines.length - 1) * 7.5; // Her satır için ~7.5mm ekstra

    // Alt Başlık (Kod ve Tarih) Y Koordinatını Hesapla
    const subY = 20 + Math.max(titleHeight, nameHeight) + 6;

    // Kodu göster (Alt Başlık)
    doc.setFont("Roboto", "normal");
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(code, 14, subY);

    // Tarih
    const dateText = document.getElementById('display-date').innerText;
    doc.setFont("Roboto", "normal");
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(dateText, 196, subY, { align: 'right' });

    // Ayrım Çizgisi
    const lineY = subY + 4;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(14, lineY, 196, lineY);

    const tableStartY = lineY + 4;

    // Tablo Başlıkları (Gün isimleri + Tarih)
    const days = ['PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA', 'CUMARTESİ', 'PAZAR'];
    const headRow = [];
    for (let i = 0; i < 7; i++) {
        const dt = document.getElementById(`date-${i}`).innerText;
        headRow.push(`${days[i]}\n${dt}`);
    }

    const tableBody = [];
    const maxItems = Math.max(...programData.items.map(d => d.length), 0);

    // Her item'i 3 satırda göstereceğiz: Kategori, Konu, Not
    for (let i = 0; i < maxItems; i++) {
        const catRow = [];
        const topRow = [];
        const notRow = [];

        let isRowEmpty = true;

        for (let day = 0; day < 7; day++) {
            const item = programData.items[day][i];

            if (item) {
                isRowEmpty = false;
                catRow.push(item.category ? item.category.toLocaleUpperCase('tr-TR') : '');
                topRow.push(item.topic ? item.topic.toLocaleUpperCase('tr-TR') : '');
                notRow.push(item.note ? `${item.note}` : '');
            } else {
                catRow.push('');
                topRow.push('');
                notRow.push('');
            }
        }

        if (!isRowEmpty) {
            tableBody.push(catRow);
            tableBody.push(topRow);
            tableBody.push(notRow);
        }
    }

    // PDF çizim işlemi
    doc.autoTable({
        head: [headRow],
        body: tableBody,
        startY: tableStartY,
        theme: 'plain',
        styles: {
            font: "Roboto",
            overflow: 'linebreak',
            cellWidth: 26,
            cellPadding: { top: 1, bottom: 1, left: 1.5, right: 1.5 }
        },
        headStyles: {
            fillColor: [230, 230, 230], // Bir ton daha koyu
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'center',
            valign: 'middle'
        },
        didParseCell: function (data) {
            // Sadece sütunlar arası dikey çizgiler (açık gri) her hücreye eklenecek
            data.cell.styles.lineWidth = { top: 0, bottom: 0, left: 0.1, right: 0.1 };
            data.cell.styles.lineColor = [220, 220, 220];

            if (data.section === 'head') {
                data.cell.styles.lineWidth = { top: 0.1, bottom: 0.1, left: 0.1, right: 0.1 };
                data.cell.styles.fontStyle = 'bold';
            }

            if (data.section === 'body') {
                data.cell.styles.fillColor = [255, 255, 255]; // Tüm body hücrelerinin bembeyaz olmasını garantiliyoruz
                const isLastRow = data.row.index === tableBody.length - 1;
                if (isLastRow) {
                    data.cell.styles.lineWidth = { top: 0, bottom: 0.1, left: 0.1, right: 0.1 };
                }

                const rowIndex = data.row.index % 3;
                if (rowIndex === 0) {
                    // Kategori
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fontSize = 7.5;
                    data.cell.styles.textColor = [20, 20, 20];
                    data.cell.styles.cellPadding = { top: 3, bottom: 0.5, left: 1.5, right: 1.5 };
                } else if (rowIndex === 1) {
                    // Konu
                    data.cell.styles.fontStyle = 'normal';
                    data.cell.styles.fontSize = 7;
                    data.cell.styles.textColor = [50, 50, 50];
                    data.cell.styles.cellPadding = { top: 0.5, bottom: 0.5, left: 1.5, right: 1.5 };
                } else if (rowIndex === 2) {
                    // Not (Açık siyah / koyu gri)
                    data.cell.styles.fontStyle = 'normal';
                    data.cell.styles.fontSize = 6.5;
                    data.cell.styles.textColor = [100, 100, 100];
                    // Alta doğru boşluk bırakarak gapRow ihtiyacını yok ediyoruz
                    data.cell.styles.cellPadding = { top: 0.5, bottom: 2, left: 1.5, right: 1.5 };
                }
            }
        },
        didDrawCell: function (data) {
            // Sonraki derse geçerken sola dayalı küçük ayırıcı çizgiyi not satırının altına çekiyoruz
            if (data.section === 'body' && data.row.index % 3 === 2) {
                const colIdx = data.column.index;
                const itemIdx = Math.floor(data.row.index / 3);

                // Eğer bu günün (kolonun) bir alt dersi varsa divider çiz
                if (programData.items[colIdx] && programData.items[colIdx][itemIdx + 1]) {
                    const doc = data.doc;
                    doc.setDrawColor(200, 200, 200);
                    doc.setLineWidth(0.3);
                    const marginX = 1.5; // Sola dayalı padding kadar boşluk
                    const x = data.cell.x + marginX;
                    const y = data.cell.y + data.cell.height; // Satırın/Dersin tam altına çiz
                    const w = 8; // Kısa çizgi 
                    doc.line(x, y, x + w, y);
                }
            }
        },
        margin: { left: 14, right: 14 }
    });

    // Alt metin (meliktecir)
    doc.setFont("Roboto", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('meliktecir', 196, 290, { align: 'right' });

    let safeName = rawStudentName.replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ]/g, '_').toLowerCase();
    doc.save(safeName + '_program_' + code + '.pdf');
}

// ============================================================
// Sürükle-bırak
// ============================================================

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.item-container:not(.opacity-50)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

for (let i = 0; i < 7; i++) {
    const dropZone = document.getElementById(`day-${i}`);
    if (!dropZone) continue;

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('bg-blue-50');
    });

    dropZone.addEventListener('dragleave', (e) => {
        dropZone.classList.remove('bg-blue-50');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('bg-blue-50');

        let dropIndex = programData.items[i].length;
        const afterElement = getDragAfterElement(dropZone, e.clientY);

        if (afterElement) {
            dropIndex = parseInt(afterElement.dataset.idx, 10);
        }

        // Tablodaki mevcut bir elemanı taşıma durumu
        const dataStr = e.dataTransfer.getData('application/json');
        if (dataStr) {
            try {
                const parsed = JSON.parse(dataStr);
                if (parsed.type === 'move_item') {
                    const sourceDay = parsed.day;
                    const sourceIdx = parsed.idx;

                    if (sourceDay === i && sourceIdx === dropIndex) return;
                    if (sourceDay === i && sourceIdx === dropIndex - 1 && !afterElement) return;

                    const itemToMove = programData.items[sourceDay][sourceIdx];

                    let insertIndex = dropIndex;
                    if (sourceDay === i && sourceIdx < dropIndex) {
                        insertIndex--;
                    }

                    programData.items[sourceDay].splice(sourceIdx, 1);
                    programData.items[i].splice(insertIndex, 0, itemToMove);

                    renderTable();
                    return;
                }
            } catch (err) { }
        }

        // Listeden yeni ders ekleme durumu
        const combined = e.dataTransfer.getData('text/plain');
        if (!combined || !combined.includes(' - ')) return;

        const splitIdx = combined.indexOf(' - ');
        const category = combined.substring(0, splitIdx);
        const topic = combined.substring(splitIdx + 3);
        const note = document.getElementById('noteInput').value.trim();

        programData.items[i].splice(dropIndex, 0, { category, topic, note });
        document.getElementById('noteInput').value = "";

        renderTable();

        dropZone.classList.add('added-flash');
        setTimeout(() => { dropZone.classList.remove('added-flash'); }, 450);
    });
}
// ============================================================
// Yükleme
// ============================================================
async function loadFromCloud() {
    const codeInput = document.getElementById('code-input');
    const code = codeInput.value.trim().toUpperCase();

    if (!code || code.length < 8) {
        showNotification('Lütfen geçerli bir kod girin.', 'error');
        return;
    }

    try {
        // ✅ Artık Edge Function'ı çağırıyoruz, direkt Supabase tablosuna erişmiyoruz
        const response = await fetch(
            'https://efwfloibdttspieemkel.supabase.co/functions/v1/get-plan',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    //'Authorization': `Bearer ${SUPABASE_KEY}` // anon key yeterli
                },
                body: JSON.stringify({ code })
            }
        );

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Yükleme başarısız');
        }

        const data = await response.json();

        // Migration mantığı (eski string array → yeni obje)
        if (Array.isArray(data.plan_data.items[0]) && typeof data.plan_data.items[0][0] === 'string') {
            programData = { studentName: "", items: [[], [], [], [], [], [], []] };
            for (let i = 0; i < 7; i++) {
                programData.items[i] = data.plan_data.items[i].map(str => ({
                    category: 'DERS',
                    topic: str,
                    note: ''
                }));
            }
        } else {
            programData = data.plan_data;
        }

        renderTable();
        showNotification('Program yüklendi!', 'success');
        codeInput.value = '';

    } catch (err) {
        console.error('Yükleme hatası:', err);
        showNotification('Hata: ' + err.message, 'error');
    }
}

// ============================================================
// Yardımcı: Kullanıcı Bildirimi
// ============================================================
function showNotification(message, type = 'info') {
    const existing = document.getElementById('axis-notification');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'axis-notification';
    el.textContent = message;
    el.style.cssText = 'position: fixed; bottom: 24px; right: 24px; padding: 12px 20px; border-radius: 8px; font-size: 14px; color: #fff; z-index: 9999; max-width: 320px; background: ' + (type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db') + '; box-shadow: 0 4px 16px rgba(0,0,0,0.15); animation: slideIn 0.3s ease;';

    let styleEl = document.getElementById('axis-anim-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'axis-anim-style';
        styleEl.textContent = '@keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }';
        document.head.appendChild(styleEl);
    }

    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
}

// ============================================================
// Uygulamayı Başlat
// ============================================================
loadData();
