import { resetZIndexCounter } from './canvas_manager.js';

// --- "RE-IMAGINE WITH AI" MODAL ---

let aiTargetItem = null; // The canvas item that the AI feature is targeting
let newImageUrl = null; // URL of the generated image

/**
 * Resets the AI modal to its initial state.
 */
function resetAIModal() {
    document.getElementById('ai-prompt').value = '';
    const resultsContainer = document.getElementById('ai-results');
    resultsContainer.innerHTML = '<p class="placeholder-text">AI generations will appear here</p>';
    const acceptBtn = document.getElementById('accept-ai-btn');
    if (acceptBtn) {
        acceptBtn.remove(); // Remove button if it exists
    }
    newImageUrl = null;
}

/**
 * Handles the "Reimagine" button click.
 * Fetches a new image based on the prompt.
 */
async function handleReimagine() {
    const prompt = document.getElementById('ai-prompt').value;
    const resultsContainer = document.getElementById('ai-results');
    const reimagineBtn = document.getElementById('auto-reimagine-btn');

    if (!prompt) {
        alert("Please enter a prompt!");
        return;
    }

    if (!aiTargetItem) {
        alert("No item selected to reimagine!");
        return;
    }

    resultsContainer.innerHTML = '<p class="placeholder-text">Generating...</p>';
    reimagineBtn.disabled = true;

    try {
        const imageElement = aiTargetItem.querySelector('.canvas-item');
        const imageUrl = imageElement.src;

        // Fetch the image data from its source URL
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const blob = await response.blob();

        // Create a FormData object to send the file and prompt
        const formData = new FormData();
        // Use a generic filename; the server will handle it.
        // The mimetype is inferred from the blob, but we can be explicit.
        formData.append('file', blob, 'image_to_remix.png');
        formData.append('prompt', prompt);

        // Make the API call to our backend
        const remixResponse = await fetch('/remix', {
            method: 'POST',
            body: formData
        });

        if (!remixResponse.ok) {
            const errorData = await remixResponse.json().catch(() => ({ error: 'Unknown server error' }));
            throw new Error(`Server error: ${remixResponse.statusText} - ${errorData.error}`);
        }

        const newImageBlob = await remixResponse.blob();

        // Revoke the old URL if it exists to prevent memory leaks
        if (newImageUrl) {
            URL.revokeObjectURL(newImageUrl);
        }
        newImageUrl = URL.createObjectURL(newImageBlob);

        resultsContainer.innerHTML = `<img src="${newImageUrl}" alt="AI generated image">`;

        // Create and show the "Accept" button if it doesn't exist
        let acceptBtn = document.getElementById('accept-ai-btn');
        if (!acceptBtn) {
            acceptBtn = document.createElement('button');
            acceptBtn.id = 'accept-ai-btn';
            acceptBtn.textContent = 'Accept & Replace';
            acceptBtn.addEventListener('click', acceptAIImage);
            // Place it after the results container (which now holds the image)
            document.querySelector('.modal-content').appendChild(acceptBtn);
        }
        acceptBtn.style.display = 'block';

    } catch (error) {
        resultsContainer.innerHTML = '<p class="placeholder-text">Failed to generate image. Please try again.</p>';
        console.error("Error during reimagine:", error);
    } finally {
        reimagineBtn.disabled = false;
    }
}

/**
 * Replaces the target item's image with the newly generated one.
 */
function acceptAIImage() {
    if (aiTargetItem && newImageUrl) {
        aiTargetItem.querySelector('.canvas-item').src = newImageUrl;
        closeAIModal();
    }
}


/**
 * Opens the AI modal and sets the target item.
 * @param {HTMLElement} targetItem - The canvas item to be "reinvented".
 */
function openAIModal(targetItem) {
    aiTargetItem = targetItem;
    resetAIModal(); // Clear previous state
    const modal = document.getElementById('ai-modal');
    modal.style.display = 'flex';
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
 */
function exportCanvas() {
    const selectedItem = document.querySelector('.canvas-item-wrapper.selected');
    if (selectedItem) {
        selectedItem.classList.remove('selected');
    }

    html2canvas(document.getElementById('canvas'), {
        backgroundColor: null,
        useCORS: true
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'banana-canvas-export.png';
        link.href = canvas.toDataURL('image/png');
        link.click();

        if (selectedItem) {
            selectedItem.classList.add('selected');
        }
    });
}

/**
 * Clears all items from the canvas.
 */
function clearCanvas() {
    document.getElementById('canvas').innerHTML = '';
    resetZIndexCounter();
}

// --- INITIALIZATION ---

/**
 * Initializes all feature mockups and sets up their event listeners.
 */
export function initMockupFeatures() {
    const modal = document.getElementById('ai-modal');
    const closeBtn = modal.querySelector('.close-btn');
    const reimagineBtn = document.getElementById('auto-reimagine-btn');
    const exportBtn = document.getElementById('export-btn');
    const clearBtn = document.getElementById('clear-btn');

    closeBtn.addEventListener('click', closeAIModal);
    reimagineBtn.addEventListener('click', handleReimagine);
    exportBtn.addEventListener('click', exportCanvas);
    clearBtn.addEventListener('click', clearCanvas);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeAIModal();
        }
    });
}

export { openAIModal };
