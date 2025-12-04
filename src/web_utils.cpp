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
        html += "<td><button onclick=\"navigateToParent()\">📁 ..</button></td>";
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
        if (file.isDirectory()) {
            html += "<tr>";
            html += "<td><button onclick=\"navigateToFolder('" + currentPath + "/" + filename + "')\">📁 " + filename + "</button></td>";
            html += "</tr>";
        } else {
            bool isImage = (fileExt == ".jpg" || fileExt == ".jpeg" ||
                            fileExt == ".png" || fileExt == ".gif" ||
                            fileExt == ".bmp" || fileExt == ".webp");
            if (isImage) {
                html += "<tr>";
                html += "<td><input type='checkbox' data-path=\"" + cleanPath + "\"></td>";
                html += "<td style='display: flex; align-items: center; gap: 10px;'>";
                html += "<img src='/preview?path=" + cleanPath + "' ";
                html += "onerror=\"this.style.display='none'\" ";
                html += "alt='' ";
                html += "onclick=\"showFullImage('" + cleanPath + "')\">";
                html += "<span>" + filename + "</span>";
                html += "</td>";
                html += "</tr>";
            } else {
                html += "<tr>";
                html += "<td><input type='checkbox' data-path=\"" + cleanPath + "\"></td>";
                html += "<td>📄 " + filename + "</td>";
                html += "</tr>";
            }
        }
        file = dir.openNextFile();
    }
    dir.close();
    return html;
}