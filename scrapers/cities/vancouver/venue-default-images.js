/**
 * Vancouver Venue Default Images
 * Used when individual events don't have specific poster images
 * Replace URLs with your actual CDN/S3 images when ready
 */

const venueDefaultImages = {
  // Major Music Venues
  'Commodore Ballroom': 'https://picsum.photos/seed/commodore/800/600',
  'The Roxy': 'https://picsum.photos/seed/roxy/800/600',
  'Rogers Arena': 'https://picsum.photos/seed/rogers/800/600',
  'Vogue Theatre': 'https://picsum.photos/seed/vogue/800/600',
  'Orpheum': 'https://picsum.photos/seed/orpheum/800/600',
  'Orpheum Theatre': 'https://picsum.photos/seed/orpheum/800/600',
  'Queen Elizabeth Theatre': 'https://picsum.photos/seed/qet/800/600',
  'Fortune Sound Club': 'https://picsum.photos/seed/fortune/800/600',
  'Fox Cabaret': 'https://picsum.photos/seed/fox/800/600',
  'Rickshaw Theatre': 'https://picsum.photos/seed/rickshaw/800/600',
  'Biltmore Cabaret': 'https://picsum.photos/seed/biltmore/800/600',
  'The Wise Hall': 'https://picsum.photos/seed/wisehall/800/600',
  'The Imperial': 'https://picsum.photos/seed/imperial/800/600',
  'The Cobalt': 'https://picsum.photos/seed/cobalt/800/600',
  'Pat\'s Pub': 'https://picsum.photos/seed/pats/800/600',
  'Railway Stage': 'https://picsum.photos/seed/railway/800/600',
  'The Princeton': 'https://picsum.photos/seed/princeton/800/600',
  'The Backstage Lounge': 'https://picsum.photos/seed/backstage/800/600',
  'The Cultch': 'https://picsum.photos/seed/cultch/800/600',
  'The Rio Theatre': 'https://picsum.photos/seed/rio/800/600',
  
  // Sports & Large Venues
  'BC Place': 'https://picsum.photos/seed/bcplace/800/600',
  'Pacific Coliseum': 'https://picsum.photos/seed/coliseum/800/600',
  
  // Theatres & Arts
  'Chan Centre': 'https://picsum.photos/seed/chan/800/600',
  'Playhouse Theatre': 'https://picsum.photos/seed/playhouse/800/600',
  'Vancouver Playhouse': 'https://picsum.photos/seed/playhouse/800/600',
  'Arts Club Theatre': 'https://picsum.photos/seed/artsclub/800/600',
  'Gateway Theatre': 'https://picsum.photos/seed/gateway/800/600',
  'Studio 58': 'https://picsum.photos/seed/studio58/800/600',
  'Jericho Arts Centre': 'https://picsum.photos/seed/jericho/800/600',
  'Presentation House': 'https://picsum.photos/seed/presentationhouse/800/600',
  'Waterfront Theatre': 'https://picsum.photos/seed/waterfront/800/600',
  'Performance Works': 'https://picsum.photos/seed/perfworks/800/600',
  
  // Museums & Cultural
  'Vancouver Art Gallery': 'https://picsum.photos/seed/vag/800/600',
  'Science World': 'https://picsum.photos/seed/scienceworld/800/600',
  'Museum of Vancouver': 'https://picsum.photos/seed/mov/800/600',
  'Museum of Anthropology': 'https://picsum.photos/seed/moa/800/600',
  'Bill Reid Gallery': 'https://picsum.photos/seed/billreid/800/600',
  'Beaty Biodiversity Museum': 'https://picsum.photos/seed/beaty/800/600',
  
  // Festivals & Events
  'PNE': 'https://picsum.photos/seed/pne/800/600',
  'Vancouver Pride': 'https://picsum.photos/seed/pride/800/600',
  'Bard on the Beach': 'https://picsum.photos/seed/bard/800/600',
  
  // Comedy & Entertainment
  'The Comedy Mix': 'https://picsum.photos/seed/comedymix/800/600',
  'Yuk Yuks Vancouver': 'https://picsum.photos/seed/yukyuks/800/600',
  
  // Nightlife
  'Celebrities Nightclub': 'https://picsum.photos/seed/celebrities/800/600',
  'The Pumpjack Pub': 'https://picsum.photos/seed/pumpjack/800/600',
  'The Yale': 'https://picsum.photos/seed/yale/800/600',
  
  // Default fallback
  'default': 'https://picsum.photos/seed/vancouver/800/600'
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
