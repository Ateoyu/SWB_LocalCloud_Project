#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <WiFi.h>
#include <LittleFS.h>

#include "web_server.h"
#include "config.h"
#include "file_utils.h"
#include "web_utils.h"

AsyncWebServer server(SERVER_PORT);

void initAP() {
    WiFi.mode(WIFI_AP);
    bool apStarted = WiFi.softAP(ssid, password, 1, 0, 4);
    if (!apStarted) {
        Serial.println("Failed to start AP!");
        return;
    }
    delay(100);
    Serial.println("Access Point started");
    Serial.print("SSID: ");
    Serial.println(ssid);
    Serial.print("Password: ");
    Serial.println(password);
    Serial.print("IP address: ");
    Serial.println(WiFi.softAPIP());
}

void setupWebServer() {
    // ------------------------------------------------------
    // 1. STATIC ASSETS (LittleFS)
    // ------------------------------------------------------

    // Map URL "/icons/" to LittleFS folder "/icons/"
    server.serveStatic("/icons/", LittleFS, "/icons/");

    // Map URL "/js/" to LittleFS folder "/js/"
    server.serveStatic("/js/", LittleFS, "/js/");

    // Map URL "/styles/" to LittleFS folder "/styles/"
    server.serveStatic("/styles/", LittleFS, "/styles/");

    // Map Root "/" to LittleFS Root "/"
    // .setDefaultFile("index.html") means if they request http://ip/,
    // it serves /index.html automatically.
    server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");

    // ------------------------------------------------------
    // 2. API ENDPOINTS (SD Card & Logic)
    // ------------------------------------------------------
    // These remain as dynamic handlers because they execute logic
    // (creating files, deleting, listing) rather than just serving static content.

    server.on("/list", HTTP_GET, handleListFiles);
    server.on("/sdinfo", HTTP_GET, handleSDInfo);
    server.on("/download", HTTP_GET, handleDownload);
    server.on("/move", HTTP_GET, handleMove);
    server.on("/deleteFile", HTTP_GET, handleDeleteFile);
    server.on("/mkdir", HTTP_GET, handleCreateFolder);
    server.on("/deleteFolder", HTTP_GET, handleDeleteFolder);
    server.on("/preview", HTTP_GET, handleImagePreview);

    server.on("/upload", HTTP_POST,
              [](AsyncWebServerRequest *request) { request->send(200); },
              handleUpload);

    server.begin();
    Serial.println("Web server started");
}


void handleDeleteFile(AsyncWebServerRequest *request) {
    if (!request->hasParam("file")) {
        request->send(400, "text/plain", "Missing file parameter");
        return;
    }

    String currentPath = "/";
    if (request->hasParam("path")) {
        currentPath = request->getParam("path")->value();
    }

    if (!currentPath.endsWith("/") && currentPath != "/") {
        currentPath += "/";
    }

    String filename = request->getParam("file")->value();
    String filepath = currentPath + filename;

    sanitizePath(filepath);

    Serial.printf("Delete requested: %s\n", filepath.c_str());

    if (!SD.exists(filepath)) {
        request->send(404, "text/plain", "File not found");
        return;
    }

    if (SD.remove(filepath)) {
        request->send(200, "text/plain", "File deleted: " + filename);
        Serial.printf("File deleted: %s\n", filename.c_str());
    } else {
        request->send(500, "text/plain", "Failed to delete file");
    }
}

void handleDeleteFolder(AsyncWebServerRequest *request) {
    if (!request->hasParam("name")) {
        request->send(400, "text/plain", "Missing folder name");
        return;
    }

    String folderName = request->getParam("name")->value();
    String currentPath = "/";

    if (request->hasParam("path")) {
        currentPath = request->getParam("path")->value();
    }

    if (currentPath != "/" && !currentPath.endsWith("/")) {
        currentPath += "/";
    }

    String fullPath = currentPath + folderName;
    fullPath = sanitizePath(fullPath);

    if (fullPath == "/" || fullPath.length() <= 1) {
        request->send(400, "text/plain", "Cannot delete root directory");
        return;
    }

    Serial.printf("Delete folder requested: %s\n", fullPath.c_str());

    if (!SD.exists(fullPath)) {
        request->send(404, "text/plain", "Folder not found");
        return;
    }

    File dir = SD.open(fullPath);
    if (!dir.isDirectory()) {
        dir.close();
        request->send(400, "text/plain", "Not a directory");
        return;
    }
    dir.close();

    if (deleteFolderRecursive(fullPath)) {
        request->send(200, "text/plain", "Folder deleted: " + folderName);
        Serial.printf("Folder deleted: %s\n", fullPath.c_str());
    } else {
        request->send(500, "text/plain", "Failed to delete folder");
    }
}

void handleCreateFolder(AsyncWebServerRequest *request) {
    if (!request->hasParam("name")) {
        request->send(400, "text/plain", "Missing folder name");
        return;
    }

    String folderName = request->getParam("name")->value();
    String currentPath = "/";

    if (request->hasParam("path")) {
        currentPath = request->getParam("path")->value();
    }

    folderName.replace("/", "_");
    folderName.replace("\\", "_");
    folderName.replace("..", "");

    if (currentPath != "/" && !currentPath.endsWith("/")) {
        currentPath += "/";
    }

    String fullPath = currentPath + folderName;

    if (SD.mkdir(fullPath)) {
        request->send(200, "text/plain", "Folder created: " + folderName);
        Serial.printf("Folder created: %s\n", fullPath.c_str());
    } else {
        request->send(500, "text/plain", "Failed to create folder");
    }
}

void handleListFiles(AsyncWebServerRequest *request) {
    String path = "/";
    if (request->hasParam("path")) {
        path = request->getParam("path")->value();
    }
    request->send(200, "text/html", getFileListHTML(path));
}

