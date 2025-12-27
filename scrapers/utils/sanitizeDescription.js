/**
 * Sanitizes event descriptions to remove junk text
 * Use this in all scrapers to ensure clean descriptions
 */

// Patterns that indicate bad/junk descriptions
const BAD_PATTERNS = [
  // Navigation and menu text
  /^(HOME|MENU|NAVIGATION|ABOUT|CONTACT|FAQ|HELP|SEARCH|LOGIN|SIGN)/i,
  /GUEST LIST|LOST & FOUND|STAFF\/JOBS|VENUE BUYOUTS|BAND SUBMISSION/i,
  /F\.A\.Q\.|BACK TO ALL EVENTS|UPCOMING EVENTS/i,
  
  // Cookie and privacy notices
  /We use cookies/i,
  /COOKIE POLICY|PRIVACY POLICY|TERMS OF SERVICE|ACCEPT ALL/i,
  
  // Website boilerplate
  /ALL RIGHTS RESERVED|COPYRIGHT|©/i,
  /Please note: Tickets to all performances/i,
  
  // Button and CTA text
  /^(BUY|PURCHASE|GET TICKETS|BOOK NOW|RSVP|REGISTER|SIGN UP|SUBSCRIBE)/i,
  /Buy Tickets \+|GOOGLE CALENDAR/i,
  
  // Social media
  /FOLLOW US|LIKE US|SHARE|FACEBOOK|TWITTER|INSTAGRAM|CONNECT WITH/i,
  
  // Form fields
  /Name\* First Last|EMAIL ADDRESS|FIRST NAME|LAST NAME|PHONE NUMBER|ENTER YOUR/i,
  /What Are You/i,
  
  // HTML and code
  /<[a-z]+>/i,
  /\{|\}/,
  /function\s|var\s|const\s|let\s/,
  /undefined|null|NaN|\[object/i,
  
  // Generic venue descriptions (not event-specific)
  /^The Horseshoe Tavern is located/i,
  /^Based in Toronto, the Canadian Opera/i,
  /^About The Apollo/i,
  /^The PWHL announced/i,
  /^Upfront \d{4} was/i,
  
  // Error and loading text
  /404|NOT FOUND|ERROR|OOPS|SOMETHING WENT WRONG/i,
  /^LOADING|PLEASE WAIT|FETCHING/i
];

// Minimum acceptable description length
const MIN_LENGTH = 30;

/**
 * Check if a description is valid/clean
 * @param {string} description - The description to check
 * @returns {boolean} - True if valid, false if junk
 */
function isValidDescription(description) {
  if (!description || typeof description !== 'string') {
    return false;
  }
  
  const trimmed = description.trim();
  
  // Check length
  if (trimmed.length < MIN_LENGTH) {
    return false;
  }
  
  // Check against bad patterns
  for (const pattern of BAD_PATTERNS) {
    if (pattern.test(trimmed)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Sanitize and clean a description, or generate a fallback
 * @param {string} description - The original description
 * @param {string} title - Event title (for fallback)
 * @param {string} venue - Venue name (for fallback)
 * @param {string} city - City name (for fallback)
 * @returns {string} - Clean description
 */
function sanitizeDescription(description, title, venue, city) {
  // If description is valid, clean and return it
  if (isValidDescription(description)) {
    // Remove any HTML tags
    let clean = description.replace(/<[^>]+>/g, '');
    // Remove excessive whitespace
    clean = clean.replace(/\s+/g, ' ').trim();
    // Truncate if too long
    if (clean.length > 500) {
      clean = clean.substring(0, 497) + '...';
    }
    return clean;
  }
  
  // Generate fallback description
  const venueName = venue || 'venue';
  const cityName = city || 'the city';
  const eventTitle = title || 'Event';
  
  return `${eventTitle} at ${venueName}, ${cityName}. Check the event page for more details and tickets.`;
}

/**
 * Extract a clean description from page content
 * Tries multiple sources: meta tags, structured data, first paragraphs
 * @param {object} page - Puppeteer page object
 * @returns {Promise<string|null>} - Extracted description or null
 */
async function extractDescription(page) {
  return await page.evaluate(() => {
    // Try meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && metaDesc.content && metaDesc.content.length > 50) {
      return metaDesc.content;
    }
    
    // Try og:description
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc && ogDesc.content && ogDesc.content.length > 50) {
      return ogDesc.content;
    }
    
    // Try structured data (JSON-LD)
    const jsonLd = document.querySelector('script[type="application/ld+json"]');
    if (jsonLd) {
      try {
        const data = JSON.parse(jsonLd.textContent);
        if (data.description && data.description.length > 50) {
          return data.description;
        }
      } catch (e) {}
    }
    
    // Try first substantial paragraph in event content
    const selectors = [
      '[class*="description"] p',
      '[class*="event"] p',
      '[class*="content"] p',
      'article p',
      '.event-details p',
      '.show-description',
      '.event-description'
    ];
    
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent && el.textContent.trim().length > 50) {
        return el.textContent.trim();
      }
    }
    
    return null;
  });
}

module.exports = {
  sanitizeDescription,
  isValidDescription,
  extractDescription,
  BAD_PATTERNS,
  MIN_LENGTH
};
