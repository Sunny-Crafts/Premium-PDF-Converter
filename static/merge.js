document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const previewGrid = document.getElementById('previewGrid');
    const removeAllBtn = document.getElementById('removeAllBtn');
    const convertBtn = document.getElementById('convertBtn');
    const fileCountSpan = document.getElementById('fileCount');

    const converterSection = document.getElementById('converterSection');
    const downloadSection = document.getElementById('downloadSection');
    const downloadLink = document.getElementById('downloadLink');
    const startOverBtn = document.getElementById('startOverBtn');

    let currentFiles = [];

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
    fileInput.addEventListener('change', function () { handleFiles(this.files); this.value = ''; });

    function handleDrop(e) {
        const dt = e.dataTransfer;
        handleFiles(dt.files);
    }

    function handleFiles(files) {
        if (!files || files.length === 0) return;
        const newFiles = Array.from(files).filter(file => file.type === 'application/pdf');

        if (newFiles.length === 0) {
            alert('Please upload PDF files only.');
            return;
        }

        currentFiles = [...currentFiles, ...newFiles];
        updateUI();
        renderGallery();
    }

    function updateUI() {
        fileCountSpan.textContent = currentFiles.length;
        if (currentFiles.length > 0) {
            previewContainer.classList.remove('hidden');
            dropZone.classList.remove('hidden');
            dropZone.querySelector('h3').textContent = "Add More PDFs";
            enableConvertButton();
        } else {
            previewContainer.classList.add('hidden');
            dropZone.classList.remove('hidden');
            dropZone.querySelector('h3').textContent = "Drag & Drop PDFs Here";
            disableConvertButton();
        }
    }

    // --- RENDER ---
    function renderGallery() {
        previewGrid.innerHTML = '';
        currentFiles.forEach((file, index) => {
            const card = createCard(file);
            previewGrid.appendChild(card);
        });
    }

    function createCard(file) {
        const card = document.createElement('div');
        card.className = 'image-card'; // Reuse style
        card.draggable = true;
        card.fileObj = file;

        // PDF Icon instead of image preview
        const iconDiv = document.createElement('div');
        iconDiv.style.width = '100%';
        iconDiv.style.height = '100%';
        iconDiv.style.display = 'flex';
        iconDiv.style.flexDirection = 'column';
        iconDiv.style.justifyContent = 'center';
        iconDiv.style.alignItems = 'center';
        iconDiv.style.color = '#ef4444'; // PDF Red

        iconDiv.innerHTML = `
            <i class="fa-solid fa-file-pdf" style="font-size: 3rem; margin-bottom: 0.5rem;"></i>
            <span style="font-size: 0.8rem; color:white; padding:0 5px; text-align:center; word-break:break-word;">${file.name}</span>
        `;

        card.appendChild(iconDiv);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'card-remove-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            card.remove();
            syncFilesFromDOM();
        };

        card.appendChild(removeBtn);
        addDragEvents(card);
        return card;
    }

    // --- DRAG & DROP (Copied from Image logic) ---
    let dragSrcEl = null;

    function addDragEvents(card) {
        card.addEventListener('dragstart', handleDragStart, false);
        card.addEventListener('dragover', handleDragOver, false);
        card.addEventListener('dragend', handleDragEnd, false);
    }

    function handleDragStart(e) {
        dragSrcEl = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
    }

    function handleDragOver(e) {
        if (e.preventDefault) e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (dragSrcEl && dragSrcEl !== this) {
            const cards = [...previewGrid.querySelectorAll('.image-card')];
            const srcIndex = cards.indexOf(dragSrcEl);
            const targetIndex = cards.indexOf(this);

            if (srcIndex < targetIndex) {
                this.after(dragSrcEl);
            } else {
                this.before(dragSrcEl);
            }
            syncFilesFromDOM();
        }
        return false;
    }

    function handleDragEnd(e) {
        this.classList.remove('dragging');
        dragSrcEl = null;
    }

    function syncFilesFromDOM() {
        const cards = previewGrid.querySelectorAll('.image-card');
        currentFiles = Array.from(cards).map(card => card.fileObj);
        fileCountSpan.textContent = currentFiles.length;
        if (currentFiles.length === 0) updateUI();
    }

    removeAllBtn.addEventListener('click', () => { currentFiles = []; updateUI(); renderGallery(); });
    function enableConvertButton() { convertBtn.classList.remove('disabled'); }
    function disableConvertButton() { convertBtn.classList.add('disabled'); }

    // --- MERGE ---
    convertBtn.addEventListener('click', () => {
        if (currentFiles.length === 0) return;

        const originalText = convertBtn.querySelector('span').textContent;
        convertBtn.querySelector('span').textContent = 'Merging...';

        const formData = new FormData();
        currentFiles.forEach(file => { formData.append('files[]', file); });

        fetch('/merge-pdf-action', { // Distinct route for merging
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
        currentFiles = [];
        updateUI();
        renderGallery();
        downloadSection.classList.add('hidden');
        converterSection.classList.remove('hidden');
        convertBtn.querySelector('span').textContent = 'Merge PDFs';
    });
});
