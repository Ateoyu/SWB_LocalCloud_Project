#ifndef WEBSERVER_H
#define WEBSERVER_H

#include <Arduino.h>

class AsyncWebServer;
class AsyncWebServerRequest;

#ifndef HTTP_GET
#define HTTP_GET 0b00000001
#endif
#ifndef HTTP_POST
#define HTTP_POST 0b00000010
#endif

extern AsyncWebServer server;

void initAP();
void setupWebServer();
void handleUpload(AsyncWebServerRequest *request,
                  const String &filename,
                  size_t index,
                  uint8_t *data,
                  size_t len,
                  bool final);
void handleListFiles(AsyncWebServerRequest *request);
void handleSDInfo(AsyncWebServerRequest *request);
void handleDownload(AsyncWebServerRequest *request);
void handleMove(AsyncWebServerRequest *request);
void handleDeleteFile(AsyncWebServerRequest *request);
void handleCreateFolder(AsyncWebServerRequest *request);
void handleDeleteFolder(AsyncWebServerRequest *request);
void handleImagePreview(AsyncWebServerRequest *request);

#endif