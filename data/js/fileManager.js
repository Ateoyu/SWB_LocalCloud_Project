import { state, setStatus, updateProgress, updateSDInfo, updatePathDisplay, updateBatchActions } from './uiManager.js';
import { toggleFileSelection } from './batchActions.js';
import { setupLightbox } from './lightbox.js';
function refreshFileList() {
    setStatus('Loading files...');
    state.selectedFiles.clear();
    updateBatchActions();

    fetch('/list?path=' + encodeURIComponent(state.currentPath))
        .then(response => response.text())
        .then(html => {
            const fileGrid = document.getElementById('fileTable');
            if (fileGrid) {
                fileGrid.innerHTML = html;
                setupDynamicEventListeners();
            }
            setStatus('Files loaded!');
            updatePathDisplay();
            updateBatchActions();

            const selectAllCheckbox = document.getElementById('selectAllCheckbox');
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            }

            setTimeout(() => {
                document.querySelectorAll('#fileTable input.select-checkbox').forEach(checkbox => {
                    checkbox.addEventListener('change', function() {
                        if (this.dataset.path) {
                            toggleFileSelection(this.dataset.path, this);
                        }
                    });
                });
                // Bind lightbox to image previews
                setupLightbox();
                setupDragAndDrop();
            }, 100);
        })
        .catch(error => {
            setStatus('Error loading files');
            console.error('Error:', error);
        });
}

function setupDynamicEventListeners() {
    document.querySelectorAll('#fileTable .file-item [onclick*="navigateToFolder"]').forEach(button => {
        const onclick = button.getAttribute('onclick');
        const match = onclick && onclick.match(/navigateToFolder\('([^']+)'\)/);
        if (match) {
            button.removeAttribute('onclick');
            button.addEventListener('click', () => {
                window.navigateToFolder && window.navigateToFolder(match[1]);
            });
        }
    });

    document.querySelectorAll('#fileTable .file-item [onclick="navigateToParent()"]').forEach(button => {
        button.removeAttribute('onclick');
        button.addEventListener('click', () => window.navigateToParent && window.navigateToParent());
    });
}

function setupDragAndDrop() {
    const items = document.querySelectorAll('#fileTable .file-item');

    items.forEach(item => {
        const checkbox = item.querySelector('input.select-checkbox');
        const card = item.querySelector('.file-card');
        if (!card) return;

        if (checkbox && checkbox.dataset.path) {
            card.setAttribute('draggable', 'true');

            card.addEventListener('dragstart', (e) => onDragStart(e, item));
            card.addEventListener('dragend', onDragEnd);
        }

        if (item.dataset.type === 'folder' || item.dataset.type === 'back') {
            card.addEventListener('dragenter', onDragEnter);
            card.addEventListener('dragover', onDragOver);
            card.addEventListener('dragleave', onDragLeave);
            card.addEventListener('drop', (e) => onDrop(e, item));
        }
    });
}

function collectDragSources(draggedItem) {
    const draggedPath = draggedItem.querySelector('input.select-checkbox')?.dataset.path;
    if (!draggedPath) return [];

    if (state.selectedFiles.size > 0 && state.selectedFiles.has(draggedPath)) {
        return Array.from(state.selectedFiles);
    }
    return [draggedPath];
}

function onDragStart(e, item) {
    const srcPaths = collectDragSources(item);
    if (srcPaths.length === 0) return;

    try { e.dataTransfer.setData('text/plain', JSON.stringify(srcPaths)); } catch (_) {}
    e.dataTransfer.effectAllowed = 'move';
    item.classList.add('dragging');
}

function onDragEnd(e) {
    const dragging = document.querySelector('#fileTable .file-item.dragging');
    dragging?.classList.remove('dragging');
}

function onDragEnter(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drop-target');
}

function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function onDragLeave(e) {
    e.currentTarget.classList.remove('drop-target');
}

function onDrop(e, folderItem) {
    e.preventDefault();
    const card = e.currentTarget;
    card.classList.remove('drop-target');

    let data = [];
    try {
        const txt = e.dataTransfer.getData('text/plain');
        if (txt) data = JSON.parse(txt);
    } catch (_) {}

    let dstPath;
    if (folderItem.dataset.type === 'back') {
        dstPath = getParentPath(state.currentPath);
    } else {
        dstPath = folderItem.querySelector('input.select-checkbox')?.dataset.path;
    }
    if (!dstPath || data.length === 0) return;

    moveItems(data, dstPath);
}

function getParentPath(path) {
    if (!path || path === '/') return '/';
    const parts = path.split('/').filter(Boolean);
    parts.pop();
    return parts.length ? '/' + parts.join('/') : '/';
}

