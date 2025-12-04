function refreshFileList() {
    document.getElementById('status').textContent = 'Loading files...';
    fetch('/list')
        .then(response => response.text())
        .then(html => {
            document.getElementById('fileTable').innerHTML = html;
            document.getElementById('status').textContent = 'Files loaded!';
        })
        .catch(error => {
            document.getElementById('status').textContent = 'Error loading files';
            console.error('Error:', error);
        });
}

function deleteFile(filename) {
    if (confirm('Are you sure you want to delete "' + filename + '"?')) {
        fetch('/delete?file=' + encodeURIComponent(filename))
            .then(response => response.text())
            .then(result => {
                alert(result);
                refreshFileList();
            })
            .catch(error => {
                alert('Error deleting file: ' + error);
            });
    }
}

document.getElementById('fileInput').addEventListener('change', function (e) {
    if (e.target.files.length === 0) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/upload');

    xhr.upload.onprogress = function (e) {
        if (e.lengthComputable) {
            const percent = (e.loaded / e.total) * 100;
            document.getElementById('progress').style.width = percent + '%';
            document.getElementById('status').textContent =
                '📤 Uploading: ' + file.name + ' (' + Math.round(percent) + '%)';
        }
    };

    xhr.onload = function () {
        if (xhr.status === 200) {
            document.getElementById('status').textContent = 'Upload complete!';
            document.getElementById('progress').style.width = '0%';
            document.getElementById('fileInput').value = '';
            setTimeout(() => {
                document.getElementById('status').textContent = 'Ready to upload...';
            }, 2000);
            refreshFileList();
        } else {
            document.getElementById('status').textContent = 'Upload failed!';
        }
    };

    xhr.onerror = function () {
        document.getElementById('status').textContent = 'Upload failed!';
    };

    document.getElementById('status').textContent = 'Starting upload...';
    xhr.send(formData);
});

// Initial load
refreshFileList();