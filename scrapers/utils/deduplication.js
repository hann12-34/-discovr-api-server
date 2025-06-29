/**
 * Event deduplication module for Discovr
 * Handles merging and deduplication of events from multiple sources
 */

const config = require('../config/config');
const helpers = require('./helpers');

/**
 * Compare two events to determine if they're duplicates
 * @param {Object} event1 - First event
 * @param {Object} event2 - Second event
 * @returns {Boolean} - Whether the events are duplicates
 */
function areEventsDuplicates(event1, event2) {
  // Check if titles are similar
  const titleMatch = compareTitles(event1.title, event2.title);
  if (!titleMatch) return false;
  
  // If titles match, check dates
  if (event1.startDate && event2.startDate) {
    const dateDifference = Math.abs(
      new Date(event1.startDate).getTime() - new Date(event2.startDate).getTime()
    );
    
    // If dates are more than 24 hours apart, not the same event
    if (dateDifference > 86400000) return false;
  }
  
  // If venue information is available, check venue
  if (event1.venue && event2.venue && 
      event1.venue.name && event2.venue.name) {
    return compareTitles(event1.venue.name, event2.venue.name);
  }
  
  // If we've gotten here, the title and dates match, so consider them duplicates
  return true;
}

/**
 * Compare two titles to determine if they're similar
 * Uses fuzzy matching to account for slight differences
 * @param {String} title1 - First title
 * @param {String} title2 - Second title
 * @returns {Boolean} - Whether the titles are similar
 */
function compareTitles(title1, title2) {
  if (!title1 || !title2) return false;
  
  // Normalize titles for comparison
  const normalizedTitle1 = title1.toLowerCase().trim();
  const normalizedTitle2 = title2.toLowerCase().trim();
  
  // Simple case: exact match
  if (normalizedTitle1 === normalizedTitle2) return true;
  
  // Check if one title is contained within the other
  if (normalizedTitle1.includes(normalizedTitle2) || 
      normalizedTitle2.includes(normalizedTitle1)) {
    return true;
  }
  
  // Check for similarity based on common words
  const words1 = normalizedTitle1.split(/\s+/);
  const words2 = normalizedTitle2.split(/\s+/);
  
  // If titles are very short, require more matching words
  const minMatchingWordsNeeded = Math.min(2, Math.floor(Math.min(words1.length, words2.length) / 2));
  
  let matchingWords = 0;
  for (const word1 of words1) {
    if (word1.length <= 3) continue; // Skip short words like "the", "and", etc.
    
    if (words2.includes(word1)) {
      matchingWords++;
    }
  }
  
  return matchingWords >= minMatchingWordsNeeded;
}

/**
 * Merge information from two duplicate events
 * @param {Object} event1 - First event (base event)
 * @param {Object} event2 - Second event (new event)
 * @returns {Object} - Merged event
 */
function mergeEvents(event1, event2) {
  // Create a copy of the base event
  const mergedEvent = { ...event1 };
  
  // Add second event's source to dataSources array
  if (!mergedEvent.dataSources) {
    mergedEvent.dataSources = []; 
  }
  
  // Ensure we don't duplicate the data source
  if (event2.dataSources && !mergedEvent.dataSources.includes(event2.dataSources[0])) {
    mergedEvent.dataSources = [...mergedEvent.dataSources, ...event2.dataSources];
  }
  
  // Merge specified fields, preferring non-empty values
  const mergeFields = config.deduplication.mergeFields;
  for (const field of mergeFields) {
    // Handle nested fields like venue.name
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (!mergedEvent[parent]) mergedEvent[parent] = {};
      
      // Prefer most detailed information
      if (!mergedEvent[parent][child] && event2[parent] && event2[parent][child]) {
        mergedEvent[parent][child] = event2[parent][child];
      }
    } else {
      // For top-level fields, prefer event1's value if it exists, otherwise use event2's
      if (!mergedEvent[field] && event2[field]) {
        mergedEvent[field] = event2[field];
      } else if (mergedEvent[field] && event2[field]) {
        // If both have a value, prefer the longer/more detailed one
        if (typeof mergedEvent[field] === 'string' && 
            event2[field].length > mergedEvent[field].length) {
          mergedEvent[field] = event2[field];
        }
      }
    }
  }
  
  // Always update lastUpdated to the most recent time
  mergedEvent.lastUpdated = new Date();
  
  return mergedEvent;
}

/**
 * Process a list of events to remove duplicates and merge information
 * @param {Array} events - List of events from all sources
 * @returns {Array} - Deduplicated events
 */
function deduplicateEvents(events) {
  // Early return if no events
  if (!events || events.length === 0) {
    return [];
  }
  
  // Create a map to store unique events
  const uniqueEvents = new Map();
  
  // First pass: organize events by deterministic ID
  for (const event of events) {
    const id = event.id || helpers.generateDeterministicId(event);
    
    if (uniqueEvents.has(id)) {
      // If event with this ID already exists, merge them
      uniqueEvents.set(id, mergeEvents(uniqueEvents.get(id), event));
    } else {
      uniqueEvents.set(id, event);
    }
  }
  
  // Second pass: check for duplicate events that might have different IDs
  const processedEvents = Array.from(uniqueEvents.values());
  const finalEvents = [];
  
  for (const event of processedEvents) {
    let isDuplicate = false;
    
    // Check if this event is a duplicate of any existing final event
    for (let i = 0; i < finalEvents.length; i++) {
      if (areEventsDuplicates(event, finalEvents[i])) {
        // Merge and update existing event
        finalEvents[i] = mergeEvents(finalEvents[i], event);
        isDuplicate = true;
        break;
      }
    }
    
    // Add event if it's not a duplicate
    if (!isDuplicate) {
      finalEvents.push(event);
    }
  }
  
  return finalEvents;
}

module.exports = {
  deduplicateEvents,
  mergeEvents,
  areEventsDuplicates
};
