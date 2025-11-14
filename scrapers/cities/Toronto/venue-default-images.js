/**
 * Toronto Venue Default Images
 * Used when individual events don't have specific poster images
 */

const venueDefaultImages = {
  // Major Music Venues
  'Bovine Sex Club': 'https://picsum.photos/seed/bovine/800/600',
  'The Danforth Music Hall': 'https://picsum.photos/seed/danforth/800/600',
  "Lee's Palace": 'https://picsum.photos/seed/lees/800/600',
  'The Horseshoe Tavern': 'https://picsum.photos/seed/horseshoe/800/600',
  'The Opera House': 'https://picsum.photos/seed/opera/800/600',
  'The Phoenix Concert Theatre': 'https://picsum.photos/seed/phoenix/800/600',
  'History': 'https://picsum.photos/seed/history/800/600',
  'Adelaide Hall': 'https://picsum.photos/seed/adelaide/800/600',
  'The Rec Room': 'https://picsum.photos/seed/recroomto/800/600',
  'The Cameron House': 'https://picsum.photos/seed/cameron/800/600',
  'The Drake Hotel': 'https://picsum.photos/seed/drake/800/600',
  'Sneaky Dees': 'https://picsum.photos/seed/sneakydees/800/600',
  'The Rivoli': 'https://picsum.photos/seed/rivoli/800/600',
  
  // Major Venues & Arenas
  'Scotiabank Arena': 'https://picsum.photos/seed/scotiabank/800/600',
  'Rogers Centre': 'https://picsum.photos/seed/rogers/800/600',
  'Budweiser Stage': 'https://picsum.photos/seed/budweiser/800/600',
  'BMO Field': 'https://picsum.photos/seed/bmofield/800/600',
  'Massey Hall': 'https://picsum.photos/seed/masseyhall/800/600',
  'Roy Thomson Hall': 'https://picsum.photos/seed/roythomson/800/600',
  
  // Theatres
  'Princess of Wales Theatre': 'https://picsum.photos/seed/princess/800/600',
  'Royal Alexandra Theatre': 'https://picsum.photos/seed/royalalex/800/600',
  'Ed Mirvish Theatre': 'https://picsum.photos/seed/mirvish/800/600',
  'Elgin Theatre': 'https://picsum.photos/seed/elgin/800/600',
  'Winter Garden Theatre': 'https://picsum.photos/seed/wintergarden/800/600',
  'Panasonic Theatre': 'https://picsum.photos/seed/panasonic/800/600',
  'Meridian Hall': 'https://picsum.photos/seed/meridian/800/600',
  'Four Seasons Centre': 'https://picsum.photos/seed/fourseasons/800/600',
  'Toronto Centre for the Arts': 'https://picsum.photos/seed/tcfta/800/600',
  'Crow\'s Theatre': 'https://picsum.photos/seed/crows/800/600',
  'Factory Theatre': 'https://picsum.photos/seed/factory/800/600',
  'Tarragon Theatre': 'https://picsum.photos/seed/tarragon/800/600',
  
  // Comedy Clubs
  'Yuk Yuks': 'https://picsum.photos/seed/yukyuks/800/600',
  'Second City Toronto': 'https://picsum.photos/seed/secondcity/800/600',
  'Comedy Bar': 'https://picsum.photos/seed/comedybar/800/600',
  'Absolute Comedy': 'https://picsum.photos/seed/absolutecomedy/800/600',
  
  // Museums & Cultural
  'Royal Ontario Museum': 'https://picsum.photos/seed/rom/800/600',
  'Art Gallery of Ontario': 'https://picsum.photos/seed/ago/800/600',
  'Ontario Science Centre': 'https://picsum.photos/seed/sciencecentre/800/600',
  'Casa Loma': 'https://picsum.photos/seed/casaloma/800/600',
  'Harbourfront Centre': 'https://picsum.photos/seed/harbourfront/800/600',
  
  // Nightlife
  'Rebel': 'https://picsum.photos/seed/rebel/800/600',
  'Coda': 'https://picsum.photos/seed/coda/800/600',
  'Nest': 'https://picsum.photos/seed/nest/800/600',
  'Uniun': 'https://picsum.photos/seed/uniun/800/600',
  'The Hideout': 'https://picsum.photos/seed/hideout/800/600',
  'The Velvet Underground': 'https://picsum.photos/seed/velvet/800/600',
  
  // Default fallback
  'default': 'https://picsum.photos/seed/toronto/800/600'
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
