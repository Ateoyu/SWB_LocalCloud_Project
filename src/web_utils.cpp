#include "web_utils.h"
#include "SD.h"
#include "file_utils.h"
#include <map>

String getSDCardInfo() {
    float totalGiB = SD.cardSize() / (1024.0 * 1024.0 * 1024.0);
    float usedGiB = SD.usedBytes() / (1024.0 * 1024.0 * 1024.0);
    float freeGiB = totalGiB - usedGiB;
    char buffer[50];
    snprintf(buffer, sizeof(buffer), "Free: %.2f GB", freeGiB);
    return String(buffer);
}

String getContentType(String filename) {
    filename.toLowerCase();

    static std::map<String, String> mimeTypes = {
        {".jpg", "image/jpeg"},
        {".jpeg", "image/jpeg"},
        {".png", "image/png"},
        {".gif", "image/gif"},
        {".bmp", "image/bmp"},
        {".webp", "image/webp"},
        {".txt", "text/plain"},
        {".html", "text/html"},
        {".htm", "text/html"},
        {".css", "text/css"},
        {".js", "application/javascript"},
        {".json", "application/json"},
        {".pdf", "application/pdf"},
        {".zip", "application/zip"},
        {".mp3", "audio/mpeg"},
        {".wav", "audio/wav"},
        {".mp4", "video/mp4"},
        {".avi", "video/x-msvideo"},
        {".mkv", "video/x-matroska"},
        {".mov", "video/quicktime"}
    };

    for (const auto& pair : mimeTypes) {
        if (filename.endsWith(pair.first)) {
            return pair.second;
        }
    }

    return "application/octet-stream";
}

String getFileListHTML(String currentPath) {
    String html = "";
    File dir = SD.open(currentPath);
    if (!dir) {
        return String("<div class='file-item error'><div class='file-card'>Failed to open directory: ") + currentPath + "</div></div>";
    }

    // Add back navigation tile if not at root
    if (currentPath != "/") {
        html += "<div class='file-item' data-type='back'>";
        html += "<input type='checkbox' class='select-checkbox' disabled>";
        html += "<button class='file-card' onclick='navigateToParent()'>";
        html += "<img src='/icons/back.png' class='file-icon-img' alt='Back'>";
        html += "<span class='file-name'>..</span>";
        html += "</button>";
        html += "</div>";
    }

    File file = dir.openNextFile();
    while (file) {
        String filename = String(file.name());
        if (filename.startsWith(".")) {
            file = dir.openNextFile();
            continue;
        }

        String fullPath = currentPath;
        if (fullPath != "/" && !fullPath.endsWith("/")) {
            fullPath += "/";
        }
        fullPath += filename;

        String cleanPath = fullPath;
        cleanPath.replace("\"", "&quot;");

        String fileExt = "";
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex != -1) {
            fileExt = filename.substring(dotIndex);
            fileExt.toLowerCase();
        }

        if (file.isDirectory()) {
            html += "<div class='file-item' data-type='folder'>";
            html += "<input type='checkbox' class='select-checkbox' data-path=\"" + cleanPath + "\">";
            html += "<button class='file-card' onclick=\"navigateToFolder('" + currentPath + "/" + filename + "')\">";
            html += "<img src='/icons/folder.png' class='file-icon-img' alt='Folder'>";
            html += "<span class='file-name'>" + filename + "</span>";
            html += "</button>";
            html += "</div>";
        } else {
            bool isImage = (fileExt == ".jpg" || fileExt == ".jpeg" ||
                            fileExt == ".png" || fileExt == ".gif" ||
                            fileExt == ".bmp" || fileExt == ".webp");
            if (isImage) {
                html += "<div class='file-item' data-type='image'>";
                html += "<input type='checkbox' class='select-checkbox' data-path=\"" + cleanPath + "\">";
                html += "<div class='file-card'>";
                html += "<img src='/preview?path=" + cleanPath + "' class='preview-img' alt='' onerror=\"this.style.display='none'\" data-path=\"" + cleanPath + "\">";
                html += "<span class='file-name'>" + filename + "</span>";
                html += "</div>";
                html += "</div>";
            } else {
                html += "<div class='file-item' data-type='file'>";
                html += "<input type='checkbox' class='select-checkbox' data-path=\"" + cleanPath + "\">";
                html += "<div class='file-card'>";
                html += "<img src='/icons/file.png' class='file-icon-img' alt='File'>";
                html += "<span class='file-name'>" + filename + "</span>";
                html += "</div>";
                html += "</div>";
            }
        }
        file = dir.openNextFile();
    }
    dir.close();
    return html;
}