document.addEventListener('DOMContentLoaded', () => {
    // TABS
    const tabs = document.querySelectorAll('.tab-btn');
    const sections = {
        'word2pdf': document.getElementById('word2pdf'),
        'pdf2word': document.getElementById('pdf2word')
    };

    let currentMode = 'word2pdf'; // default

    // Helper to update UI based on currentMode
    function updateTabs() {
        // Update Buttons
        tabs.forEach(t => {
            t.classList.remove('active');
            if (t.dataset.tab === currentMode) t.classList.add('active');
        });

        // Update Sections
        Object.values(sections).forEach(s => s.classList.remove('active'));
        if (sections[currentMode]) sections[currentMode].classList.add('active');
    }

    // Check Hash on Load
    if (window.location.hash === '#pdf2word') {
        currentMode = 'pdf2word';
    } else if (window.location.hash === '#word2pdf') {
        currentMode = 'word2pdf';
    }

    // Initial Update
    updateTabs();

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            currentMode = tab.dataset.tab;
            updateTabs();
            // Reset UI on switch
            resetUI();
        });
    });

    // --- SHARED DOWNLOAD SECTION ---
    const downloadSection = document.getElementById('downloadSection');
    const downloadLink = document.getElementById('downloadLink');
    const startOverBtn = document.getElementById('startOverBtn');

    startOverBtn.addEventListener('click', () => {
        downloadSection.classList.add('hidden');
        resetUI();
        // Show correct active section
        sections[currentMode].classList.add('active');
    });

    function resetUI() {
        document.querySelectorAll('.converter-card').forEach(c => {
            if (c.id !== downloadSection.id) {
                // reset inputs
                const btn = c.querySelector('.btn-primary');
                if (btn) {
                    btn.classList.add('disabled');
                    btn.querySelector('span').textContent = btn.id.includes('Word') ? 'Convert to PDF' : 'Convert to Word';
                }
            }
        });
        currentFileWord = null;
        currentFilePdf = null;
    }

    // --- WORD TO PDF LOGIC ---
    const dropZoneWord = document.getElementById('dropZoneWord');
    const fileInputWord = document.getElementById('fileInputWord');
    const convertBtnWord = document.getElementById('convertBtnWord');
    let currentFileWord = null;

    setupDropZone(dropZoneWord, fileInputWord, (file) => {
        currentFileWord = file;
        convertBtnWord.classList.remove('disabled');
        dropZoneWord.querySelector('h3').textContent = file.name;
    }, ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']);

    convertBtnWord.addEventListener('click', () => {
        if (!currentFileWord) return;
        performConversion('/word-to-pdf-action', currentFileWord, convertBtnWord, 'PDF');
    });

    // --- PDF TO WORD LOGIC ---
    const dropZonePdf = document.getElementById('dropZonePdf');
    const fileInputPdf = document.getElementById('fileInputPdf');
    const convertBtnPdf = document.getElementById('convertBtnPdf');
    let currentFilePdf = null;

    setupDropZone(dropZonePdf, fileInputPdf, (file) => {
        currentFilePdf = file;
        convertBtnPdf.classList.remove('disabled');
        dropZonePdf.querySelector('h3').textContent = file.name;
    }, ['application/pdf']);

    convertBtnPdf.addEventListener('click', () => {
        if (!currentFilePdf) return;
        performConversion('/pdf-to-word-action', currentFilePdf, convertBtnPdf, 'Word');
    });


    // --- HELPER FUNCTIONS ---
    function setupDropZone(zone, input, callback, types) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            zone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            zone.addEventListener(eventName, () => zone.classList.add('drag-over'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            zone.addEventListener(eventName, () => zone.classList.remove('drag-over'), false);
        });

        zone.addEventListener('drop', (e) => {
            const file = e.dataTransfer.files[0];
            if (file && checkType(file, types)) callback(file);
        });

        zone.addEventListener('click', () => input.click());
        input.addEventListener('change', function () {
            if (this.files[0] && checkType(this.files[0], types)) callback(this.files[0]);
            this.value = '';
        });
    }

    function checkType(file, types) {
        // Simple check, mostly rely on extension for Word as MIME types vary
        return true;
    }

    function performConversion(url, file, btn, targetFormat) {
        const originalText = btn.querySelector('span').textContent;
        btn.querySelector('span').textContent = 'Converting...';

        const formData = new FormData();
        formData.append('file', file);

        fetch(url, {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    sections[currentMode].classList.remove('active');
                    downloadSection.classList.remove('hidden');
                    downloadLink.href = data.download_url;
                    document.getElementById('successTitle').textContent = `Converted to ${targetFormat}!`;
                } else {
                    alert('Error: ' + data.error);
                    btn.querySelector('span').textContent = originalText;
                }
            })
            .catch(error => {
                console.error(error);
                alert('An error occurred.');
                btn.querySelector('span').textContent = originalText;
            });
    }
});
