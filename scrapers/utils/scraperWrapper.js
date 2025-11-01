/**
 * Universal Scraper Wrapper
 * Automatically cleans and enhances output from ALL scrapers
 * Ensures no junk events, all have descriptions, proper venue data
 */

const { filterEvents } = require('./eventFilter');

/**
 * Wrap any scraper to automatically clean its output
 */
function wrapScraper(scraperFunction, scraperName) {
  return async function(...args) {
    try {
      // Call the original scraper
      const events = await scraperFunction(...args);
      
      if (!events || !Array.isArray(events) || events.length === 0) {
        return [];
      }
      
      // Clean and enhance each event
      const cleanedEvents = events.map(event => {
        const title = event.title || event.name || '';
        const source = event.source || scraperName || 'Vancouver';
        const venueName = event.venue?.name || event.venue || source;
        
        // Skip if title is junk
        const junkTitles = /^(shows?|events?|calendar|menu|tickets?|info|view|see|browse|buy|get|learn more|home|about|contact)$/i;
        if (junkTitles.test(title) || title.length < 3) {
          return null;
        }
        
        // Create venue-specific description if missing
        let description = event.description;
        if (!description || description.length < 20 || description.includes('Event details available')) {
          // Venue-specific context
          const venueContexts = {
            'Fox Cabaret': "one of Vancouver's premier live music venues",
            'Rogers Arena': "Vancouver's major arena for concerts and sports",
            'Commodore Ballroom': "Vancouver's iconic music venue since 1929",
            'Fortune Sound Club': "Vancouver's premier nightclub and electronic music venue",
            'Orpheum Theatre': "Vancouver's historic performing arts venue",
            'Malkin Bowl': "Vancouver's iconic outdoor concert venue in Stanley Park",
            'The Roxy': "Vancouver's legendary rock club",
            'Celebrities Nightclub': "Vancouver's largest nightclub"
          };
          
          const context = venueContexts[venueName] || 'in Vancouver';
          description = `${title} at ${venueName}, ${context}.`;
        }
        
        // Ensure proper venue structure
        const venue = typeof event.venue === 'string' 
          ? { name: event.venue, city: 'Vancouver' }
          : { name: venueName, city: 'Vancouver', ...event.venue };
        
        return {
          ...event,
          title: title,
          description: description,
          venue: venue,
          source: source,
          city: event.city || 'Vancouver'
        };
      }).filter(e => e !== null);
      
      // Apply filterEvents to remove any remaining junk
      const filtered = filterEvents(cleanedEvents);
      
      console.log(`🧹 ${scraperName}: ${events.length} → ${filtered.length} events (removed ${events.length - filtered.length} junk)`);
      
      return filtered;
      
    } catch (error) {
      console.error(`❌ Error in wrapped scraper ${scraperName}:`, error.message);
      return [];
    }
  };
}

module.exports = { wrapScraper };
