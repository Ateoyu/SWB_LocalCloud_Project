const thumbnailCache = new Map();

async function createImageThumbnail(imageUrl, width = 32, height = 32) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            ctx.drawImage(img, 0, 0, width, height);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            resolve(dataUrl);
        };

        img.onerror = function() {
            resolve(null);
        };

        img.src = imageUrl;
    });
}

async function getThumbnail(imagePath, imageUrl) {
    if (thumbnailCache.has(imagePath)) {
        return thumbnailCache.get(imagePath);
    }

    try {
        const thumbnail = await createImageThumbnail(imageUrl);

        if (thumbnail) {
            thumbnailCache.set(imagePath, thumbnail);
            return thumbnail;
        }
    } catch (error) {
        console.log('Failed to create thumbnail:', error);
    }

    return null;
}

function updateFileListWithThumbnails() {
    const items = document.querySelectorAll('#fileTable .file-item');

    items.forEach(async (item) => {
        const img = item.querySelector('.preview-img');
        if (!img) return;

        const checkbox = item.querySelector('input.select-checkbox');
        const imagePath = img.getAttribute('data-path') || checkbox?.dataset.path;
        const originalSrc = img.src;

        if (!imagePath) return;

        img.classList.add('loading');

        try {
            const thumbnail = await getThumbnail(imagePath, originalSrc);

            if (thumbnail) {
                img.src = thumbnail;
                // size is styled via CSS; ensure fallback here
                img.style.width = img.style.width || '72px';
                img.style.height = img.style.height || '72px';
                img.style.objectFit = 'cover';
            }
        } catch (error) {
            console.log('Thumbnail error:', error);
        } finally {
            img.classList.remove('loading');
        }
    });
}

export { updateFileListWithThumbnails, getThumbnail, createImageThumbnail, thumbnailCache };