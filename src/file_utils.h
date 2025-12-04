#ifndef FILE_UTILS_H
#define FILE_UTILS_H

#include <Arduino.h>
#include "FS.h"
#include "SD.h"

String sanitizePath(String path);
String sanitizeFilename(String filename);
bool deleteFolderRecursive(String path);
void createPath(String path);

#endif