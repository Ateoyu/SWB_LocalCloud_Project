#include <Arduino.h>
#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <LittleFS.h>
#include "FS.h"
#include "SD.h"
#include "SPI.h"

#define SD_SCK 12
#define SD_MISO 13
#define SD_MOSI 11
#define SD_CS 10

const char *ssid = "ESP32-S3-Cloud";
const char *password = "12345678";

AsyncWebServer server(80);

IPAddress local_IP(192, 168, 100, 1);
IPAddress gateway(192, 168, 100, 1);
IPAddress subnet(255, 255, 255, 0);

SPIClass spi = SPIClass(HSPI);

// ------------------------------------------------------------------------------------------------------------------

void initSDCard() {
    spi.begin(SD_SCK, SD_MISO, SD_MOSI, SD_CS);

    if (!SD.begin(SD_CS, spi, 80000000)) {
        Serial.println("SD Card Mount Failed");
        return;
    }

    uint8_t cardType = SD.cardType();
    if (cardType == CARD_NONE) {
        Serial.println("No SD card attached");
        return;
    }
}

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

// ------------------------------------------------------------------------------------------------------------------

String getSDCardInfo() {
    float cardSizeGB = SD.cardSize() / (1024.0 * 1024.0 * 1024.0); // GB
    float usedBytesGB = SD.usedBytes() / (1024.0 * 1024.0 * 1024.0); // GB
    float freeBytesGB = cardSizeGB - usedBytesGB; // GB

    char buffer[150];
    snprintf(buffer, sizeof(buffer),
             "SD Card Info:\n"
             "Total: %.2f GB\n"
             "Used: %.2f GB\n"
             "Free: %.2f GB",
             cardSizeGB, usedBytesGB, freeBytesGB);

    return String(buffer);
}

String getContentType(String filename) {
    //TODO: SWITCH
    filename.toLowerCase();
    if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "image/jpeg";
    else if (filename.endsWith(".png")) return "image/png";
    else if (filename.endsWith(".gif")) return "image/gif";
    else if (filename.endsWith(".bmp")) return "image/bmp";
    else if (filename.endsWith(".txt")) return "text/plain";
    else if (filename.endsWith(".html") || filename.endsWith(".htm")) return "text/html";
    else if (filename.endsWith(".css")) return "text/css";
    else if (filename.endsWith(".js")) return "application/javascript";
    else if (filename.endsWith(".json")) return "application/json";
    else if (filename.endsWith(".pdf")) return "application/pdf";
    else if (filename.endsWith(".zip")) return "application/zip";
    else if (filename.endsWith(".mp3")) return "audio/mpeg";
    else if (filename.endsWith(".mp4")) return "video/mp4";
    else if (filename.endsWith(".avi")) return "video/x-msvideo";
    else return "application/octet-stream";
}

String getFileListHTML(String currentPath = "/") {
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

        if (file.isDirectory()) {
            html += "<tr>";
            html += "<td><input type='checkbox' data-path=\"" + cleanPath + "\"></td>";
            html += "<td><button onclick=\"navigateToFolder('" + currentPath + "/" + filename + "')\">📁 " + filename + "</button></td>";
            html += "</tr>";
        } else {
            html += "<tr>";
            html += "<td><input type='checkbox' data-path=\"" + cleanPath + "\"></td>";
            html += "<td>📄 " + filename + "</td>";
            html += "</tr>";
        }
        file = dir.openNextFile();
    }
    dir.close();
    return html;
}

// ------------------------------------------------------------------------------------------------------------------

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

String sanitizePath(String path) {
    path.replace("\\", "/"); // Normalize slashes

    // Remove any ../ or ./ sequences
    while (path.indexOf("/../") >= 0 || path.indexOf("/./") >= 0) {
        path.replace("/../", "/");
        path.replace("/./", "/");
    }

    // Ensure path starts with /
    if (!path.startsWith("/")) {
        path = "/" + path;
    }

    // Remove double slashes
    while (path.indexOf("//") >= 0) {
        path.replace("//", "/");
    }

    return path;
}

String sanitizeFilename(String filename) {
    // Remove path components from filename
    int lastSlash = filename.lastIndexOf('/');
    if (lastSlash != -1) {
        filename = filename.substring(lastSlash + 1);
    }

    // Replace problematic characters
    filename.replace(" ", "_");
    filename.replace("..", "");

    return filename;
}

bool deleteFolderRecursive(String path) {
    File dir = SD.open(path);
    if (!dir) {
        return false;
    }

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

// ------------------------------------------------------------------------------------------------------------------

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

void setup() {
    Serial.begin(115200);
    LittleFS.begin();
    delay(2000);

    initSDCard();
    initAP();

    server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
        Serial.println("Serving index.html");
        request->send(LittleFS, "/index.html", "text/html");
    });

    server.on("/script.js", HTTP_GET, [](AsyncWebServerRequest *request) {
        request->send(LittleFS, "/script.js", "application/javascript");
    });

    // server.on("/style.css", HTTP_GET, [](AsyncWebServerRequest *request) {
    //     request->send(LittleFS, "/style.css", "text/css");
    // });


    server.on("/list", HTTP_GET, handleListFiles);
    server.on("/sdinfo", HTTP_GET, handleSDInfo);
    server.on("/download", HTTP_GET, handleDownload);
    server.on("/deleteFile", HTTP_GET, handleDeleteFile);
    server.on("/mkdir", HTTP_GET, handleCreateFolder);
    server.on("/deleteFolder", HTTP_GET, handleDeleteFolder);

    server.on("/upload", HTTP_POST,
              [](AsyncWebServerRequest *request) {
                  request->send(200);
              },
              handleUpload
    );

    server.begin();
}

void loop() {
    delay(1000);
}
