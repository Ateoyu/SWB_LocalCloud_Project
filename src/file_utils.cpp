#include "file_utils.h"

String sanitizePath(String path) {
    path.replace("\\", "/");
    while (path.indexOf("/../") >= 0 || path.indexOf("/./") >= 0) {
        path.replace("/../", "/");
        path.replace("/./", "/");
    }
    if (!path.startsWith("/")) {
        path = "/" + path;
    }
    while (path.indexOf("//") >= 0) {
        path.replace("//", "/");
    }
    return path;
}

String sanitizeFilename(String filename) {
    int lastSlash = filename.lastIndexOf('/');
    if (lastSlash != -1) {
        filename = filename.substring(lastSlash + 1);
    }
    filename.replace(" ", "_");
    filename.replace("..", "");
    return filename;
}

void createPath(String path) {
    String current = "";
    int start = 0;
    while (start < path.length()) {
        int end = path.indexOf('/', start + 1);
        if (end == -1) break;
        current = path.substring(0, end);
        if (!SD.exists(current)) {
            SD.mkdir(current);
        }
        start = end;
    }
}

bool deleteFolderRecursive(String path) {
    File dir = SD.open(path);
    if (!dir) return false;
    if (!dir.isDirectory()) {
        dir.close();
        return SD.remove(path);
    }
    dir.rewindDirectory();
    File file = dir.openNextFile();
    while (file) {
        String filePath = path + "/" + String(file.name());
        if (file.isDirectory()) {
            if (!deleteFolderRecursive(filePath)) {
                dir.close();
                return false;
            }
        } else {
            if (!SD.remove(filePath)) {
                dir.close();
                return false;
            }
        }
        file = dir.openNextFile();
    }
    dir.close();
    return SD.rmdir(path);
}