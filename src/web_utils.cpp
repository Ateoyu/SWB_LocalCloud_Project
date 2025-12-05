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
        return "<tr><td colspan='2'>Failed to open directory: " + currentPath + "</td></tr>";
    }
    if (currentPath != "/") {
        html += "<tr>";
        html += "<td><input type='checkbox' disabled></td>";
        html += "<td><button class='file-link-btn' onclick=\"navigateToParent()\">";
        html += "<img src='/icons/back.png' class='file-icon' alt='Back'>";
        html += "<span>..</span>";
        html += "</button></td>";
        html += "</tr>";
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

        String iconHtml = "";
        String ext = "";
        bool isDir = file.isDirectory();

        if (!isDir) {
            int dotIndex = filename.lastIndexOf('.');
            if (dotIndex != -1) {
                ext = filename.substring(dotIndex);
                ext.toLowerCase();
            }
        }

        //TODO: fix icons not showing up

        bool isImage = (ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".gif" || ext == ".webp");

        if (isDir) {
            iconHtml = "<img src=\"/icons/folder.png\" class=\"file-icon-img\" alt=\"Folder\">";
        } else if (isImage) {
            iconHtml = "<img src=\"" + cleanPath + "\" class=\"preview-img\" alt=\"" + filename + "\">";
        } else {
            iconHtml = "<img src=\"/icons/file.png\" class=\"file-icon-img\" alt=\"File\">";
        }

        html += "<tr>";
        html += "<td><input type='checkbox' data-path=\"" + cleanPath + "\"></td>";

        if (file.isDirectory()) {
            html += "<td><button class='file-link-btn' onclick=\"navigateToFolder('" + currentPath + "/" + filename + "')\">";
            html += iconHtml;
            html += "<span>" + filename + "</span>";
            html += "</button></td>";
        } else {
            html += "<td><div class='file-link-btn' onclick=\"showFullImage('" + cleanPath + "')\">";
            html += iconHtml;
            html += "<span>" + filename + "</span>";
            html += "</div></td>";
        }
        html += "</tr>";

        file = dir.openNextFile();
    }
    dir.close();
    return html;
}