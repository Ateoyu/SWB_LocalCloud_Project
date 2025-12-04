let currentPath = "/";
let selectedFiles = new Set();


async function createImageThumbnail(imageUrl, width = 32, height = 32) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            ctx.drawImage(img, 0, 0, width, height);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            resolve(dataUrl);
        };

        img.onerror = function() {
            resolve(null);
        };

        img.src = imageUrl;
    });
}

const thumbnailCache = new Map();

async function getThumbnail(imagePath, imageUrl) {
    if (thumbnailCache.has(imagePath)) {
        return thumbnailCache.get(imagePath);
    }

    try {
        const thumbnail = await createImageThumbnail(imageUrl);

        if (thumbnail) {
            thumbnailCache.set(imagePath, thumbnail);
            return thumbnail;
        }
    } catch (error) {
        console.log('Failed to create thumbnail:', error);
    }

    return null;
}

function updateFileListWithThumbnails() {
    const rows = document.querySelectorAll('#fileTable tr');

    rows.forEach(async (row) => {
        const img = row.querySelector('img');
        if (!img) return;

        const imagePath = img.getAttribute('data-path') ||
            row.querySelector('input[type="checkbox"]').dataset.path;
        const originalSrc = img.src;

        img.classList.add('loading');

        try {
            const thumbnail = await getThumbnail(imagePath, originalSrc);

            if (thumbnail) {
                img.src = thumbnail;
                img.style.width = '32px';
                img.style.height = '32px';
                img.style.objectFit = 'cover';
            }
        } catch (error) {
            console.log('Thumbnail error:', error);
        } finally {
            img.classList.remove('loading');
        }
    });
}

function refreshFileList() {
    document.getElementById('status').textContent = 'Loading files...';
    selectedFiles.clear();
    updateBatchActions();

    fetch('/list?path=' + encodeURIComponent(currentPath))
        .then(response => response.text())
        .then(html => {
            document.getElementById('fileTable').innerHTML = html;
            document.getElementById('status').textContent = 'Files loaded!';
            updatePathDisplay();
            updateBatchActions();

            document.getElementById('selectAll').checked = false;
            document.getElementById('selectAll').indeterminate = false;

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
            document.getElementById('status').textContent = 'Error loading files';
            console.error('Error:', error);
        });
}

function updateSDInfo() {
    fetch('/sdinfo')
        .then(response => response.text())
        .then(info => {
            document.getElementById('sdCardInfo').textContent = info;
        })
        .catch(error => {
            document.getElementById('sdCardInfo').textContent = 'Error loading info';
        });
}

function updatePathDisplay() {
    let pathDisplay = document.getElementById('currentPath');
    pathDisplay.textContent = 'Current Path: ' + (currentPath === "/" ? "/" : currentPath);
}

function updateBatchActions() {
    const batchPanel = document.getElementById('batchActions');
    const selectedCount = document.getElementById('selectedCount');

    selectedCount.textContent = selectedFiles.size + ' selected';

    if (selectedFiles.size > 0) {
        batchPanel.classList.add('visible');
    } else {
        batchPanel.classList.remove('visible');
    }
}

function toggleFileSelection(filePath, checkbox) {
    if (checkbox.checked) {
        selectedFiles.add(filePath);
    } else {
        selectedFiles.delete(filePath);
    }

    const totalCheckboxes = document.querySelectorAll('#fileTable input[type="checkbox"]:not(:disabled)').length;
    const checkedCount = document.querySelectorAll('#fileTable input[type="checkbox"]:checked:not(:disabled)').length;
    const selectAllCheckbox = document.getElementById('selectAll');

    selectAllCheckbox.checked = checkedCount === totalCheckboxes;
    selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < totalCheckboxes;

    updateBatchActions();
}

function toggleSelectAll(checked) {
    const checkboxes = document.querySelectorAll('#fileTable input[type="checkbox"]:not(:disabled)');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            const filePath = checkbox.dataset.path;
            if (checked) {
                selectedFiles.add(filePath);
            } else {
                selectedFiles.delete(filePath);
            }
        });

        updateBatchActions();
}

function selectAllFiles() {
    const checkboxes = document.querySelectorAll('#fileTable input[type="checkbox"]:not(:disabled)');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        selectedFiles.add(checkbox.dataset.path);
    });
    document.getElementById('selectAll').checked = true;
    updateBatchActions();
}

function deselectAllFiles() {
    const checkboxes = document.querySelectorAll('#fileTable input[type="checkbox"]:not(:disabled)');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        selectedFiles.delete(checkbox.dataset.path);
    });
    document.getElementById('selectAll').checked = false;
    document.getElementById('selectAll').indeterminate = false;
    updateBatchActions();
}

