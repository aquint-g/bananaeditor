export function initMasterpiece() {
    const masterpieceBtn = document.getElementById('masterpiece-btn');
    const masterpiecePrompt = document.getElementById('masterpiece-prompt');
    const canvas = document.getElementById('canvas');
    const masterpieceModal = document.getElementById('masterpiece-modal');
    const masterpieceResults = document.getElementById('masterpiece-results');
    const closeModalBtn = masterpieceModal.querySelector('.close-btn');

    if (!masterpieceBtn) return;

    masterpieceBtn.addEventListener('click', async () => {
        const prompt = masterpiecePrompt.value;
        if (!prompt) {
            alert('Please enter an instruction for the masterpiece.');
            return;
        }

        try {
            const canvasImage = await html2canvas(canvas).then(canvas => canvas.toDataURL('image/png'));

            // Show the modal and a loading state
            masterpieceResults.innerHTML = '<div class="placeholder-text">Creating your masterpiece...</div>';
            masterpieceModal.style.display = 'flex';

            const blob = await (await fetch(canvasImage)).blob();
            const formData = new FormData();
            formData.append('file', blob, 'canvas.png');
            formData.append('prompt', prompt);

            const response = await fetch('/masterpiece', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const imageBlob = await response.blob();
            const imageUrl = URL.createObjectURL(imageBlob);

            masterpieceResults.innerHTML = `<img src="${imageUrl}" alt="Generated Masterpiece">`;

            // Add a "Use this image as base image" button
            let useAsBaseBtn = document.getElementById('use-as-base-btn');
            if (!useAsBaseBtn) {
                useAsBaseBtn = document.createElement('button');
                useAsBaseBtn.id = 'use-as-base-btn';
                useAsBaseBtn.textContent = 'Use this image as base image';
                masterpieceResults.parentElement.appendChild(useAsBaseBtn);
            }

            useAsBaseBtn.style.display = 'block';
            useAsBaseBtn.onclick = () => {
                // Clear canvas
                canvas.innerHTML = '';
                // Set as background
                canvas.style.backgroundImage = `url(${imageUrl})`;
                canvas.style.backgroundSize = 'cover';
                canvas.style.backgroundPosition = 'center';

                // Close modal
                masterpieceModal.style.display = 'none';
                // remove the button after use
                useAsBaseBtn.remove();
            };

        } catch (error) {
            console.error('Error creating masterpiece:', error);
            masterpieceResults.innerHTML = `<div class="placeholder-text">Error: ${error.message}</div>`;
        }
    });

    closeModalBtn.addEventListener('click', () => {
        masterpieceModal.style.display = 'none';
        let useAsBaseBtn = document.getElementById('use-as-base-btn');
        if(useAsBaseBtn) {
            useAsBaseBtn.style.display = 'none';
        }
    });
}