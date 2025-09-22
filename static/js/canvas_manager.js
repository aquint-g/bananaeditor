import { openAIModal } from './feature_mockups.js';

// --- STATE MANAGEMENT ---

// The currently selected item on the canvas
let activeItem = null;
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
 */
function createItem(src, x, y) {
    const canvas = document.getElementById('canvas');
    const wrapper = document.createElement('div');
    wrapper.classList.add('canvas-item-wrapper');
    wrapper.style.left = `${x}px`;
    wrapper.style.top = `${y}px`;
    wrapper.style.zIndex = zIndexCounter++;

    const img = document.createElement('img');
    img.src = src;
    img.classList.add('canvas-item');
    wrapper.appendChild(img);

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
    updateToolbarButtons(true);
}

/**
 * Deselects any currently selected item.
 */
function deselectAll() {
    if (activeItem) {
        activeItem.classList.remove('selected');
        activeItem = null;
    }
    updateToolbarButtons(false);
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

// --- TOOLBAR AND CANVAS CONTROLS ---

/**
 * Enables or disables toolbar buttons based on whether an item is selected.
 * @param {boolean} itemIsSelected - True if an item is selected.
 */
function updateToolbarButtons(itemIsSelected) {
    document.getElementById('z-front-btn').disabled = !itemIsSelected;
    document.getElementById('z-back-btn').disabled = !itemIsSelected;
}

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
    });
}

function dropHandler(event) {
    event.preventDefault();
    const canvas = document.getElementById('canvas');
    canvas.classList.remove('drag-over');
    const src = event.dataTransfer.getData('text/plain');

    const canvasRect = canvas.getBoundingClientRect();
    const x = event.clientX - canvasRect.left;
    const y = event.clientY - canvasRect.top;

    createItem(src, x, y);
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

    // Toolbar button listeners
    document.getElementById('z-front-btn').addEventListener('click', bringToFront);
    document.getElementById('z-back-btn').addEventListener('click', sendToBack);
    document.getElementById('aspect-ratio-btn').addEventListener('click', toggleAspectRatio);
}
