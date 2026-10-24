/**
 * Image Tool Handler
 */

import { createImageObject } from '../documents/schema.js';
import { history, AddObjectCommand } from '../app/commands.js';
import { state } from '../app/state.js';
import { saveAssetToDB } from '../storage/database.js';
import { showToast } from '../app/notifications.js';

export class ImageTool {
  constructor(toolManager) {
    this.toolManager = toolManager;
  }

  onPointerDown(e, worldPos) {
    this.triggerImageUpload(worldPos);
  }

  onPointerMove() {}
  onPointerUp() {}
  onPointerCancel() {}

  triggerImageUpload(targetPos = { x: 100, y: 100 }) {
    const fileInput = document.getElementById('image-file-input');
    if (!fileInput) return;

    fileInput.value = '';
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        this.processImageFile(file, targetPos);
      }
    };
    fileInput.click();
  }

  processImageFile(file, targetPos) {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      const assetId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      try {
        await saveAssetToDB(assetId, dataUrl);

        const img = new Image();
        img.onload = () => {
          let width = img.naturalWidth || 300;
          let height = img.naturalHeight || 200;

          // Scale down if oversized
          const maxDim = 500;
          if (width > maxDim || height > maxDim) {
            const aspect = width / height;
            if (width > height) {
              width = maxDim;
              height = maxDim / aspect;
            } else {
              height = maxDim;
              width = maxDim * aspect;
            }
          }

          const imageObj = createImageObject(assetId, targetPos.x, targetPos.y, width, height);
          const page = state.getActivePage();
          if (page) {
            const cmd = new AddObjectCommand(page, imageObj);
            history.execute(cmd);
            state.setSelectedObjectIds([imageObj.id]);
          }
          showToast('Image inserted successfully', 'success');
        };
        img.src = dataUrl;
      } catch (err) {
        console.error('Failed to save image asset:', err);
        showToast('Failed to save image asset', 'error');
      }
    };
    reader.readAsDataURL(file);
  }
}