function createFolder() {
    const folderNameInput = document.getElementById('folderName');
    const folderName = folderNameInput.value.trim();

    if (!folderName) {
        alert("Please enter a folder name");
        return;
    }

    const sanitizedName = folderName.replace(/[\/\\:*?"<>|]/g, '_');

    document.getElementById('status').textContent = 'Creating folder...';

    fetch('/mkdir?name=' + encodeURIComponent(sanitizedName) +
        '&path=' + encodeURIComponent(currentPath))
        .then(response => response.text())
        .then(result => {
            alert(result);
            folderNameInput.value = ''; // Clear input
            document.getElementById('status').textContent = 'Folder created!';
            refreshFileList();
            updateSDInfo();
        })
        .catch(error => {
            document.getElementById('status').textContent = 'Error creating folder';
            alert('Error: ' + error);
        });

    console.log("Creating folder:", sanitizedName, "in path:", currentPath);
    console.log("Request URL:", '/mkdir?name=' + encodeURIComponent(sanitizedName) +
        '&path=' + encodeURIComponent(currentPath));
}

function downloadSelected() {
    if (selectedFiles.size === 0) {
        alert('Please select files to download');
        return;
    }

    document.getElementById('status').textContent = 'Preparing download...';

    selectedFiles.forEach(filePath => {
        const filename = filePath.split('/').pop();
        const parentPath = filePath.substring(0, filePath.lastIndexOf('/'));

        const link = document.createElement('a');
        link.href = `/download?file=${encodeURIComponent(filename)}&path=${encodeURIComponent(parentPath)}`;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    document.getElementById('status').textContent = `Downloading ${selectedFiles.size} files...`;
    setTimeout(() => {
        document.getElementById('status').textContent = 'Download started. Check your downloads folder.';
    }, 1000);
}

function deleteSelected() {
    if (selectedFiles.size === 0) {
        alert('Please select files to delete');
        return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedFiles.size} selected item(s)?`)) {
        return;
    }

    document.getElementById('status').textContent = `Deleting ${selectedFiles.size} items...`;

    let deletedCount = 0;
    let errorCount = 0;

    selectedFiles.forEach(filePath => {
        const filename = filePath.split('/').pop();
        const parentPath = filePath.substring(0, filePath.lastIndexOf('/'));

        const isFolder = document.querySelector(`input[data-path="${filePath}"]`)?.closest('tr')?.textContent.includes('📁');

        const url = isFolder
            ? `/deleteFolder?name=${encodeURIComponent(filename)}&path=${encodeURIComponent(parentPath)}`
            : `/deleteFile?file=${encodeURIComponent(filename)}&path=${encodeURIComponent(parentPath)}`;

        fetch(url)
            .then(response => response.text())
            .then(result => {
                deletedCount++;
                console.log(`Deleted: ${filePath}`);

                if (deletedCount + errorCount === selectedFiles.size) {
                    document.getElementById('status').textContent =
                        `Deleted ${deletedCount} item(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`;
                    deselectAllFiles();
                    refreshFileList();
                    updateSDInfo();
                }
            })
            .catch(error => {
                errorCount++;
                console.error(`Failed to delete: ${filePath}`, error);

                if (deletedCount + errorCount === selectedFiles.size) {
                    document.getElementById('status').textContent =
                        `Deleted ${deletedCount} item(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`;
                    deselectAllFiles();
                    refreshFileList();
                    updateSDInfo();
                }
            });
    });
}

function deleteFolder(folderName) {
    if (confirm('Are you sure you want to delete folder "' + folderName + '" and ALL its contents? This cannot be undone!')) {
        document.getElementById('status').textContent = 'Deleting folder...';

        fetch('/deleteFolder?name=' + encodeURIComponent(folderName) +
            '&path=' + encodeURIComponent(currentPath))
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

function navigateToFolder(folderPath) {
    folderPath = folderPath.replace(/\/+/g, '/');
    currentPath = folderPath;
    refreshFileList();
}

function navigateToParent() {
    if (currentPath === "/") return;

    let pathParts = currentPath.split('/').filter(part => part.length > 0);
    pathParts.pop();

    if (pathParts.length === 0) {
        currentPath = "/";
    } else {
        currentPath = "/" + pathParts.join("/");
    }

    refreshFileList();
}

function deleteFile(filename) {
    if (confirm('Are you sure you want to delete "' + filename + '"?')) {
        fetch('/deleteFile?file=' + encodeURIComponent(filename) + '&path=' + encodeURIComponent(currentPath))
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

function fileUpload(e) {
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

        const url = '/upload?path=' + encodeURIComponent(currentPath);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);

        console.log(`Uploading (${uploadedCount + 1}/${totalFiles}):`, file.name,
            "to path:", currentPath);

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

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('createFolderBtn').addEventListener('click', createFolder);
    document.getElementById('fileInput').addEventListener('change', fileUpload);

    refreshFileList();
    updateSDInfo();
});