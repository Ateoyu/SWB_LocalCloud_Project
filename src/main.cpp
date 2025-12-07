#include <Arduino.h>
#include <LittleFS.h>
#include "config.h"
#include "sd_card_manager.h"
#include "web_server.h"

void setup() {
    Serial.begin(115200);
    LittleFS.begin();
    delay(2000);
    initSDCard();
    initAP();
    setupWebServer();
}

void loop() {
    delay(1000);
}