import { refreshFileList, createFolder, uploadFile } from '/js/fileManager.js';
import { updateSDInfo } from '/js/uiManager.js';
import { toggleSelectAll, selectAllFiles, deselectAllFiles, downloadSelected, deleteSelected } from '/js/batchActions.js';
import { navigateToFolder, navigateToParent } from '/js/navigationManager.js';

window.navigateToFolder = navigateToFolder;
window.navigateToParent = navigateToParent;

document.addEventListener('DOMContentLoaded', function () {
    const createFolderBtn = document.getElementById('createFolderBtn');
    const fileInput = document.getElementById('fileInput');
    const refreshBtn = document.getElementById('refreshBtn');
    const batchDownloadBtn = document.getElementById('batchDownloadBtn');
    const batchDeleteBtn = document.getElementById('batchDeleteBtn');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const deselectAllBtn = document.getElementById('deselectAllBtn');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');

    if (createFolderBtn) {
        createFolderBtn.addEventListener('click', createFolder);
    }

    if (fileInput) {
        fileInput.addEventListener('change', uploadFile);
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshFileList);
    }

    if (batchDownloadBtn) {
        batchDownloadBtn.addEventListener('click', downloadSelected);
    }

    if (batchDeleteBtn) {
        batchDeleteBtn.addEventListener('click', deleteSelected);
    }

    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', selectAllFiles);
    }

    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', deselectAllFiles);
    }

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            toggleSelectAll(this.checked);
        });
    }

    refreshFileList();
    updateSDInfo();
});