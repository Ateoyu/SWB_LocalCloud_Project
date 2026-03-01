# ESP32-S3 LocalCloud

A high-performance local file storage and management system running on the ESP32-S3. This project allows you to access and manage files stored on an SD card through a modern, responsive web interface, creating your own private "LocalCloud".


https://github.com/user-attachments/assets/8e0c5d82-5dc5-4ed6-b802-ef80100ad13f


## Features

- **Responsive Web Manager**: Accessible from any desktop or mobile device.
- **Advanced Navigation**: Breadcrumb-style path navigation and directory browsing.
- **File Operations**:
    - **Upload**: Parallel multi-file upload support with real-time progress tracking.
    - **Download**: Single and batch file download capabilities.
    - **Move/Rename**: Drag-and-drop support for moving files and folders between directories.
    - **Management**: Easy creation and deletion of folders and files.
- **Media Preview**:
    - **Image Thumbnails**: Visual previews for supported image formats.
    - **Lightbox Gallery**: Full-screen image viewer with keyboard navigation support (Escape, Arrow Keys).
- **Storage Management**: Real-time SD card information (Used/Total space).
- **Customizable Views**: Toggle between Grid and List view modes, with persistence via `localStorage`.
- **Standalone Operation**: Operates in Access Point mode, creating its own Wi-Fi network.

## Frontend Architecture

The frontend is built using a modular JavaScript architecture (ES modules), ensuring clean code separation and maintainability.

- **`main.js`**: Application entry point; initializes global state and sets up core UI event listeners.
- **`fileManager.js`**: Core logic for file system interactions, including API communication for listing, moving, and deleting items. Implements the Drag-and-Drop system.
- **`uiManager.js`**: Centralized state management (current path, selected items) and UI synchronization.
- **`batchActions.js`**: Logic for multi-item selection and bulk operations (batch delete/download).
- **`lightbox.js`**: Implements the image preview gallery with support for keyboard interaction.
- **`navigationManager.js`**: Handles directory traversal logic.

## Web API Endpoints

The system exposes several endpoints for frontend-to-firmware communication:

- `GET /list?path=PATH`: Returns HTML-formatted file list for the specified directory.
- `GET /sdinfo`: Returns text-based SD card status (Used/Total space).
- `GET /download?file=FILE&path=PATH`: Initiates file download.
- `GET /move?src=SRC_PATH&dst=DST_FOLDER`: Moves or renames a file/folder.
- `GET /deleteFile?file=FILE&path=PATH`: Deletes a specific file.
- `GET /deleteFolder?name=FOLDER&path=PATH`: Deletes a folder and all its contents.
- `GET /mkdir?name=NAME&path=PATH`: Creates a new directory.
- `GET /preview?path=PATH`: Serves a resized/original image for preview purposes.
- `POST /upload?path=PATH`: Endpoint for multipart file uploads.

## Hardware Setup

The project is configured for an ESP32-S3. The SD card is connected via SPI using the following pinout:

### ESP32-S3 SD Card Pinout

| SD Card Pin | ESP32-S3 GPIO |
| ----------- | ------------- |
| **SCK**     | 12            |
| **MISO**    | 13            |
| **MOSI**    | 11            |
| **CS**      | 10            |

## Configuration

Default network settings can be found in `src/config.h`:

- **SSID**: `ESP32-S3-Cloud`
- **Password**: `12345678`
- **Default IP**: `192.168.100.1`

## Project Structure

- `src/`: C++ source files for the ESP32-S3 firmware.
- `data/`: Static web files (HTML, CSS, JS, icons) to be uploaded to LittleFS.
- `lib/`: External libraries.
- `platformio.ini`: PlatformIO configuration file.

## Getting Started

### Prerequisites

- PlatformIO
- ESP32-S3 Development Board (e.g., Waveshare ESP32-S3)
- SD Card (formatted to FAT32)

### Building and Uploading

1.  **Clone the repository**.
2.  **Open the project** in PlatformIO.
3.  **Upload the Filesystem Image**:
    -   In PlatformIO, go to the project tasks.
    -   Find your environment (e.g., `env:waveshare_esp32-s3-qio-psram`).
    -   Select **Platform** → **Build Filesystem Image** and then **Upload Filesystem Image**. This will upload the contents of the `data/` folder to the LittleFS partition.
4.  **Upload the Firmware**:
    -   Click the **Upload** button in PlatformIO to build and upload the C++ code.

### Usage

1.  Power on your ESP32-S3.
2.  Connect your computer or smartphone to the Wi-Fi network **ESP32-S3-Cloud** using the password **12345678**.
3.  Open a web browser and navigate to the IP address shown in the serial monitor.
4.  You can now start managing your files!
