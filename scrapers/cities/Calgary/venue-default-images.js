/**
 * Calgary Venue Default Images
 */

const venueDefaultImages = {
  // Major Venues
  'Scotiabank Saddledome': 'https://picsum.photos/seed/saddledome/800/600',
  'McMahon Stadium': 'https://picsum.photos/seed/mcmahon/800/600',
  'WinSport': 'https://picsum.photos/seed/winsport/800/600',
  
  // Arts & Theatres
  'Arts Commons': 'https://picsum.photos/seed/artscommons/800/600',
  'Jubilee Auditorium': 'https://picsum.photos/seed/jubilee/800/600',
  'Theatre Calgary': 'https://picsum.photos/seed/theatrecalgary/800/600',
  'Alberta Theatre Projects': 'https://picsum.photos/seed/atp/800/600',
  
  // Music Venues
  'MacEwan Hall': 'https://picsum.photos/seed/macewan/800/600',
  'Commonwealth Bar': 'https://picsum.photos/seed/commonwealth/800/600',
  'Dickens Pub': 'https://picsum.photos/seed/dickens/800/600',
  'Broken City': 'https://picsum.photos/seed/brokencity/800/600',
  'Palomino': 'https://picsum.photos/seed/palomino/800/600',
  
  // Default
  'default': 'https://picsum.photos/seed/calgary/800/600'
};

function getVenueDefaultImage(venueName) {
  if (!venueName) return venueDefaultImages.default;
  
  if (venueDefaultImages[venueName]) {
    return venueDefaultImages[venueName];
  }
  
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
