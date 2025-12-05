import { state, updateBatchActions, setStatus, updateSDInfo } from '/js/uiManager.js';
import { refreshFileList } from '/js/fileManager.js';

function toggleFileSelection(filePath, checkbox) {
    if (checkbox.checked) {
        state.selectedFiles.add(filePath);
    } else {
        state.selectedFiles.delete(filePath);
    }

    const totalCheckboxes = document.querySelectorAll('#fileTable input[type="checkbox"]:not(:disabled)').length;
    const checkedCount = document.querySelectorAll('#fileTable input[type="checkbox"]:checked:not(:disabled)').length;
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');

    if (selectAllCheckbox) {
        selectAllCheckbox.checked = checkedCount === totalCheckboxes;
        selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < totalCheckboxes;
    }

    updateBatchActions();
}

function toggleSelectAll(checked) {
    const checkboxes = document.querySelectorAll('#fileTable input[type="checkbox"]:not(:disabled)');
    checkboxes.forEach(checkbox => {
        checkbox.checked = checked;
        const filePath = checkbox.dataset.path;
        if (checked) {
            state.selectedFiles.add(filePath);
        } else {
            state.selectedFiles.delete(filePath);
        }
    });
    updateBatchActions();
}

function selectAllFiles() {
    const checkboxes = document.querySelectorAll('#fileTable input[type="checkbox"]:not(:disabled)');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        state.selectedFiles.add(checkbox.dataset.path);
    });
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = true;
    }
    updateBatchActions();
}

function deselectAllFiles() {
    const checkboxes = document.querySelectorAll('#fileTable input[type="checkbox"]:not(:disabled)');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        state.selectedFiles.delete(checkbox.dataset.path);
    });
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    }
    updateBatchActions();
}

function downloadSelected() {
    if (state.selectedFiles.size === 0) {
        alert('Please select files to download');
        return;
    }

    setStatus('Preparing download...');
    state.selectedFiles.forEach(filePath => {
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

    setStatus(`Downloading ${state.selectedFiles.size} files...`);
    setTimeout(() => {
        setStatus('Download started. Check your downloads folder.');
    }, 1000);
}

function deleteSelected() {
    if (state.selectedFiles.size === 0) {
        alert('Please select files to delete');
        return;
    }

    if (!confirm(`Are you sure you want to delete ${state.selectedFiles.size} selected item(s)?`)) {
        return;
    }

    setStatus(`Deleting ${state.selectedFiles.size} items...`);
    let deletedCount = 0;
    let errorCount = 0;

    state.selectedFiles.forEach(filePath => {
        const filename = filePath.split('/').pop();
        const parentPath = filePath.substring(0, filePath.lastIndexOf('/'));
        const checkbox = document.querySelector(`input[data-path="${CSS.escape(filePath)}"]`);
        const row = checkbox?.closest('tr');
        const isFolder = row?.textContent.includes('📁');

        const url = isFolder
            ? `/deleteFolder?name=${encodeURIComponent(filename)}&path=${encodeURIComponent(parentPath)}`
            : `/deleteFile?file=${encodeURIComponent(filename)}&path=${encodeURIComponent(parentPath)}`;

        fetch(url)
            .then(response => response.text())
            .then(result => {
                deletedCount++;
                console.log(`Deleted: ${filePath}`);
                if (deletedCount + errorCount === state.selectedFiles.size) {
                    setStatus(`Deleted ${deletedCount} item(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
                    deselectAllFiles();
                    refreshFileList();
                    updateSDInfo();
                }
            })
            .catch(error => {
                errorCount++;
                console.error(`Failed to delete: ${filePath}`, error);
                if (deletedCount + errorCount === state.selectedFiles.size) {
                    setStatus(`Deleted ${deletedCount} item(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
                    deselectAllFiles();
                    refreshFileList();
                    updateSDInfo();
                }
            });
    });
}

export {
    toggleFileSelection,
    toggleSelectAll,
    selectAllFiles,
    deselectAllFiles,
    downloadSelected,
    deleteSelected
};