/**
 * Vancouver Venue Default Images
 * Used when individual events don't have specific poster images
 * Replace URLs with your actual CDN/S3 images when ready
 */

const venueDefaultImages = {
  // Major Music Venues
  'Commodore Ballroom': 'https://placehold.co/800x600/2563eb/white?text=Commodore+Ballroom',
  'The Roxy': 'https://placehold.co/800x600/dc2626/white?text=The+Roxy',
  'Rogers Arena': 'https://placehold.co/800x600/059669/white?text=Rogers+Arena',
  'Vogue Theatre': 'https://placehold.co/800x600/7c3aed/white?text=Vogue+Theatre',
  'Orpheum': 'https://placehold.co/800x600/b91c1c/white?text=Orpheum',
  'Queen Elizabeth Theatre': 'https://placehold.co/800x600/0284c7/white?text=Queen+Elizabeth+Theatre',
  'Fortune Sound Club': 'https://placehold.co/800x600/ea580c/white?text=Fortune+Sound+Club',
  'Fox Cabaret': 'https://placehold.co/800x600/16a34a/white?text=Fox+Cabaret',
  'Rickshaw Theatre': 'https://placehold.co/800x600/0891b2/white?text=Rickshaw+Theatre',
  'Biltmore Cabaret': 'https://placehold.co/800x600/be123c/white?text=Biltmore+Cabaret',
  
  // Sports & Large Venues
  'BC Place': 'https://placehold.co/800x600/1e40af/white?text=BC+Place',
  'Pacific Coliseum': 'https://placehold.co/800x600/7c2d12/white?text=Pacific+Coliseum',
  
  // Theatres & Arts
  'Chan Centre': 'https://placehold.co/800x600/4338ca/white?text=Chan+Centre',
  'Playhouse Theatre': 'https://placehold.co/800x600/be185d/white?text=Playhouse',
  'Arts Club Theatre': 'https://placehold.co/800x600/0369a1/white?text=Arts+Club+Theatre',
  'Gateway Theatre': 'https://placehold.co/800x600/7e22ce/white?text=Gateway+Theatre',
  
  // Museums & Cultural
  'Vancouver Art Gallery': 'https://placehold.co/800x600/0f766e/white?text=Vancouver+Art+Gallery',
  'Science World': 'https://placehold.co/800x600/c026d3/white?text=Science+World',
  'Museum of Vancouver': 'https://placehold.co/800x600/0369a1/white?text=Museum+of+Vancouver',
  'Museum of Anthropology': 'https://placehold.co/800x600/0891b2/white?text=Museum+of+Anthropology',
  
  // Festivals & Events
  'PNE': 'https://placehold.co/800x600/dc2626/white?text=PNE',
  'Vancouver Pride': 'https://placehold.co/800x600/db2777/white?text=Vancouver+Pride',
  
  // Default fallback
  'default': 'https://placehold.co/800x600/6b7280/white?text=Event+in+Vancouver'
};

/**
 * Get default image for a venue
 * @param {string} venueName - Name of the venue
 * @returns {string} - Default image URL
 */
function getVenueDefaultImage(venueName) {
  if (!venueName) return venueDefaultImages.default;
  
  // Try exact match
  if (venueDefaultImages[venueName]) {
    return venueDefaultImages[venueName];
  }
  
  // Try partial match
  const venueNameLower = venueName.toLowerCase();
  for (const [key, imageUrl] of Object.entries(venueDefaultImages)) {
    if (venueNameLower.includes(key.toLowerCase())) {
      return imageUrl;
    }
  }
  
  return venueDefaultImages.default;
}

module.exports = {
  venueDefaultImages,
  getVenueDefaultImage
};
