/**
 * Art Gallery Data Adapter
 * 
 * Transforms scraped art gallery events into the standardized SeasonalActivity format
 * used by the Discovr API and mobile app.
 */

// Try to require uuid, but provide a fallback if it's not installed
let uuidv4;
try {
  const uuid = require('uuid');
  uuidv4 = uuid.v4;
} catch (error) {
  // Simple fallback implementation if uuid module is missing
  console.warn('Warning: uuid module not found, using fallback implementation');
  uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
}

/**
 * Transforms raw scraped art gallery data into the Discovr API's standardized format
 * 
 * @param {Array} scrapedEvents - Raw events from art gallery scrapers
 * @param {Object} options - Additional options for transformation
 * @returns {Array} - Standardized events in SeasonalActivity format
 */
function transformArtGalleryEvents(scrapedEvents, options = {}) {
  if (!Array.isArray(scrapedEvents)) {
    throw new Error('Expected array of events');
  }
  
  // Default options
  const defaults = {
    addDefaults: true,
    assignIds: true,
    categorize: true,
    setCurrentStatus: true,
    determineSeason: true
  };
  
  const settings = { ...defaults, ...options };
  
  return scrapedEvents.map(event => {
    // Base conversion - map field names appropriately
    const baseActivity = {
      name: event.name,
      description: event.description || `Art exhibition at ${event.venue?.name || 'local gallery'}`,
      location: event.venue?.name || 'Art Gallery',
      type: determineEventType(event),
      imageURL: event.imageUrl || null,
      url: event.url || null,
      address: buildAddressString(event.venue),
      price: determinePricing(event)
    };
    
    // Handle dates and convert to standard format
    if (event.startDate) {
      baseActivity.startDate = new Date(event.startDate);
    }
    
    if (event.endDate) {
      baseActivity.endDate = new Date(event.endDate);
    }
    
    // Apply optional transformations
    const transformedActivity = applyTransformations(baseActivity, settings);
    
    return transformedActivity;
  });
}

/**
 * Determine the specific type of art event
 */
function determineEventType(event) {
  // Default type
  let type = 'artExhibition';
  
  // Keywords to identify specific art event types
  const typeKeywords = {
    workshop: ['workshop', 'class', 'hands-on'],
    opening: ['opening', 'reception', 'preview'],
    lecture: ['lecture', 'talk', 'artist talk', 'presentation', 'discussion'],
    photography: ['photo', 'photography', 'photograph'],
    sculpture: ['sculpture', 'ceramic', '3d art'],
    painting: ['painting', 'canvas', 'oil on'],
    digital: ['digital', 'media art', 'video', 'installation'],
    performance: ['performance art', 'live art']
  };
  
  // Check if event details match any specific type
  const eventText = `${event.name} ${event.description || ''}`.toLowerCase();
  
  for (const [specificType, keywords] of Object.entries(typeKeywords)) {
    if (keywords.some(keyword => eventText.includes(keyword))) {
      type = specificType;
      break;
    }
  }
  
  return type;
}

/**
 * Build a formatted address string
 */
function buildAddressString(venue) {
  if (!venue) return '';
  
  const addressParts = [];
  
  if (venue.address) addressParts.push(venue.address);
  if (venue.city) {
    const cityProvParts = [venue.city];
    if (venue.province) cityProvParts.push(venue.province);
    addressParts.push(cityProvParts.join(', '));
  }
  if (venue.postalCode) addressParts.push(venue.postalCode);
  
  return addressParts.join(' ');
}

/**
 * Determine pricing based on event info
 */
function determinePricing(event) {
  // Default pricing
  let pricing = 'Admission varies';
  
  if (event.price) {
    pricing = event.price;
  } else {
    // Look for free admission keywords
    const eventText = `${event.name} ${event.description || ''}`.toLowerCase();
    if (eventText.includes('free') || 
        eventText.includes('no admission') || 
        eventText.includes('no charge')) {
      pricing = 'Free';
    }
  }
  
  return pricing;
}

/**
 * Apply all optional transformations based on settings
 */
function applyTransformations(activity, settings) {
  let transformed = { ...activity };
  
  // Add default values if missing
  if (settings.addDefaults) {
    transformed = addDefaultValues(transformed);
  }
  
  // Assign unique IDs
  if (settings.assignIds) {
    transformed.id = uuidv4();
  }
  
  // Categorize the event
  if (settings.categorize) {
    transformed.category = determineCategory(transformed);
  }
  
  // Set current status based on dates
  if (settings.setCurrentStatus) {
    transformed.currentStatus = determineStatus(transformed);
  }
  
  // Determine the season
  if (settings.determineSeason) {
    transformed.season = determineSeason(transformed);
  }
  
  return transformed;
}

/**
 * Add default values for missing fields
 */
function addDefaultValues(activity) {
  return {
    // Default image if none provided
    imageURL: activity.imageURL || 'https://via.placeholder.com/400x300?text=Art+Exhibition',
    
    // Type defaults to art exhibition
    type: activity.type || 'artExhibition',
    
    // Other defaults
    isSaved: false,
    rating: 0,
    ratingCount: 0,
    
    ...activity
  };
}

/**
 * Determine the appropriate category for the event
 */
function determineCategory(activity) {
  // Art exhibitions go under Arts & Culture category
  return 'artsCulture';
}

/**
 * Determine current status based on dates
 */
function determineStatus(activity) {
  const now = new Date();
  
  // If no dates provided, assume it's active
  if (!activity.startDate && !activity.endDate) {
    return 'active';
  }
  
  if (activity.startDate && activity.startDate > now) {
    return 'upcoming';
  }
  
  if (activity.endDate && activity.endDate < now) {
    return 'ended';
  }
  
  return 'active';
}

/**
 * Determine season based on dates
 */
function determineSeason(activity) {
  // Default to all year if no dates provided
  if (!activity.startDate) {
    return 'allYear';
  }
  
  const month = activity.startDate.getMonth();
  
  // Determine season based on Northern Hemisphere seasons
  if (month >= 2 && month <= 4) {
    return 'spring';
  } else if (month >= 5 && month <= 7) {
    return 'summer';
  } else if (month >= 8 && month <= 10) {
    return 'fall';
  } else {
    return 'winter';
  }
}

module.exports = {
  transformArtGalleryEvents
};
