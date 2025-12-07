const state = {
    _currentPath: "/",
    selectedFiles: new Set(),

    get currentPath() {
        return this._currentPath;
    },

    set currentPath(value) {
        this._currentPath = value;
        updatePathDisplay();
    }
};

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
    if (pathDisplay) {
        pathDisplay.textContent = 'Current Path: ' + (state.currentPath === "/" ? "/" : state.currentPath);
    }
}

function updateBatchActions() {
    const batchPanel = document.getElementById('batchActions');
    const selectedCount = document.getElementById('selectedCount');

    if (selectedCount) {
        selectedCount.textContent = state.selectedFiles.size + ' selected';
    }

    if (batchPanel) {
        if (state.selectedFiles.size > 0) {
            batchPanel.classList.add('visible');
        } else {
            batchPanel.classList.remove('visible');
        }
    }
}

function setStatus(message) {
    const element = document.getElementById('status');
    if (element) element.textContent = message;
}

function updateProgress(percent) {
    const element = document.getElementById('progress');
    if (element) element.style.width = percent + '%';
}

export {
    state,
    updateSDInfo,
    updatePathDisplay,
    updateBatchActions,
    setStatus,
    updateProgress
};