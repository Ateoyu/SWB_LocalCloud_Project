let currentPath = "/";

function refreshFileList() {
    document.getElementById('status').textContent = 'Loading files...';
    fetch('/list?path=' + encodeURIComponent(currentPath))
        .then(response => response.text())
        .then(html => {
            document.getElementById('fileTable').innerHTML = html;
            document.getElementById('status').textContent = 'Files loaded!';

            updatePathDisplay();
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

document.addEventListener('DOMContentLoaded', function () {

    document.getElementById('createFolderBtn').addEventListener('click', function() {
        createFolder();
    });

    document.getElementById('fileInput').addEventListener('change', function (e) {
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
    });

    refreshFileList();
    updateSDInfo();
});