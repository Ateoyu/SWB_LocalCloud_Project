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
    if(cardType == CARD_NONE) {
        Serial.println("No SD card attached");
        return;
    }

    uint64_t cardSize = SD.cardSize() / (1024 * 1024);
    Serial.printf("SD Card Size: %lluMB\n", cardSize);
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

String getContentType(String filename) { //TODO: SWITCH
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

String getFileListHTML() {
    String html = "";
    File root = SD.open("/");
    if (!root) {
        return "<tr><td colspan='3'>Failed to open root directory</td></tr>";
    }

    File file = root.openNextFile();
    while (file) {
        String filename = String(file.name());
        if (!file.isDirectory() && !filename.startsWith(".")) {
            html += "<tr>";
            html += "<td>" + filename + "</td>";
            html += "<td>";
            html += "<a href='/download?file=" + filename + "' download='" + filename + "' class='download-btn'>Download</a> ";
            html += "<button class='delete-btn' onclick=\"deleteFile('" + filename + "')\">Delete</button>";
            html += "</td>";
            html += "</tr>";
        }
        file = root.openNextFile();
    }
    root.close();
    return html;
}

// ---------

void handleDelete(AsyncWebServerRequest *request) {
    if (!request->hasParam("file")) {
        request->send(400, "text/plain", "Missing file parameter");
        return;
    }

    String filename = request->getParam("file")->value();
    String filepath = "/" + filename;

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

void handleUpload(AsyncWebServerRequest *request,
                      const String& filename,
                      size_t index,
                      uint8_t *data,
                      size_t len,
                      bool final) {

        static File uploadFile;
        static String currentFilename;

        if (!index) {
            currentFilename = filename;

            if (currentFilename.startsWith("/")) {
                currentFilename = currentFilename.substring(1);
            }

            int lastSlash = currentFilename.lastIndexOf('/');
            if (lastSlash != -1) {
                currentFilename = currentFilename.substring(lastSlash + 1);
            }

            currentFilename.replace(" ", "_");

            String filepath = "/" + currentFilename;
            Serial.printf("Upload start: %s\n", filepath.c_str());

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

    String filename = request->getParam("file")->value();
    String filepath = "/" + filename;

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

    //File List
    server.on("/list", HTTP_GET, [](AsyncWebServerRequest *request) {
        request->send(200, "text/html", getFileListHTML());
    });

    // Download file
    server.on("/download", HTTP_GET, [](AsyncWebServerRequest *request) {
        handleDownload(request);
    });

    // Delete file
    server.on("/delete", HTTP_GET, [](AsyncWebServerRequest *request) {
        handleDelete(request);
    });

    // Upload handler
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