export function initMasterpiece() {
    const masterpieceBtn = document.getElementById('masterpiece-btn');
    const masterpiecePrompt = document.getElementById('masterpiece-prompt');
    const canvas = document.getElementById('canvas');
    const aiModal = document.getElementById('ai-modal');
    const aiResults = document.getElementById('ai-results');
    const closeModalBtn = aiModal.querySelector('.close-btn');
    const aiPromptInput = document.getElementById('ai-prompt');
    const autoReimagineBtn = document.getElementById('auto-reimagine-btn');

    if (!masterpieceBtn) return;

    masterpieceBtn.addEventListener('click', async () => {
        const prompt = masterpiecePrompt.value;
        if (!prompt) {
            alert('Please enter an instruction for the masterpiece.');
            return;
        }

        try {
            const canvasImage = await html2canvas(canvas).then(canvas => canvas.toDataURL('image/png'));

            // For now, let's reuse the existing AI modal.
            // This will be simpler than creating a new one.
            aiPromptInput.value = prompt; // Set the prompt in the modal

            // Show the modal and a loading state
            aiResults.innerHTML = '<div class="placeholder-text">Creating your masterpiece...</div>';
            aiModal.style.display = 'flex';

            // This is where the call to the backend would go.
            // I will reuse the same logic as the re-imagine feature.
            // Let's find that logic first.
            // Looking at the server.py, it seems there is a /reimagine endpoint.
            const response = await fetch('/reimagine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    image: canvasImage,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.image) {
                aiResults.innerHTML = `<img src="${data.image}" alt="Generated Masterpiece">`;

                // Add a "Use this image as base image" button
                let useAsBaseBtn = document.getElementById('use-as-base-btn');
                if (!useAsBaseBtn) {
                    useAsBaseBtn = document.createElement('button');
                    useAsBaseBtn.id = 'use-as-base-btn';
                    useAsBaseBtn.textContent = 'Use this image as base image';
                    aiResults.parentElement.appendChild(useAsBaseBtn);
                }

                useAsBaseBtn.style.display = 'block';
                useAsBaseBtn.onclick = () => {
                    // Clear canvas
                    canvas.innerHTML = '';
                    // Set as background
                    canvas.style.backgroundImage = `url(${data.image})`;
                    canvas.style.backgroundSize = 'cover';
                    canvas.style.backgroundPosition = 'center';

                    // Close modal
                    aiModal.style.display = 'none';
                    // remove the button after use
                    useAsBaseBtn.remove();
                };

            } else {
                aiResults.innerHTML = '<div class="placeholder-text">Failed to create masterpiece.</div>';
            }

        } catch (error) {
            console.error('Error creating masterpiece:', error);
            aiResults.innerHTML = `<div class="placeholder-text">Error: ${error.message}</div>`;
        }
    });

    closeModalBtn.addEventListener('click', () => {
        aiModal.style.display = 'none';
        let useAsBaseBtn = document.getElementById('use-as-base-btn');
        if(useAsBaseBtn) {
            useAsBaseBtn.style.display = 'none';
        }
    });
}