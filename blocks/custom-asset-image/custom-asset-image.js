import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Custom Asset Image block
 * This block uses the Adobe Custom Asset Picker for enhanced asset selection
 * with configurable filters and options.
 * @param {Element} block - The block element
 */
export default async function decorate(block) {
  const rows = [...block.children];

  let imageElement = null;
  let altText = '';

  rows.forEach((row) => {
    const cell = row.children[0];
    const img = cell.querySelector('img');
    const textContent = cell.textContent.trim();

    if (img && img.src) {
      // Image from asset picker
      imageElement = img;
    } else if (textContent && !img) {
      // Alt text
      altText = textContent;
    }
  });

  // Clear the block
  block.innerHTML = '';

  // Create optimized picture if image exists
  if (imageElement) {
    const optimizedPicture = createOptimizedPicture(
      imageElement.src,
      altText || imageElement.alt || 'Image',
      false,
      [{ width: '750' }],
    );
    block.appendChild(optimizedPicture);
  }
}
