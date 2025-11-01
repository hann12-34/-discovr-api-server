/**
 * Venue Database - Known venue addresses and coordinates
 * This enriches events with accurate location data
 */

const VENUE_DATABASE = {
  // Vancouver Venues
  'The Roxy': {
    address: '932 Granville St',
    city: 'Vancouver',
    province: 'BC',
    postalCode: 'V6Z 1L2',
    country: 'Canada',
    coordinates: [-123.1207, 49.2781] // [longitude, latitude] for MongoDB
  },
  'Fox Cabaret': {
    address: '2321 Main St',
    city: 'Vancouver',
    province: 'BC',
    postalCode: 'V5T 3C9',
    country: 'Canada',
    coordinates: [-123.1007, 49.2643]
  },
  'Celebrities Nightclub': {
    address: '1022 Davie St',
    city: 'Vancouver',
    province: 'BC',
    postalCode: 'V6E 1M3',
    country: 'Canada',
    coordinates: [-123.1294, 49.2778]
  },
  'Commodore Ballroom': {
    address: '868 Granville St',
    city: 'Vancouver',
    province: 'BC',
    postalCode: 'V6Z 1K3',
    country: 'Canada',
    coordinates: [-123.1214, 49.2794]
  },
  'Orpheum Theatre': {
    address: '601 Smithe St',
    city: 'Vancouver',
    province: 'BC',
    postalCode: 'V6B 5G1',
    country: 'Canada',
    coordinates: [-123.1206, 49.2817]
  },
  'Queen Elizabeth Theatre': {
    address: '630 Hamilton St',
    city: 'Vancouver',
    province: 'BC',
    postalCode: 'V6B 5N6',
    country: 'Canada',
    coordinates: [-123.1141, 49.2815]
  },
  'Vancouver Art Gallery': {
    address: '750 Hornby St',
    city: 'Vancouver',
    province: 'BC',
    postalCode: 'V6Z 2H7',
    country: 'Canada',
    coordinates: [-123.1207, 49.2830]
  },
  'Rogers Arena': {
    address: '800 Griffiths Way',
    city: 'Vancouver',
    province: 'BC',
    postalCode: 'V6B 6G1',
    country: 'Canada',
    coordinates: [-123.1089, 49.2778]
  },
  'BC Place': {
    address: '777 Pacific Blvd',
    city: 'Vancouver',
    province: 'BC',
    postalCode: 'V6B 4Y8',
    country: 'Canada',
    coordinates: [-123.1119, 49.2768]
  },
  'The Vogue Theatre': {
    address: '918 Granville St',
    city: 'Vancouver',
    province: 'BC',
    postalCode: 'V6Z 1L2',
    country: 'Canada',
    coordinates: [-123.1208, 49.2784]
  },
  'Science World': {
    address: '1455 Quebec St',
    city: 'Vancouver',
    province: 'BC',
    postalCode: 'V6A 3Z7',
    country: 'Canada',
    coordinates: [-123.1035, 49.2734]
  },
  'Stanley Park': {
    address: 'Stanley Park',
    city: 'Vancouver',
    province: 'BC',
    postalCode: 'V6G 1Z4',
    country: 'Canada',
    coordinates: [-123.1446, 49.3038]
  }
};

/**
 * Lookup venue information
 * @param {string} venueName - Name of the venue
 * @returns {object|null} Venue information or null if not found
 */
function lookupVenue(venueName) {
  if (!venueName) return null;
  
  // Try exact match
  if (VENUE_DATABASE[venueName]) {
    return VENUE_DATABASE[venueName];
  }
  
  // Try case-insensitive match
  const normalized = venueName.toLowerCase().trim();
  for (const [key, value] of Object.entries(VENUE_DATABASE)) {
    if (key.toLowerCase() === normalized) {
      return value;
    }
  }
  
  // Try partial match
  for (const [key, value] of Object.entries(VENUE_DATABASE)) {
    if (key.toLowerCase().includes(normalized) || normalized.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  return null;
}

/**
 * Enrich event with venue location data
 * @param {object} event - Event object
 * @returns {object} Enriched event object
 */
function enrichEventWithVenueData(event) {
  const venueName = event.venue?.name || event.venue;
  if (!venueName) return event;
  
  const venueInfo = lookupVenue(venueName);
  if (!venueInfo) return event;
  
  // Add location data
  return {
    ...event,
    streetAddress: venueInfo.address,
    location: `${venueInfo.address}, ${venueInfo.city}`,
    latitude: venueInfo.coordinates[1], // MongoDB stores [lon, lat], but latitude is [1]
    longitude: venueInfo.coordinates[0],
    venue: {
      ...event.venue,
      address: venueInfo.address,
      location: {
        type: 'Point',
        coordinates: venueInfo.coordinates
      }
    }
  };
}

/**
 * Get all known venues
 * @returns {Array} List of venue names
 */
function getKnownVenues() {
  return Object.keys(VENUE_DATABASE);
}

/**
 * Add a new venue to the database
 * @param {string} name - Venue name
 * @param {object} info - Venue information
 */
function addVenue(name, info) {
  VENUE_DATABASE[name] = info;
}

module.exports = {
  lookupVenue,
  enrichEventWithVenueData,
  getKnownVenues,
  addVenue,
  VENUE_DATABASE
};
