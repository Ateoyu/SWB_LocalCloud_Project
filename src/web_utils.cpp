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
        html += "<td><button id='nav-to-parent-btw' onclick=\"navigateToParent()\"><svg id='back-btn-svg' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'><path d='M4 10L3.29289 10.7071L2.58579 10L3.29289 9.29289L4 10ZM21 18C21 18.5523 20.5523 19 20 19C19.4477 19 19 18.5523 19 18L21 18ZM8.29289 15.7071L3.29289 10.7071L4.70711 9.29289L9.70711 14.2929L8.29289 15.7071ZM3.29289 9.29289L8.29289 4.29289L9.70711 5.70711L4.70711 10.7071L3.29289 9.29289ZM4 9L14 9L14 11L4 11L4 9ZM21 16L21 18L19 18L19 16L21 16ZM14 9C17.866 9 21 12.134 21 16L19 16C19 13.2386 16.7614 11 14 11L14 9'  fill='#33363F'/></svg>";
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