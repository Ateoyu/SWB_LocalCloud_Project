import { refreshFileList, createFolder, uploadFile } from './fileManager.js';
import { updateSDInfo } from './uiManager.js';
import { toggleSelectAll, selectAllFiles, deselectAllFiles, downloadSelected, deleteSelected } from './batchActions.js';
import { navigateToFolder, navigateToParent } from './navigationManager.js';

window.navigateToFolder = navigateToFolder;
window.navigateToParent = navigateToParent;

document.addEventListener('DOMContentLoaded', function () {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    function toggleMenu() {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
    }

    menuToggle.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', toggleMenu);

    const gridViewBtn = document.getElementById('gridViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    const fileTableEl = document.getElementById('fileTable');

    function applyView(mode, {save=true} = {}) {
        if (!fileTableEl) return;

        if (mode === 'list') {
            fileTableEl.classList.add('list-mode');
            listViewBtn?.classList.add('active');
            gridViewBtn?.classList.remove('active');
        } else {
            fileTableEl.classList.remove('list-mode');
            gridViewBtn?.classList.add('active');
            listViewBtn?.classList.remove('active');
            mode = 'grid';
        }
        if (save) {
            try { localStorage.setItem('viewMode', mode); } catch (_) {}
        }
    }

    gridViewBtn?.addEventListener('click', () => applyView('grid'));
    listViewBtn?.addEventListener('click', () => applyView('list'));

    try {
        const saved = localStorage.getItem('viewMode');
        if (saved === 'list' || saved === 'grid') {
            applyView(saved, {save:false});
        }
    } catch (_) {}

    const createFolderBtn = document.getElementById('createFolderBtn');
    const fileInput = document.getElementById('fileInput');
    const refreshBtn = document.getElementById('refreshBtn');
    const batchDownloadBtn = document.getElementById('batchDownloadBtn');
    const batchDeleteBtn = document.getElementById('batchDeleteBtn');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const deselectAllBtn = document.getElementById('deselectAllBtn');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const navToParentBtn = document.getElementById('navToParentBtn');

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

    if (navToParentBtn) {
        navToParentBtn.addEventListener('click', navigateToParent)
    }

    refreshFileList();
    updateSDInfo();
});