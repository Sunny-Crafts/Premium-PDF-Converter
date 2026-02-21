document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const previewGrid = document.getElementById('previewGrid');
    const removeAllBtn = document.getElementById('removeAllBtn');
    const convertBtn = document.getElementById('convertBtn');
    const fileCountSpan = document.getElementById('fileCount');

    // Sections
    const converterSection = document.getElementById('converterSection');
    const downloadSection = document.getElementById('downloadSection');
    const downloadLink = document.getElementById('downloadLink');
    const startOverBtn = document.getElementById('startOverBtn');

    // Store all selected files in an array
    let currentFiles = [];

    // --- UPLOAD HANDLING ---
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        dropZone.classList.add('drag-over');
    }

    function unhighlight(e) {
        dropZone.classList.remove('drag-over');
    }

    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', function () {
        handleFiles(this.files);
        this.value = '';
    });

    function handleFiles(files) {
        if (!files || files.length === 0) return;

        const newFiles = Array.from(files).filter(file => file.type.match('image.*'));
        if (newFiles.length === 0) {
            alert('Please upload image files (PNG, JPG, JPEG).');
            return;
        }

        // Add new files to our list
        currentFiles = [...currentFiles, ...newFiles];

        // Append ONLY new cards to the grid (don't nuke existing ones if possible, but for simplicity we re-render ALL on new upload)
        // For upload, full re-render is fine. For reorder, we want DOM manipulation.
        // Actually, let's just re-render everything on upload.
        updateUI();
    }

    function updateUI() {
        fileCountSpan.textContent = currentFiles.length;

        if (currentFiles.length > 0) {
            previewContainer.classList.remove('hidden');
            dropZone.classList.remove('hidden');
            dropZone.querySelector('h3').textContent = "Add More Images";
            enableConvertButton();
        } else {
            previewContainer.classList.add('hidden');
            dropZone.classList.remove('hidden');
            dropZone.querySelector('h3').textContent = "Drag & Drop Images Here";
            disableConvertButton();
        }

        renderGallery();
    }

    // --- RENDER GALLERY ---
    // We attach the FILE OBJECT to the DOM element property so we can track it reliably
    function renderGallery() {
        previewGrid.innerHTML = ''; // Clear only on upload/remove events

        currentFiles.forEach((file, index) => {
            const card = createCard(file);
            previewGrid.appendChild(card);
        });
    }

    function createCard(file) {
        const card = document.createElement('div');
        card.className = 'image-card';
        card.draggable = true;
        // Store file object directly on element for easier recovery
        card.fileObj = file;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = function () {
            const img = document.createElement('img');
            img.src = reader.result;
            img.alt = file.name;
            card.prepend(img); // Prepend to keep before remove button
        }

        const removeBtn = document.createElement('button');
        removeBtn.className = 'card-remove-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            // Remove this specific card
            card.remove();
            // Sync array
            syncFilesFromDOM();
        };

        card.appendChild(removeBtn);

        // Drag Events
        addDragEvents(card);

        return card;
    }

    // --- ROBUST DRAG & DROP LOGIC (DOM SWAP) ---
    let dragSrcEl = null;

    function addDragEvents(card) {
        card.addEventListener('dragstart', handleDragStart, false);
        card.addEventListener('dragenter', handleDragEnter, false);
        card.addEventListener('dragover', handleDragOver, false);
        card.addEventListener('dragleave', handleDragLeave, false);
        card.addEventListener('drop', handleDropCard, false);
        card.addEventListener('dragend', handleDragEnd, false);
    }

    function handleDragStart(e) {
        dragSrcEl = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
    }

    function handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault(); // Necessary to allow dropping
        }
        e.dataTransfer.dropEffect = 'move';

        // LIVE SORTING logic
        if (dragSrcEl && dragSrcEl !== this) {
            // Get all cards to find positions
            const cards = [...previewGrid.querySelectorAll('.image-card')];
            const srcIndex = cards.indexOf(dragSrcEl);
            const targetIndex = cards.indexOf(this);

            if (targetIndex > -1 && srcIndex > -1) {
                // If moving right (src < target), insert after target
                // If moving left (src > target), insert before target
                // Actually, just inserting before/after the hovered element works well for grid

                // To prevent jitter, we can check if we are significantly over the target.
                // But simple swapping on hover is usually what "live sort" means.

                if (srcIndex < targetIndex) {
                    this.after(dragSrcEl);
                } else {
                    this.before(dragSrcEl);
                }
            }
        }

        return false;
    }

    function handleDragEnter(e) {
        // Optional: Add visual highlight to target if needed, 
        // but live sorting acts as its own highlight.
        this.classList.add('over');
    }

    function handleDragLeave(e) {
        this.classList.remove('over');
    }

    function handleDropCard(e) {
        e.stopPropagation();
        e.preventDefault();

        // Final sync of array with DOM order
        syncFilesFromDOM();

        return false;
    }

    function handleDragEnd(e) {
        this.classList.remove('dragging');
        this.style.opacity = '1';

        let items = previewGrid.querySelectorAll('.image-card');
        items.forEach(function (item) {
            item.classList.remove('over');
        });

        dragSrcEl = null;
    }

    function syncFilesFromDOM() {
        const cards = previewGrid.querySelectorAll('.image-card');
        currentFiles = Array.from(cards).map(card => card.fileObj);
        fileCountSpan.textContent = currentFiles.length;

        // Update UI state if empty
        if (currentFiles.length === 0) {
            updateUI();
        }
    }

    removeAllBtn.addEventListener('click', () => {
        currentFiles = [];
        updateUI();
    });

    function enableConvertButton() {
        convertBtn.classList.remove('disabled');
    }

    function disableConvertButton() {
        convertBtn.classList.add('disabled');
    }

    // SERVER-SIDE CONVERSION
    convertBtn.addEventListener('click', () => {
        if (currentFiles.length === 0) return;

        const originalText = convertBtn.querySelector('span').textContent;
        convertBtn.querySelector('span').textContent = 'Converting...';

        const formData = new FormData();
        // currentFiles is always in sync with DOM order now
        currentFiles.forEach(file => {
            formData.append('files[]', file);
        });

        fetch('/convert', {
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
                    alert('Conversion error: ' + data.error);
                    convertBtn.querySelector('span').textContent = originalText;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred during conversion.');
                convertBtn.querySelector('span').textContent = originalText;
            });
    });

    startOverBtn.addEventListener('click', () => {
        currentFiles = [];
        updateUI();
        downloadSection.classList.add('hidden');
        converterSection.classList.remove('hidden');
        convertBtn.querySelector('span').textContent = 'Convert to PDF';
    });
});
