/**
 * ENHANCED DATA QUALITY FILTER SYSTEM
 * Comprehensive filtering and cleanup for scraped event data
 */

class DataQualityFilter {
  constructor() {
    // CSS and technical content patterns
    this.cssPatterns = [
      /\.(sto|fill|svg|path)\s*\{/i,
      /#[0-9a-f]{3,6}/i,          // CSS color codes
      /fill:\s*#/i,               // SVG fill properties
      /stroke:\s*#/i,             // SVG stroke properties
      /transform:\s*translate/i,   // SVG transforms
      /viewBox=/i,                // SVG viewBox
      /xmlns=/i,                  // XML namespaces
      /class="[^"]*"/i,           // Class attributes
      /id="[^"]*"/i,              // ID attributes
      /<\/?[a-z][^>]*>/i,         // HTML tags
      /\s*\{\s*\}\s*/             // Empty object literals
    ];

    // Navigation and UI junk patterns
    this.navigationPatterns = [
      /^(menu|nav|navigation)$/i,
      /^(home|about|contact)$/i,
      /^(login|logout|sign\s*in)$/i,
      /^(search|filter|sort)$/i,
      /^(previous|next|back)$/i,
      /^(›|→|»|\.\.\.)$/,
      /^(list\s*view|grid\s*view)$/i,
      /^(show\s*more|view\s*all)$/i,
      /^(get\s*directions?)$/i,
      /^(premium\s*experiences?)$/i,
      /^(host\s*your\s*event)$/i,
      /^(employee\s*login)$/i,
      /^(accessibility)$/i,
      /^(community\s*benefit)$/i,
      /^(terms|privacy|policy)$/i,
      /^(subscribe|newsletter)$/i,
      /^(faq|help|support)$/i
    ];

    // Technical/system content patterns
    this.technicalPatterns = [
      /^undefined$/i,
      /^null$/i,
      /^NaN$/i,
      /^[0-9]+$/,                 // Pure numbers
      /^[a-f0-9-]{36}$/i,         // UUIDs
      /^error|exception/i,
      /^loading|please\s*wait/i,
      /^(true|false)$/i,          // Boolean strings
      /^\s*$|^-+$|^\.*$/,         // Empty/whitespace/dashes/dots
      /^\[object\s+\w+\]$/i       // Object toString
    ];

    // Minimum quality thresholds
    this.minTitleLength = 3;
    this.maxTitleLength = 200;
  }

  // Main filtering function
  filterEvent(event) {
    if (!event || !event.title) return null;

    // Clean and validate title
    const cleanTitle = this.cleanTitle(event.title);
    if (!this.isValidTitle(cleanTitle)) return null;

    // Clean and validate venue
    const cleanVenue = this.cleanVenue(event.venue);
    if (!this.isValidVenue(cleanVenue)) return null;

    return {
      ...event,
      title: cleanTitle,
      venue: cleanVenue
    };
  }

  // Clean event title
  cleanTitle(title) {
    if (!title) return '';

    let cleaned = title.trim();

    // Remove HTML tags
    cleaned = cleaned.replace(/<[^>]*>/g, '');

    // Remove extra whitespace and normalize
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Remove common prefixes/suffixes
    cleaned = cleaned.replace(/^(event:?\s*)/i, '');
    cleaned = cleaned.replace(/(\s*›\s*)$/, '');
    cleaned = cleaned.replace(/(\s*→\s*)$/, '');

    // Truncate very long titles (keep first part)
    if (cleaned.length > this.maxTitleLength) {
      cleaned = cleaned.substring(0, this.maxTitleLength - 3) + '...';
    }

    return cleaned;
  }

  // Clean venue name
  cleanVenue(venue) {
    if (!venue) return '';
    // Handle both string and object venues
    if (typeof venue === 'object') {
      return venue; // Return object as-is
    }
    return venue.trim();
  }

  // Validate if title is acceptable
  isValidTitle(title) {
    if (!title || title.length < this.minTitleLength) return false;

    // Check against CSS patterns
    for (const pattern of this.cssPatterns) {
      if (pattern.test(title)) return false;
    }

    // Check against navigation patterns
    for (const pattern of this.navigationPatterns) {
      if (pattern.test(title)) return false;
    }

    // Check against technical patterns
    for (const pattern of this.technicalPatterns) {
      if (pattern.test(title)) return false;
    }

    return true;
  }

  // Validate venue
  isValidVenue(venue) {
    if (!venue) return false;
    // Handle both string and object venues
    if (typeof venue === 'object') {
      return venue.name && venue.name.length > 0;
    }
    return venue.length > 0 && venue !== 'undefined';
  }

  // Batch filter array of events
  filterEvents(events) {
    if (!Array.isArray(events)) return [];

    const filtered = events
      .map(event => this.filterEvent(event))
      .filter(event => event !== null);

    console.log(`🧹 Filtered: ${events.length} → ${filtered.length} events (removed ${events.length - filtered.length} low quality)`);
    
    return filtered;
  }
}

// Export for use in scrapers
module.exports = DataQualityFilter;

// Test the filter
if (require.main === module) {
  const filter = new DataQualityFilter();
  
  console.log('🧪 TESTING DATA QUALITY FILTER');
  console.log('==============================\n');

  const testEvents = [
    { title: '.sto { fill: #e023df }', venue: 'Ballet BC' },
    { title: 'Get Directions ›', venue: 'BC Place' },
    { title: 'Jonah Kagen Concert', venue: 'Horseshoe Tavern' },
    { title: 'Menu', venue: 'Some Venue' },
    { title: '', venue: 'Empty Title' },
    { title: 'undefined', venue: 'Technical' },
    { title: 'Real Event Name', venue: 'Real Venue' }
  ];

  const filtered = filter.filterEvents(testEvents);
  
  console.log('✅ RESULTS:');
  filtered.forEach((event, i) => {
    console.log(`${i + 1}. "${event.title}" at ${event.venue}`);
  });
}
