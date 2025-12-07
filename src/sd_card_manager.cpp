#include "sd_card_manager.h"

SPIClass spi = SPIClass(HSPI);

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