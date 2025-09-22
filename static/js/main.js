import { initAssetManager } from './asset_manager.js';
import { initCanvasManager } from './canvas_manager.js';
import { initMockupFeatures } from './feature_mockups.js';

document.addEventListener('DOMContentLoaded', () => {
    initAssetManager();
    initCanvasManager();
    initMockupFeatures();
});
