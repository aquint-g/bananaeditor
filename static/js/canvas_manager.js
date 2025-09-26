import { openAIModal } from './feature_mockups.js';

// --- STATE MANAGEMENT ---

// The currently selected item on the canvas
let activeItem = null;
// The Cropper.js instance
let cropper = null;
// A counter to ensure new items always appear on top
let zIndexCounter = 1;
// A state object to manage the details of the current user action (moving, resizing, etc.)
let actionState = {
    action: null,
    startPos: { x: 0, y: 0 },
    startDims: { w: 0, h: 0 },
    startAngle: 0,
    centerX: 0,
    centerY: 0,
};

// --- ITEM CREATION ---

/**
 * Creates a new item on the canvas with an image, handles, and event listeners.
 * @param {string} src - The image source URL.
 * @param {number} x - The initial x-coordinate.
 * @param {number} y - The initial y-coordinate.
 * @param {string} [filename] - The original filename of the image.
 */
function createItem(src, x, y, filename) {
    const canvas = document.getElementById('canvas');
    const wrapper = document.createElement('div');
    wrapper.classList.add('canvas-item-wrapper');
    wrapper.style.left = `${x}px`;
    wrapper.style.top = `${y}px`;
    wrapper.style.zIndex = zIndexCounter++;
    if (filename) {
        wrapper.dataset.filename = filename;
    }

    const canvasEl = document.createElement('canvas');
    canvasEl.classList.add('canvas-item');
    wrapper.appendChild(canvasEl);

    const img = new Image();
    img.crossOrigin = "Anonymous"; // Allow loading external images for processing
    img.onload = () => {
        // Set canvas size to image size
        canvasEl.width = img.naturalWidth;
        canvasEl.height = img.naturalHeight;
        const ctx = canvasEl.getContext('2d');
        ctx.drawImage(img, 0, 0);
        // Store the original image data on the wrapper for later use (e.g., resizing)
        wrapper.originalImage = img;
    };
    img.src = src;

    const rotateHandle = document.createElement('div');
    rotateHandle.classList.add('handle', 'rotate');
    wrapper.appendChild(rotateHandle);

    const resizeHandle = document.createElement('div');
    resizeHandle.classList.add('handle', 'resize');
    wrapper.appendChild(resizeHandle);

    const aiHandle = document.createElement('div');
    aiHandle.classList.add('handle', 'ai-reinvent');
    aiHandle.textContent = '✨';
    wrapper.appendChild(aiHandle);

    wrapper.addEventListener('mousedown', onMouseDown);
    wrapper.addEventListener('contextmenu', onContextMenu);
    canvas.appendChild(wrapper);
    selectItem(wrapper);
    checkBounds(wrapper);
}

// --- SELECTION ---

/**
 * Selects an item, highlighting it and deselecting others.
 * @param {HTMLElement} item - The canvas item wrapper to select.
 */
function selectItem(item) {
    if (activeItem) {
        activeItem.classList.remove('selected');
    }
    activeItem = item;
    activeItem.classList.add('selected');
}

/**
 * Deselects any currently selected item.
 */
function deselectAll() {
    if (activeItem) {
        activeItem.classList.remove('selected');
        activeItem = null;
    }
}

// --- MOUSE EVENT HANDLING for Transformations ---

/**
 * Handles the initial mousedown event on a canvas item or its handles.
 * Determines the action (move, resize, rotate) and sets up initial state.
 * @param {MouseEvent} e - The mousedown event.
 */
function onMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();

    const target = e.target;
    const wrapper = target.closest('.canvas-item-wrapper');
    selectItem(wrapper);
    wrapper.style.zIndex = zIndexCounter++; // Bring to front on interaction

    // Record initial positions and dimensions for calculations
    actionState.startPos = { x: e.clientX, y: e.clientY };
    const rect = wrapper.getBoundingClientRect();
    actionState.startDims = { w: rect.width, h: rect.height };
    actionState.centerX = rect.left + rect.width / 2;
    actionState.centerY = rect.top + rect.height / 2;

    const currentTransform = wrapper.style.transform;
    const rotationMatch = currentTransform.match(/rotate\((.+)deg\)/);
    actionState.startAngle = rotationMatch ? parseFloat(rotationMatch[1]) : 0;

    // Determine action based on which handle was clicked
    if (target.classList.contains('rotate')) {
        actionState.action = 'rotating';
    } else if (target.classList.contains('resize')) {
        actionState.action = 'resizing';
    } else if (target.classList.contains('ai-reinvent')) {
        actionState.action = null; // Don't drag
        openAIModal(wrapper);
        return; // Exit before adding drag listeners
    } else {
        actionState.action = 'moving';
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

/**
 * Handles the mousemove event to perform the active transformation.
 * @param {MouseEvent} e - The mousemove event.
 */
function onMouseMove(e) {
    if (!actionState.action) return;

    const dx = e.clientX - actionState.startPos.x;
    const dy = e.clientY - actionState.startPos.y;

    if (actionState.action === 'moving') {
        activeItem.style.left = `${activeItem.offsetLeft + dx}px`;
        activeItem.style.top = `${activeItem.offsetTop + dy}px`;
        actionState.startPos = { x: e.clientX, y: e.clientY }; // Update start position for smooth dragging
    } else if (actionState.action === 'resizing') {
        const newWidth = Math.max(actionState.startDims.w + dx, 20); // min width 20px
        const newHeight = Math.max(actionState.startDims.h + dy, 20); // min height 20px
        activeItem.style.width = `${newWidth}px`;
        activeItem.style.height = `${newHeight}px`;

        // Redraw the canvas to prevent stretching and re-apply chroma key if needed
        if (activeItem.originalImage) {
            const useChroma = activeItem.dataset.chromaKey === 'true';
            redrawCanvasItem(activeItem, activeItem.originalImage, useChroma);
        }
    } else if (actionState.action === 'rotating') {
        const angle = Math.atan2(e.clientY - actionState.centerY, e.clientX - actionState.centerX) * (180 / Math.PI);
        const startAngle = Math.atan2(actionState.startPos.y - actionState.centerY, actionState.startPos.x - actionState.centerX) * (180 / Math.PI);
        const rotation = angle - startAngle;
        activeItem.style.transform = `rotate(${actionState.startAngle + rotation}deg)`;
    }
    checkBounds(activeItem);
}

/**
 * Handles the mouseup event to end the current transformation.
 */
function onMouseUp() {
    if (activeItem) checkBounds(activeItem);
    actionState.action = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
}

// --- CONTEXT MENU ---

const contextMenu = document.getElementById('context-menu');

function showContextMenu(x, y) {
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
    contextMenu.style.display = 'block';
}

function hideContextMenu() {
    contextMenu.style.display = 'none';
}

function onContextMenu(e) {
    e.preventDefault();
    e.stopPropagation();
    const wrapper = e.target.closest('.canvas-item-wrapper');
    selectItem(wrapper);
    showContextMenu(e.clientX, e.clientY);
}


// --- TOOLBAR AND CANVAS CONTROLS ---

/**
 * Enables or disables toolbar buttons based on whether an item is selected.
 * @param {boolean} itemIsSelected - True if an item is selected.
 */
function bringToFront() {
    if (activeItem) {
        activeItem.style.zIndex = zIndexCounter++;
    }
}

function sendToBack() {
    if (activeItem) {
        const items = Array.from(document.querySelectorAll('.canvas-item-wrapper'));
        const zIndexes = items.map(item => parseInt(item.style.zIndex || 0));
        const minZIndex = Math.min(...zIndexes);
        activeItem.style.zIndex = minZIndex - 1;
    }
}

function deleteItem() {
    if (activeItem) {
        activeItem.remove();
        activeItem = null;
        hideContextMenu();
    }
}

// --- CROP MODAL ---

/**
 * Opens the crop modal for the selected image.
 * @param {HTMLElement} item - The canvas item wrapper to crop.
 */
function openCropModal(item) {
    if (!item || !item.originalImage) return;

    const modal = document.getElementById('crop-modal');
    const image = document.getElementById('crop-image-source');
    const cropBtn = document.getElementById('crop-btn');

    // Set the image source for the cropper
    image.src = item.originalImage.src;

    // Show the modal
    modal.style.display = 'flex';

    // Handler for the crop button click
    const cropHandler = () => {
        if (cropper) {
            const croppedCanvas = cropper.getCroppedCanvas();
            const newImageDataUrl = croppedCanvas.toDataURL('image/png');

            const newImage = new Image();
            newImage.onload = () => {
                // Update the original image of the canvas item
                item.originalImage = newImage;
                // Redraw the item on the main canvas
                redrawCanvasItem(item, newImage, item.dataset.chromaKey === 'true');
            };
            newImage.src = newImageDataUrl;

            closeCropModal();
        }
    };

    // Ensure Cropper is initialized after the image has loaded
    image.onload = () => {
        // Destroy previous cropper instance if it exists
        if (cropper) {
            cropper.destroy();
        }
        // Initialize Cropper.js
        cropper = new Cropper(image, {
            aspectRatio: 0,
            viewMode: 1,
            autoCropArea: 1,
        });

        // Add event listener for the crop button, removing any old one
        cropBtn.replaceWith(cropBtn.cloneNode(true));
        document.getElementById('crop-btn').addEventListener('click', cropHandler);
    };

    image.onerror = () => {
        console.error("Failed to load image for cropping.");
        closeCropModal();
    };
}


/**
 * Closes the crop modal and cleans up the Cropper instance.
 */
function closeCropModal() {
    const modal = document.getElementById('crop-modal');
    modal.style.display = 'none';

    // Destroy the cropper instance to free up resources
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }

    // Clear the image source
    const image = document.getElementById('crop-image-source');
    image.src = '';
}


