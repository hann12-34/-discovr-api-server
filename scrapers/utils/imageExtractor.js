/**
 * Universal Image Extraction Utility
 * Provides consistent image extraction across all scrapers
 */

/**
 * Extract image URL from a Cheerio element (for axios/cheerio scrapers)
 * @param {CheerioElement} $element - Cheerio wrapped element
 * @param {string} baseUrl - Base URL for resolving relative paths
 * @returns {string|null} - Image URL or null
 */
function extractImageFromCheerio($element, baseUrl = '') {
  if (!$element || typeof $element.find !== 'function') return null;
  
  // Try multiple image selectors
  const img = $element.find('img, [style*="background-image"]').first();
  
  if (img.length === 0) return null;
  
  let imageUrl = null;
  
  // Try different attributes
  if (img.is('img')) {
    imageUrl = img.attr('src') || 
               img.attr('data-src') || 
               img.attr('data-lazy-src') ||
               img.attr('data-original') ||
               img.attr('srcset')?.split(',')[0]?.split(' ')[0];
  } else {
    // Extract from background-image style
    const style = img.attr('style');
    const match = style?.match(/background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/);
    if (match) imageUrl = match[1];
  }
  
  if (!imageUrl) return null;
  
  // Make absolute URL if relative
  if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
    if (imageUrl.startsWith('//')) {
      imageUrl = 'https:' + imageUrl;
    } else if (imageUrl.startsWith('/')) {
      imageUrl = baseUrl + imageUrl;
    } else {
      imageUrl = baseUrl + '/' + imageUrl;
    }
  }
  
  // Filter out tiny/placeholder images
  if (imageUrl && (
    imageUrl.includes('1x1') || 
    imageUrl.includes('placeholder') ||
    imageUrl.includes('spinner') ||
    imageUrl.includes('loading')
  )) {
    return null;
  }
  
  return imageUrl;
}

/**
 * Extract image URL from DOM (for Puppeteer scrapers)
 * Call this inside page.evaluate()
 * @param {Element} element - DOM element
 * @returns {string} - Image URL (empty string if not found)
 */
function extractImageFromDOM(element) {
  if (!element) return '';
  
  // Try to find image element
  const img = element.querySelector('img, [style*="background-image"]');
  if (!img) return '';
  
  let imageUrl = '';
  
  if (img.tagName === 'IMG') {
    imageUrl = img.src || 
               img.getAttribute('data-src') || 
               img.getAttribute('data-lazy-src') ||
               img.getAttribute('data-original') ||
               (img.srcset ? img.srcset.split(',')[0].split(' ')[0] : '');
  } else {
    // Extract from background-image
    const style = img.getAttribute('style') || '';
    const match = style.match(/background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/);
    if (match) imageUrl = match[1];
  }
  
  // Filter out placeholders
  if (imageUrl && (
    imageUrl.includes('1x1') || 
    imageUrl.includes('placeholder') ||
    imageUrl.includes('spinner') ||
    imageUrl.includes('loading')
  )) {
    return '';
  }
  
  return imageUrl;
}

/**
 * Extract image from Schema.org JSON-LD
 * @param {Object} schemaData - Parsed Schema.org Event object
 * @returns {string|null} - Image URL or null
 */
function extractImageFromSchema(schemaData) {
  if (!schemaData) return null;
  
  let image = schemaData.image;
  
  // Handle different Schema.org image formats
  if (typeof image === 'string') {
    return image;
  } else if (Array.isArray(image)) {
    return image[0];
  } else if (image && typeof image === 'object') {
    return image.url || image['@id'] || null;
  }
  
  return null;
}

module.exports = {
  extractImageFromCheerio,
  extractImageFromDOM,
  extractImageFromSchema
};
