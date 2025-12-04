#ifndef SD_MANAGER_H
#define SD_MANAGER_H

#include <Arduino.h>
#include "SPI.h"
#include "SD.h"
#include "config.h"

extern SPIClass spi;
void initSDCard();

#endif