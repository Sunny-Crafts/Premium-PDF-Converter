document.addEventListener('DOMContentLoaded', () => {
    // TABS
    const tabs = document.querySelectorAll('.tab-btn');
    const sections = {
        'compress': document.getElementById('compress'),
        'resize': document.getElementById('resize')
    };

    let currentMode = 'compress';

    // Check Hash on Load
    if (window.location.hash === '#resize') {
        currentMode = 'resize';
    }

    function updateTabs() {
        tabs.forEach(t => t.classList.remove('active'));
        const activeTabBtn = document.querySelector(`.tab-btn[data-tab="${currentMode}"]`);
        if (activeTabBtn) activeTabBtn.classList.add('active');

        Object.values(sections).forEach(s => s.classList.remove('active'));
        sections[currentMode].classList.add('active');
    }
    updateTabs();

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            currentMode = tab.dataset.tab;
            updateTabs();
            // Reset UI?? Maybe not needed on simple switch, but okay.
        });
    });

    const downloadSection = document.getElementById('downloadSection');
    const downloadLink = document.getElementById('downloadLink');
    const startOverBtn = document.getElementById('startOverBtn');

    startOverBtn.addEventListener('click', () => {
        downloadSection.classList.add('hidden');
        sections[currentMode].classList.add('active');

        // Reset current mode UI
        resetCompressUI();
        resetResizeUI();
    });

    // COMPRESS LOGIC
    const dropZoneCompress = document.getElementById('dropZoneCompress');
    const fileInputCompress = document.getElementById('fileInputCompress');
    const convertBtnCompress = document.getElementById('convertBtnCompress');
    const optionsCompress = document.getElementById('optionsCompress');
    const compressTargetSize = document.getElementById('compressTargetSize');
    const compressOriginalSize = document.getElementById('compressOriginalSize');
    const compressImagePreview = document.getElementById('compressImagePreview');
    let currentFileCompress = null;

    // Format bytes to readable size
    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Update original size display
    function updateCompressOriginalSize() {
        if (!currentFileCompress) return;
        compressOriginalSize.textContent = formatBytes(currentFileCompress.size);
    }

    setupDropZone(dropZoneCompress, fileInputCompress, (file) => {
        currentFileCompress = file;
        dropZoneCompress.classList.add('hidden');
        optionsCompress.classList.remove('hidden');

        // Show image preview
        const reader = new FileReader();
        reader.onload = (e) => {
            compressImagePreview.src = e.target.result;
        };
        reader.readAsDataURL(file);

        convertBtnCompress.classList.remove('disabled');
        updateCompressOriginalSize();
    });

    convertBtnCompress.addEventListener('click', () => {
        if (!currentFileCompress) return;
        const formData = new FormData();
        formData.append('file', currentFileCompress);
        if (compressTargetSize.value) formData.append('target_size_kb', compressTargetSize.value);

        performAction('/image-tools/compress', formData, convertBtnCompress);
    });

    function resetCompressUI() {
        currentFileCompress = null;
        dropZoneCompress.classList.remove('hidden');
        optionsCompress.classList.add('hidden');
        convertBtnCompress.classList.add('disabled');
        convertBtnCompress.querySelector('span').textContent = 'Compress Image';
        compressTargetSize.value = '';
    }

    // RESIZE LOGIC
    const dropZoneResize = document.getElementById('dropZoneResize');
    const fileInputResize = document.getElementById('fileInputResize');
    const convertBtnResize = document.getElementById('convertBtnResize');
    const optionsResize = document.getElementById('optionsResize');
    const widthInput = document.getElementById('resizeWidth');
    const heightInput = document.getElementById('resizeHeight');
    const targetSizeInput = document.getElementById('targetSizeInput');
    const resizeOriginalSize = document.getElementById('resizeOriginalSize');
    const resizeImagePreview = document.getElementById('resizeImagePreview');
    let currentFileResize = null;

    // Update original size display
    function updateResizeOriginalSize() {
        if (!currentFileResize) return;
        resizeOriginalSize.textContent = formatBytes(currentFileResize.size);
    }

    setupDropZone(dropZoneResize, fileInputResize, (file) => {
        currentFileResize = file;
        dropZoneResize.classList.add('hidden');
        optionsResize.classList.remove('hidden');

        // Show image preview
        const reader = new FileReader();
        reader.onload = (e) => {
            resizeImagePreview.src = e.target.result;
        };
        reader.readAsDataURL(file);

        convertBtnResize.classList.remove('disabled');
        updateResizeOriginalSize();
    });

    convertBtnResize.addEventListener('click', () => {
        if (!currentFileResize) return;
        const formData = new FormData();
        formData.append('file', currentFileResize);
        if (widthInput.value) formData.append('width', widthInput.value);
        if (heightInput.value) formData.append('height', heightInput.value);
        if (targetSizeInput.value) formData.append('target_size_kb', targetSizeInput.value);

        performAction('/image-tools/resize', formData, convertBtnResize);
    });

    function resetResizeUI() {
        currentFileResize = null;
        dropZoneResize.classList.remove('hidden');
        optionsResize.classList.add('hidden');
        convertBtnResize.classList.add('disabled');
        convertBtnResize.querySelector('span').textContent = 'Increase Image Size';
        widthInput.value = '';
        heightInput.value = '';
        targetSizeInput.value = '';
    }

    // SHARED HELPER
    function performAction(url, formData, btn) {
        const originalText = btn.querySelector('span').textContent;
        btn.querySelector('span').textContent = 'Processing...';

        fetch(url, { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    sections[currentMode].classList.remove('active');
                    downloadSection.classList.remove('hidden');
                    downloadLink.href = data.download_url;
                } else {
                    alert('Error: ' + data.error);
                    btn.querySelector('span').textContent = originalText;
                }
            })
            .catch(err => {
                console.error(err);
                alert('Error processing request.');
                btn.querySelector('span').textContent = originalText;
            });
    }

    function setupDropZone(zone, input, callback) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => {
            zone.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
        });
        ['dragenter', 'dragover'].forEach(ev => zone.addEventListener(ev, () => zone.classList.add('drag-over'), false));
        ['dragleave', 'drop'].forEach(ev => zone.addEventListener(ev, () => zone.classList.remove('drag-over'), false));

        zone.addEventListener('drop', (e) => {
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) callback(file);
        });
        zone.addEventListener('click', () => input.click());
        input.addEventListener('change', function () {
            if (this.files[0]) callback(this.files[0]);
            this.value = '';
        });
    }
});
