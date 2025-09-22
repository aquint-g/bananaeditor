import { makeAssetDraggable } from './canvas_manager.js';

/**
 * Handles the file upload event.
 * Reads selected image files, creates thumbnails, and makes them draggable.
 * @param {Event} event - The file input change event.
 */
function handleFileUpload(event) {
    const assetList = document.getElementById('asset-list');
    const files = event.target.files;
    for (const file of files) {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.classList.add('asset-thumbnail');
                assetList.appendChild(img);
                // Make the new thumbnail draggable
                makeAssetDraggable(img);
            };
            reader.readAsDataURL(file);
        }
    }
}

/**
 * Initializes the asset manager by setting up the file upload listener.
 */
export function initAssetManager() {
    const assetUpload = document.getElementById('asset-upload');
    assetUpload.addEventListener('change', handleFileUpload);
}
