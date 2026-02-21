document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const optionsArea = document.getElementById('optionsArea');
    const removeFileBtn = document.getElementById('removeFileBtn');
    const convertBtn = document.getElementById('convertBtn');
    const fileNameSpan = document.getElementById('fileName');

    const converterSection = document.getElementById('converterSection');
    const downloadSection = document.getElementById('downloadSection');
    const downloadLink = document.getElementById('downloadLink');
    const startOverBtn = document.getElementById('startOverBtn');

    let currentFile = null;

    // --- UPLOAD HANDLING ---
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }
    function highlight(e) { dropZone.classList.add('drag-over'); }
    function unhighlight(e) { dropZone.classList.remove('drag-over'); }

    ['dragenter', 'dragover'].forEach(eventName => { dropZone.addEventListener(eventName, highlight, false); });
    ['dragleave', 'drop'].forEach(eventName => { dropZone.addEventListener(eventName, unhighlight, false); });

    dropZone.addEventListener('drop', handleDrop, false);
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', function () { handleFile(this.files[0]); this.value = ''; });

    function handleDrop(e) {
        const dt = e.dataTransfer;
        handleFile(dt.files[0]);
    }

    function handleFile(file) {
        if (!file) return;
        if (file.type !== 'application/pdf') {
            alert('Please upload a PDF file.');
            return;
        }

        currentFile = file;
        updateUI();
    }

    function updateUI() {
        if (currentFile) {
            dropZone.classList.add('hidden');
            optionsArea.classList.remove('hidden');
            fileNameSpan.textContent = currentFile.name;
            enableConvertButton();
        } else {
            dropZone.classList.remove('hidden');
            optionsArea.classList.add('hidden');
            disableConvertButton();
        }
    }

    removeFileBtn.addEventListener('click', () => {
        currentFile = null;
        updateUI();
    });

    function enableConvertButton() { convertBtn.classList.remove('disabled'); }
    function disableConvertButton() { convertBtn.classList.add('disabled'); }

    // --- COMPRESS ---
    convertBtn.addEventListener('click', () => {
        if (!currentFile) return;

        const originalText = convertBtn.querySelector('span').textContent;
        convertBtn.querySelector('span').textContent = 'Compressing...';

        const formData = new FormData();
        formData.append('file', currentFile);

        // Get compression level
        const level = document.querySelector('input[name="compression"]:checked').value;
        formData.append('level', level);

        fetch('/compress-pdf-action', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    converterSection.classList.add('hidden');
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
        currentFile = null;
        updateUI();
        downloadSection.classList.add('hidden');
        converterSection.classList.remove('hidden');
        convertBtn.querySelector('span').textContent = 'Compress PDF';
    });
});