/**
 * Redraws the image onto the canvas item, optionally applying a chroma key.
 * @param {HTMLElement} item - The canvas item wrapper.
 * @param {HTMLImageElement} image - The image to draw.
 * @param {boolean} useChromaKey - Whether to apply the chroma key effect.
 */
export function redrawCanvasItem(item, image, useChromaKey = false) {
    const canvas = item.querySelector('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas drawing size to match the wrapper's current size
    canvas.width = item.clientWidth;
    canvas.height = item.clientHeight;

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    if (useChromaKey) {
        applyChromaKey(canvas, { r: 255, g: 0, b: 255 });
    }
}

/**
 * Applies a chroma key effect to a canvas, making a specific color transparent.
 * @param {HTMLCanvasElement} canvas - The canvas to process.
 * @param {object} keyColor - The color to make transparent (e.g., { r: 255, g: 0, b: 255 }).
 */
function applyChromaKey(canvas, keyColor) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const tolerance = 80; // Further increased tolerance for more permissive matching

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Check if the pixel color is close to the key color
        if (Math.abs(r - keyColor.r) < tolerance &&
            Math.abs(g - keyColor.g) < tolerance &&
            Math.abs(b - keyColor.b) < tolerance) {
            // Set alpha to 0 to make it transparent
            data[i + 3] = 0;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

/**
 * Sends the active image to the server to remove its background.
 * @param {HTMLElement} item - The canvas item wrapper.
 */
async function removeBackground(item) {
    const canvas = item.querySelector('canvas');
    if (!canvas) {
        console.error('No canvas found in the item.');
        return;
    }

    item.classList.add('loading-background');

    try {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        const fileName = item.dataset.filename || 'image-to-process.png';

        const formData = new FormData();
        formData.append('file', blob, fileName);
        // The prompt is handled server-side, but we still need to send it.
        formData.append('prompt', 'Replace background with magenta');

        const removeResponse = await fetch('/remove_background', {
            method: 'POST',
            body: formData,
        });

        if (!removeResponse.ok) {
            const errorText = await removeResponse.text();
            throw new Error(`Server error: ${removeResponse.status} ${errorText}`);
        }

        const newImageBlob = await removeResponse.blob();
        const newImageUrl = URL.createObjectURL(newImageBlob);

        const newImage = new Image();
        newImage.crossOrigin = "Anonymous";
        newImage.onload = () => {
            // Store the new image for resizing and future operations
            item.originalImage = newImage;
            // Mark that this item should now always use chroma key
            item.dataset.chromaKey = 'true';
            // Redraw the canvas with the new image and apply the effect
            redrawCanvasItem(item, newImage, true);
            // Update filename for the processed image
            item.dataset.filename = 'processed.png';
        };
        newImage.src = newImageUrl;

    } catch (error) {
        console.error('Error removing background:', error);
        alert('Failed to remove background. Please check the console for details.');
    } finally {
        item.classList.remove('loading-background');
    }
}

/**
 * Checks if a given item is partially or fully outside the canvas bounds.
 * @param {HTMLElement} item - The item to check.
 */
function checkBounds(item) {
    const canvas = document.getElementById('canvas');
    const canvasRect = canvas.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();

    if (itemRect.left < canvasRect.left || itemRect.right > canvasRect.right ||
        itemRect.top < canvasRect.top || itemRect.bottom > canvasRect.bottom) {
        item.classList.add('out-of-bounds');
    } else {
        item.classList.remove('out-of-bounds');
    }
}

/**
 * Runs the bounds check on all items on the canvas.
 */
function checkAllBounds() {
    const items = document.querySelectorAll('.canvas-item-wrapper');
    items.forEach(item => checkBounds(item));
}

function toggleAspectRatio() {
    const canvas = document.getElementById('canvas');
    const btn = document.getElementById('aspect-ratio-btn');
    canvas.classList.toggle('tall');

    if (canvas.classList.contains('tall')) {
        btn.textContent = 'Toggle Aspect Ratio (9:16)';
    } else {
        btn.textContent = 'Toggle Aspect Ratio (16:9)';
    }
    checkAllBounds();
}

export function resetZIndexCounter() {
    zIndexCounter = 1;
}

// --- DRAG AND DROP ---

export function makeAssetDraggable(asset) {
    asset.draggable = true;
    asset.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', event.target.src);
        if (event.target.dataset.filename) {
            event.dataTransfer.setData('text/filename', event.target.dataset.filename);
        }
    });
}

