import { state } from './uiManager.js';
import { refreshFileList } from './fileManager.js';

function navigateToFolder(folderPath) {
    folderPath = folderPath.replace(/\/+/g, '/');
    state.currentPath = folderPath;
    refreshFileList();
}

function navigateToParent() {
    if (state.currentPath === "/") return;

    let pathParts = state.currentPath.split('/').filter(part => part.length > 0);
    pathParts.pop();

    if (pathParts.length === 0) {
        state.currentPath = "/";
    } else {
        state.currentPath = "/" + pathParts.join("/");
    }

    refreshFileList();
}

export { navigateToFolder, navigateToParent };