void handleUpload(AsyncWebServerRequest *request,
                  const String &filename,
                  size_t index,
                  uint8_t *data,
                  size_t len,
                  bool final) {
    static File uploadFile;
    static String currentPath;
    static String currentFilename;

    if (!index) {
        currentPath = "/";
        currentFilename = filename;

        if (request->hasParam("path")) {
            currentPath = request->getParam("path")->value();
            Serial.printf("Got path from URL: %s\n", currentPath.c_str());
        } else {
            Serial.println("No path parameter found in URL!");
        }

        currentPath = sanitizePath(currentPath);

        if (!currentPath.endsWith("/") && currentPath != "/") {
            currentPath += "/";
        }

        createPath(currentPath);

        currentFilename = sanitizeFilename(filename);

        String filepath = currentPath + currentFilename;
        Serial.printf("Upload start to: %s, full path: %s\n", currentPath.c_str(), filepath.c_str());

        uploadFile = SD.open(filepath, FILE_WRITE);
        if (!uploadFile) {
            Serial.println("Failed to open file for writing");
        }
    }

    if (uploadFile && len > 0) {
        uploadFile.write(data, len);
    }

    if (final && uploadFile) {
        uploadFile.close();
        size_t totalSize = index + len;
        Serial.printf("Upload complete: %s, Size: %d bytes\n", currentFilename.c_str(), totalSize);
    }
}

void handleDownload(AsyncWebServerRequest *request) {
    if (!request->hasParam("file")) {
        request->send(400, "text/plain", "Missing file parameter");
        return;
    }

    String currentPath = "/";

    if (request->hasParam("path")) {
        currentPath = request->getParam("path")->value();
    }

    if (!currentPath.endsWith("/") && currentPath != "/") {
        currentPath += "/";
    }

    String filename = request->getParam("file")->value();
    String filepath = sanitizePath(currentPath + filename);

    Serial.printf("Download requested: %s\n", filepath.c_str());

    if (!SD.exists(filepath)) {
        Serial.printf("File not found: %s\n", filepath.c_str());
        request->send(404, "text/plain", "File not found");
        return;
    }

    String contentType = getContentType(filename);

    File file = SD.open(filepath, FILE_READ);

    if (!file) {
        Serial.printf("Failed to open file: %s\n", filepath.c_str());
        request->send(500, "text/plain", "Failed to open file");
        return;
    }

    file.close();

    Serial.printf("Sending file: %s, bytes, Type: %s\n",
                  filename.c_str(), contentType.c_str());

    AsyncWebServerResponse *response = request->beginResponse(SD, filepath, contentType);

    response->addHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");

    response->addHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    response->addHeader("Pragma", "no-cache");
    response->addHeader("Expires", "0");

    request->send(response);
}


void handleSDInfo(AsyncWebServerRequest *request) {
    String info = getSDCardInfo();
    request->send(200, "text/plain", info);
}

void handleImagePreview(AsyncWebServerRequest *request) {
    if (!request->hasParam("path")) {
        request->send(400, "text/plain", "Missing path parameter");
        return;
    }

    String filepath = request->getParam("path")->value();
    filepath = sanitizePath(filepath);

    if (!SD.exists(filepath)) {
        request->send(404, "text/plain", "Image not found");
        return;
    }

    String filename = filepath;
    int lastSlash = filename.lastIndexOf('/');
    if (lastSlash != -1) {
        filename = filename.substring(lastSlash + 1);
    }

    String contentType = getContentType(filename);

    AsyncWebServerResponse *response = request->beginResponse(SD, filepath, contentType);

    response->addHeader("Cache-Control", "public, max-age=86400");
    request->send(response);
}

void handleMove(AsyncWebServerRequest *request) {
    if (!request->hasParam("src") || !request->hasParam("dst")) {
        request->send(400, "text/plain", "Missing src or dst parameter");
        return;
    }

    String src = request->getParam("src")->value();
    String dstFolder = request->getParam("dst")->value();

    src = sanitizePath(src);
    dstFolder = sanitizePath(dstFolder);

    if (!SD.exists(src)) {
        request->send(404, "text/plain", "Source not found");
        return;
    }

    if (!SD.exists(dstFolder)) {
        request->send(404, "text/plain", "Destination folder not found");
        return;
    }

    File dst = SD.open(dstFolder);
    if (!dst || !dst.isDirectory()) {
        if (dst) dst.close();
        request->send(400, "text/plain", "Destination is not a folder");
        return;
    }
    dst.close();

    // Base name for destination
    String base = src;
    int lastSlash = base.lastIndexOf('/');
    if (lastSlash != -1) base = base.substring(lastSlash + 1);

    // Prevent moving a directory into its own subdirectory
    File s = SD.open(src);
    bool isDir = s && s.isDirectory();
    if (s) s.close();

    if (isDir) {
        String srcPrefix = src;
        if (!srcPrefix.endsWith("/")) srcPrefix += "/";
        String dstCheck = dstFolder;
        if (!dstCheck.endsWith("/")) dstCheck += "/";
        if (dstCheck.startsWith(srcPrefix)) {
            request->send(400, "text/plain", "Cannot move a folder into its own subfolder");
            return;
        }
    }

    String newPath = dstFolder;
    if (!newPath.endsWith("/")) newPath += "/";
    newPath += base;
    newPath = sanitizePath(newPath);

    if (newPath == src) {
        request->send(200, "text/plain", "No move needed");
        return;
    }

    if (SD.exists(newPath)) {
        request->send(409, "text/plain", "Destination already exists");
        return;
    }

    bool ok = SD.rename(src, newPath);
    if (ok) {
        request->send(200, "text/plain", "Moved");
    } else {
        request->send(500, "text/plain", "Move failed");
    }
}