function moveItems(srcPaths, dstFolderPath) {
    const folderName = dstFolderPath.split('/').filter(Boolean).pop() || '/';
    setStatus(`Moving ${srcPaths.length} item(s) to ${folderName}...`);

    state.selectedFiles.clear();
    updateBatchActions();

    let ok = 0, fail = 0;
    const ops = srcPaths.map(src => {
        if (src === dstFolderPath) { fail++; return Promise.resolve(); }

        const url = `/move?src=${encodeURIComponent(src)}&dst=${encodeURIComponent(dstFolderPath)}`;
        return fetch(url)
            .then(r => { if (r.ok) { ok++; } else { fail++; } })
            .catch(() => { fail++; });
    });

    Promise.all(ops).then(() => {
        setStatus(`Move completed: ${ok} success${fail ? `, ${fail} failed` : ''}`);
        refreshFileList();
        updateSDInfo();
    });
}

function createFolder() {
    const folderNameInput = document.getElementById('folderName');
    const folderName = folderNameInput?.value.trim();

    if (!folderName) {
        alert("Please enter a folder name");
        return;
    }

    const sanitizedName = folderName.replace(/[\/\\:*?"<>|]/g, '_');
    setStatus('Creating folder...');

    fetch('/mkdir?name=' + encodeURIComponent(sanitizedName) +
        '&path=' + encodeURIComponent(state.currentPath))
        .then(response => response.text())
        .then(result => {
            alert(result);
            if (folderNameInput) folderNameInput.value = '';
            setStatus('Folder created!');
            refreshFileList();
            updateSDInfo();
        })
        .catch(error => {
            setStatus('Error creating folder');
            alert('Error: ' + error);
        });
}

function deleteFolder(folderName) {
    if (confirm('Are you sure you want to delete folder "' + folderName + '" and ALL its contents? This cannot be undone!')) {
        document.getElementById('status').textContent = 'Deleting folder...';

        fetch('/deleteFolder?name=' + encodeURIComponent(folderName) +
            '&path=' + encodeURIComponent(state.currentPath))
            .then(response => response.text())
            .then(result => {
                alert(result);
                document.getElementById('status').textContent = 'Folder deleted!';
                refreshFileList();
            })
            .catch(error => {
                document.getElementById('status').textContent = 'Error deleting folder';
                alert('Error: ' + error);
            });
    }
}

function deleteFile(filename) {
    if (confirm('Are you sure you want to delete "' + filename + '"?')) {
        fetch('/deleteFile?file=' + encodeURIComponent(filename) + '&path=' + encodeURIComponent(state.currentPath))
            .then(response => response.text())
            .then(result => {
                alert(result);
                refreshFileList();
                updateSDInfo();
            })
            .catch(error => {
                alert('Error deleting file: ' + error);
            });
    }
}

function uploadFile(e) {
    if (e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    const totalFiles = files.length;
    let uploadedCount = 0;

    document.getElementById('status').textContent =
        `Uploading ${totalFiles} files...`;
    document.getElementById('progress').style.width = '0%';

    function uploadNextFile() {
        if (uploadedCount >= totalFiles) {
            document.getElementById('status').textContent =
                'All files uploaded successfully!';
            document.getElementById('progress').style.width = '0%';
            document.getElementById('fileInput').value = '';
            setTimeout(() => {
                document.getElementById('status').textContent = 'Ready to upload...';
            }, 2000);
            refreshFileList();
            updateSDInfo();
            return;
        }

        const file = files[uploadedCount];
        const formData = new FormData();
        formData.append('file', file);

        const url = '/upload?path=' + encodeURIComponent(state.currentPath);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);

        console.log(`Uploading (${uploadedCount + 1}/${totalFiles}):`, file.name,
            "to path:", state.currentPath);

        xhr.upload.onprogress = function (e) {
            if (e.lengthComputable) {
                const fileProgress = (e.loaded / e.total) * 100;
                const overallProgress = (uploadedCount / totalFiles) * 100 +
                    (fileProgress / totalFiles);
                document.getElementById('progress').style.width = overallProgress + '%';

                document.getElementById('status').textContent =
                    `Uploading (${uploadedCount + 1}/${totalFiles}): ${file.name} ` +
                    `(${Math.round(fileProgress)}%)`;
            }
        };

        xhr.onload = function () {
            if (xhr.status === 200) {
                console.log(`Uploaded: ${file.name}`);
                uploadedCount++;

                setTimeout(uploadNextFile, 100);
            } else {
                document.getElementById('status').textContent =
                    `Failed to upload: ${file.name}`;
                console.error(`Upload failed for: ${file.name}`);
                uploadedCount++;
                setTimeout(uploadNextFile, 100);
            }
        };

        xhr.onerror = function () {
            console.error(`Upload error for: ${file.name}`);
            uploadedCount++;
            setTimeout(uploadNextFile, 100);
        };

        xhr.send(formData);
    }

    uploadNextFile();
}

window.refreshFileList = refreshFileList;
window.createFolder = createFolder;
window.deleteFile = deleteFile;
window.deleteFolder = deleteFolder;

export { refreshFileList, createFolder, deleteFile, deleteFolder, uploadFile };