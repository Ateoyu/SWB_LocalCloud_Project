let galleryImages = [];
let currentIndex = 0;

function collectImages() {
  const container = document.getElementById('fileTable');
  if (!container) return [];
  return Array.from(container.querySelectorAll('.file-item[data-type="image"] img.preview-img'));
}

function isOpen(lightbox) {
  return lightbox && lightbox.style.display === 'flex';
}

function openLightbox(index) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  if (!lightbox || !lightboxImage) return;
  galleryImages = collectImages();
  if (galleryImages.length === 0) return;
  currentIndex = ((index % galleryImages.length) + galleryImages.length) % galleryImages.length;
  const img = galleryImages[currentIndex];
  if (!img) return;
  lightboxImage.src = img.src;
  lightbox.style.display = 'flex';
  lightbox.setAttribute('aria-hidden', 'false');
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  if (!lightbox) return;
  lightbox.style.display = 'none';
  lightbox.setAttribute('aria-hidden', 'true');
  if (lightboxImage) lightboxImage.src = '';
}

function showPrev() {
  galleryImages = collectImages();
  if (galleryImages.length === 0) return;
  currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
  const img = galleryImages[currentIndex];
  const lightboxImage = document.getElementById('lightboxImage');
  if (img && lightboxImage) lightboxImage.src = img.src;
}

function showNext() {
  galleryImages = collectImages();
  if (galleryImages.length === 0) return;
  currentIndex = (currentIndex + 1) % galleryImages.length;
  const img = galleryImages[currentIndex];
  const lightboxImage = document.getElementById('lightboxImage');
  if (img && lightboxImage) lightboxImage.src = img.src;
}

function onKeyDown(event) {
  const lightbox = document.getElementById('lightbox');
  if (!isOpen(lightbox)) return;
  switch (event.key) {
    case 'Escape':
      closeLightbox();
      break;
    case 'ArrowLeft':
      showPrev();
      break;
    case 'ArrowRight':
      showNext();
      break;
  }
}

function setupLightbox() {
  const closeButton = document.getElementById('lightboxClose');
  const prevButton = document.getElementById('lightboxPrev');
  const nextButton = document.getElementById('lightboxNext');
  const lightbox = document.getElementById('lightbox');

  if (closeButton && !closeButton.dataset.bound) {
    closeButton.addEventListener('click', closeLightbox);
    closeButton.dataset.bound = '1';
  }
  if (prevButton && !prevButton.dataset.bound) {
    prevButton.addEventListener('click', showPrev);
    prevButton.dataset.bound = '1';
  }
  if (nextButton && !nextButton.dataset.bound) {
    nextButton.addEventListener('click', showNext);
    nextButton.dataset.bound = '1';
  }
  if (lightbox && !lightbox.dataset.bound) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    lightbox.dataset.bound = '1';
  }

  if (!document.body.dataset.lbKeyBound) {
    document.addEventListener('keydown', onKeyDown);
    document.body.dataset.lbKeyBound = '1';
  }

  const imgs = collectImages();
  imgs.forEach((img, idx) => {
    if (img.dataset.lbBound) return;
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', (e) => {
      e.preventDefault();
      openLightbox(idx);
    });
    img.dataset.lbBound = '1';
  });
}

export { setupLightbox };
