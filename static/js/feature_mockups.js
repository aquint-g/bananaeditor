import { resetZIndexCounter } from './canvas_manager.js';

// --- "REINVENT WITH AI" MODAL ---

// The canvas item that the AI feature is targeting
let aiTargetItem = null;

/**
 * Populates the AI modal with 4 new random placeholder images.
 */
function populateAIModal() {
    const propositions = document.getElementById('ai-propositions');
    propositions.innerHTML = '';
    for (let i = 0; i < 4; i++) {
        const img = document.createElement('img');
        // Use a placeholder service. Add a random query to avoid caching.
        img.src = `https://picsum.photos/200/300?random=${Date.now() + i}`;
        img.addEventListener('click', () => {
            // When a proposition is clicked, replace the target's image source
            if (aiTargetItem) {
                aiTargetItem.querySelector('.canvas-item').src = img.src;
                closeAIModal();
            }
        });
        propositions.appendChild(img);
    }
}

/**
 * Opens the AI modal and sets the target item.
 * @param {HTMLElement} targetItem - The canvas item to be "reinvented".
 */
function openAIModal(targetItem) {
    aiTargetItem = targetItem;
    const modal = document.getElementById('ai-modal');
    modal.style.display = 'flex';
    populateAIModal();
}

/**
 * Closes the AI modal and clears the target item.
 */
function closeAIModal() {
    const modal = document.getElementById('ai-modal');
    modal.style.display = 'none';
    aiTargetItem = null;
}

// --- TOOLBAR FEATURES ---

/**
 * Exports the current canvas content as a PNG image.
 * Uses the html2canvas library to render the DOM to a canvas.
 */
function exportCanvas() {
    // Temporarily deselect item to hide handles in the export
    const selectedItem = document.querySelector('.canvas-item-wrapper.selected');
    if (selectedItem) {
        selectedItem.classList.remove('selected');
    }

    html2canvas(document.getElementById('canvas'), {
        backgroundColor: null, // Make background transparent
        useCORS: true // Important for external images
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'banana-canvas-export.png';
        link.href = canvas.toDataURL('image/png');
        link.click();

        // Reselect item if it was selected before
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }
    });
}

/**
 * Clears all items from the canvas and resets the z-index counter.
 */
function clearCanvas() {
    const canvas = document.getElementById('canvas');
    canvas.innerHTML = '';
    resetZIndexCounter();
}

// --- INITIALIZATION ---

/**
 * Initializes all feature mockups and sets up their event listeners.
 */
export function initMockupFeatures() {
    const modal = document.getElementById('ai-modal');
    const closeBtn = modal.querySelector('.close-btn');
    const reinventBtn = document.getElementById('reinvent-again-btn');
    const exportBtn = document.getElementById('export-btn');
    const clearBtn = document.getElementById('clear-btn');

    closeBtn.addEventListener('click', closeAIModal);
    reinventBtn.addEventListener('click', populateAIModal);
    exportBtn.addEventListener('click', exportCanvas);
    clearBtn.addEventListener('click', clearCanvas);

    // Close modal if user clicks outside the content area
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeAIModal();
        }
    });
}

// Export the openAIModal function so it can be called from canvas_manager
export { openAIModal };
