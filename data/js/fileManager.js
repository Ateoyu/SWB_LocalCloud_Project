import { state, setStatus, updateProgress, updateSDInfo, updatePathDisplay, updateBatchActions } from '/js/uiManager.js';
import { toggleFileSelection } from '/js/batchActions.js';
import { updateFileListWithThumbnails } from '/js/thumbnailManager.js';

function refreshFileList() {
    setStatus('Loading files...');
    state.selectedFiles.clear();
    updateBatchActions();

    fetch('/list?path=' + encodeURIComponent(state.currentPath))
        .then(response => response.text())
        .then(html => {
            const fileTable = document.getElementById('fileTable');
            if (fileTable) {
                fileTable.innerHTML = html;
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
                document.querySelectorAll('#fileTable input[type="checkbox"]').forEach(checkbox => {
                    checkbox.addEventListener('change', function() {
                        toggleFileSelection(this.dataset.path, this);
                    });
                });

                updateFileListWithThumbnails();
            }, 100);
        })
        .catch(error => {
            setStatus('Error loading files');
            console.error('Error:', error);
        });
}

function setupDynamicEventListeners() {
    // Handle folder navigation buttons
    document.querySelectorAll('#fileTable button[onclick*="navigateToFolder"]').forEach(button => {
        const onclick = button.getAttribute('onclick');
        const match = onclick.match(/navigateToFolder\('([^']+)'\)/);
        if (match) {
            button.removeAttribute('onclick');
            button.addEventListener('click', () => {
                navigateToFolder(match[1]);
            });
        }
    });

    // Handle parent navigation button
    document.querySelectorAll('#fileTable button[onclick="navigateToParent()"]').forEach(button => {
        button.removeAttribute('onclick');
        button.addEventListener('click', navigateToParent);
    });

    // Handle delete file/folder buttons if you have them
    document.querySelectorAll('#fileTable button[onclick*="deleteFile"]').forEach(button => {
        const onclick = button.getAttribute('onclick');
        const match = onclick.match(/deleteFile\('([^']+)'\)/);
        if (match) {
            button.removeAttribute('onclick');
            button.addEventListener('click', () => {
                deleteFile(match[1]);
            });
        }
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