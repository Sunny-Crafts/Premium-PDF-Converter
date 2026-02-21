document.addEventListener('DOMContentLoaded', () => {
    // TABS
    const tabs = document.querySelectorAll('.tab-btn');
    const sections = {
        'pdf2jpg': document.getElementById('pdf2jpg'),
        'jpg2pdf': document.getElementById('jpg2pdf')
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.dataset.tab;
            Object.values(sections).forEach(s => s.classList.remove('active'));
            sections[target].classList.add('active');
        });
    });

    const dropZone = document.getElementById('dropZonePdf');
    const fileInput = document.getElementById('fileInputPdf');
    const convertBtn = document.getElementById('convertBtnPdf');
    const downloadSection = document.getElementById('downloadSection');
    const downloadLink = document.getElementById('downloadLink');
    const startOverBtn = document.getElementById('startOverBtn');

    let currentFile = null;

    setupDropZone(dropZone, fileInput, (file) => {
        currentFile = file;
        convertBtn.classList.remove('disabled');
        dropZone.querySelector('h3').textContent = file.name;
    });

    convertBtn.addEventListener('click', () => {
        if (!currentFile) return;
        const originalText = convertBtn.querySelector('span').textContent;
        convertBtn.querySelector('span').textContent = 'Extracting...';

        const formData = new FormData();
        formData.append('file', currentFile);

        fetch('/pdf-to-jpg-action', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    sections['pdf2jpg'].classList.remove('active');
                    downloadSection.classList.remove('hidden');
                    downloadLink.href = data.download_url;
                } else {
                    alert('Error: ' + data.error);
                    convertBtn.querySelector('span').textContent = originalText;
                }
            })
            .catch(error => {
                console.error(error);
                alert('An error occurred.');
                convertBtn.querySelector('span').textContent = originalText;
            });
    });

    startOverBtn.addEventListener('click', () => {
        downloadSection.classList.add('hidden');
        sections['pdf2jpg'].classList.add('active');
        currentFile = null;
        dropZone.querySelector('h3').textContent = "Drag & Drop PDF to Extract Images";
        convertBtn.classList.add('disabled');
        convertBtn.querySelector('span').textContent = "Extract Images";
    });

    function setupDropZone(zone, input, callback) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => {
            zone.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
        });
        ['dragenter', 'dragover'].forEach(ev => zone.addEventListener(ev, () => zone.classList.add('drag-over'), false));
        ['dragleave', 'drop'].forEach(ev => zone.addEventListener(ev, () => zone.classList.remove('drag-over'), false));

        zone.addEventListener('drop', (e) => {
            const file = e.dataTransfer.files[0];
            if (file && file.type === 'application/pdf') callback(file);
        });
        zone.addEventListener('click', () => input.click());
        input.addEventListener('change', function () {
            if (this.files[0]) callback(this.files[0]);
            this.value = '';
        });
    }
});