function dropHandler(event) {
    event.preventDefault();
    const canvas = document.getElementById('canvas');
    canvas.classList.remove('drag-over');
    const src = event.dataTransfer.getData('text/plain');
    const filename = event.dataTransfer.getData('text/filename');

    const canvasRect = canvas.getBoundingClientRect();
    const x = event.clientX - canvasRect.left;
    const y = event.clientY - canvasRect.top;

    createItem(src, x, y, filename);
}

// --- INITIALIZATION ---

export function initCanvasManager() {
    const canvas = document.getElementById('canvas');

    // Setup drop zone listeners
    canvas.addEventListener('dragover', (event) => {
        event.preventDefault();
        canvas.classList.add('drag-over');
    });
    canvas.addEventListener('dragleave', () => {
        canvas.classList.remove('drag-over');
    });
    canvas.addEventListener('drop', dropHandler);

    // Listener to deselect items when clicking on the canvas background
    canvas.addEventListener('mousedown', (e) => {
        if (e.target.id === 'canvas') {
            deselectAll();
        }
    });

    // Global listeners to hide context menu
    window.addEventListener('click', (e) => {
        if (!contextMenu.contains(e.target)) {
            hideContextMenu();
        }
    });
    window.addEventListener('contextmenu', (e) => {
        // Hide if right-clicking anywhere but on a canvas item
        if (!e.target.closest('.canvas-item-wrapper')) {
            hideContextMenu();
        }
    });

    // Context menu command listeners
    contextMenu.addEventListener('click', (e) => {
        if (!activeItem) return;

        const command = e.target.id;

        switch (command) {
            case 'context-front':
                bringToFront();
                break;
            case 'context-back':
                sendToBack();
                break;
            case 'context-delete':
                deleteItem();
                break;
            case 'context-crop':
                openCropModal(activeItem);
                break;
            case 'context-remove-background':
                removeBackground(activeItem);
                break;
            case 'context-ai-reinvent':
                // This function is imported from feature_mockups.js
                openAIModal(activeItem);
                break;
        }
        // Always hide the menu after a command is executed
        hideContextMenu();
    });

    // Crop modal close button
    const cropModal = document.getElementById('crop-modal');
    const closeCropBtn = cropModal.querySelector('.close-btn');
    closeCropBtn.addEventListener('click', closeCropModal);


    // Toolbar button listeners
    document.getElementById('aspect-ratio-btn').addEventListener('click', toggleAspectRatio);
}
