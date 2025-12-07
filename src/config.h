#ifndef CONFIG_H
#define CONFIG_H

#include <IPAddress.h>

static const char *ssid = "ESP32-S3-Cloud";
static const char *password = "12345678";
static IPAddress local_IP(192, 168, 100, 1);
static IPAddress gateway(192, 168, 100, 1);
static IPAddress subnet(255, 255, 255, 0);

#define SD_SCK 12
#define SD_MISO 13
#define SD_MOSI 11
#define SD_CS 10
#define SERVER_PORT 80

#endif