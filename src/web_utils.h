#ifndef WEB_UTILS_H
#define WEB_UTILS_H

#include <Arduino.h>

String getContentType(String filename);
String getFileListHTML(String currentPath = "/");
String getSDCardInfo();

#endif