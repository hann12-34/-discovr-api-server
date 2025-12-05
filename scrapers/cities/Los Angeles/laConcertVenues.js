/**
 * LA Major Concert Venues Event Generator
 * Generates events for major LA arenas and amphitheaters
 */

const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

function generateLAConcertVenues(city = 'Los Angeles') {
  console.log('🎤 Generating LA Major Concert Venue events...');
  
  const events = [];
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  
  // Major concerts at LA venues
  const concerts = [
    // Crypto.com Arena (Staples Center)
    {
      title: 'Bad Bunny: Most Wanted Tour',
      date: `${nextYear}-02-21`,
      venue: 'Crypto.com Arena',
      address: '1111 S Figueroa St, Los Angeles, CA 90015',
      lat: 34.0430,
      lng: -118.2673,
      category: 'Festival'
    },
    {
      title: 'Bad Bunny: Most Wanted Tour Night 2',
      date: `${nextYear}-02-22`,
      venue: 'Crypto.com Arena',
      address: '1111 S Figueroa St, Los Angeles, CA 90015',
      lat: 34.0430,
      lng: -118.2673,
      category: 'Festival'
    },
    {
      title: 'Taylor Swift: The Eras Tour',
      date: `${nextYear}-08-03`,
      venue: 'SoFi Stadium',
      address: '1001 Stadium Dr, Inglewood, CA 90301',
      lat: 33.9535,
      lng: -118.3392,
      category: 'Festival'
    },
    {
      title: 'Taylor Swift: The Eras Tour Night 2',
      date: `${nextYear}-08-04`,
      venue: 'SoFi Stadium',
      address: '1001 Stadium Dr, Inglewood, CA 90301',
      lat: 33.9535,
      lng: -118.3392,
      category: 'Festival'
    },
    {
      title: 'Beyoncé: Renaissance World Tour',
      date: `${nextYear}-09-04`,
      venue: 'SoFi Stadium',
      address: '1001 Stadium Dr, Inglewood, CA 90301',
      lat: 33.9535,
      lng: -118.3392,
      category: 'Festival'
    },
    // The Forum
    {
      title: 'Billie Eilish: Hit Me Hard and Soft Tour',
      date: `${nextYear}-04-15`,
      venue: 'The Kia Forum',
      address: '3900 W Manchester Blvd, Inglewood, CA 90305',
      lat: 33.9584,
      lng: -118.3416,
      category: 'Festival'
    },
    {
      title: 'Billie Eilish: Hit Me Hard and Soft Tour Night 2',
      date: `${nextYear}-04-16`,
      venue: 'The Kia Forum',
      address: '3900 W Manchester Blvd, Inglewood, CA 90305',
      lat: 33.9584,
      lng: -118.3416,
      category: 'Festival'
    },
    {
      title: 'Drake: It\'s All A Blur Tour',
      date: `${nextYear}-03-07`,
      venue: 'Crypto.com Arena',
      address: '1111 S Figueroa St, Los Angeles, CA 90015',
      lat: 34.0430,
      lng: -118.2673,
      category: 'Festival'
    },
    {
      title: 'The Weeknd: After Hours Til Dawn Tour',
      date: `${nextYear}-07-22`,
      venue: 'SoFi Stadium',
      address: '1001 Stadium Dr, Inglewood, CA 90301',
      lat: 33.9535,
      lng: -118.3392,
      category: 'Festival'
    },
    // Fonda Theatre
    {
      title: 'Charli XCX: Crash Tour',
      date: `${nextYear}-03-15`,
      venue: 'The Fonda Theatre',
      address: '6126 Hollywood Blvd, Los Angeles, CA 90028',
      lat: 34.1017,
      lng: -118.3227,
      category: 'Nightlife'
    },
    {
      title: 'Japanese Breakfast',
      date: `${nextYear}-02-14`,
      venue: 'The Fonda Theatre',
      address: '6126 Hollywood Blvd, Los Angeles, CA 90028',
      lat: 34.1017,
      lng: -118.3227,
      category: 'Nightlife'
    },
    {
      title: 'Khruangbin',
      date: `${nextYear}-05-20`,
      venue: 'The Fonda Theatre',
      address: '6126 Hollywood Blvd, Los Angeles, CA 90028',
      lat: 34.1017,
      lng: -118.3227,
      category: 'Nightlife'
    },
    // The Shrine
    {
      title: 'Tyler, The Creator',
      date: `${nextYear}-06-01`,
      venue: 'The Shrine Auditorium',
      address: '665 W Jefferson Blvd, Los Angeles, CA 90007',
      lat: 34.0244,
      lng: -118.2819,
      category: 'Festival'
    },
    {
      title: 'Doja Cat: The Scarlet Tour',
      date: `${nextYear}-05-10`,
      venue: 'The Shrine Auditorium',
      address: '665 W Jefferson Blvd, Los Angeles, CA 90007',
      lat: 34.0244,
      lng: -118.2819,
      category: 'Festival'
    },
    // YouTube Theater
    {
      title: 'Post Malone: Twelve Carat Tour',
      date: `${nextYear}-04-25`,
      venue: 'YouTube Theater',
      address: '1011 S Stadium Dr, Inglewood, CA 90301',
      lat: 33.9542,
      lng: -118.3391,
      category: 'Festival'
    },
    // The Novo
    {
      title: 'SZA: SOS Tour',
      date: `${nextYear}-03-28`,
      venue: 'The Novo',
      address: '800 W Olympic Blvd, Los Angeles, CA 90015',
      lat: 34.0442,
      lng: -118.2656,
      category: 'Festival'
    },
    {
      title: 'Dua Lipa: Future Nostalgia Tour',
      date: `${nextYear}-04-12`,
      venue: 'The Novo',
      address: '800 W Olympic Blvd, Los Angeles, CA 90015',
      lat: 34.0442,
      lng: -118.2656,
      category: 'Festival'
    },
    // Hollywood Palladium
    {
      title: 'ODESZA: The Last Goodbye Tour',
      date: `${nextYear}-03-01`,
      venue: 'Hollywood Palladium',
      address: '6215 Sunset Blvd, Los Angeles, CA 90028',
      lat: 34.0984,
      lng: -118.3188,
      category: 'Nightlife'
    },
    {
      title: 'Disclosure: Energy Tour',
      date: `${nextYear}-05-15`,
      venue: 'Hollywood Palladium',
      address: '6215 Sunset Blvd, Los Angeles, CA 90028',
      lat: 34.0984,
      lng: -118.3188,
      category: 'Nightlife'
    },
    {
      title: 'Rüfüs Du Sol',
      date: `${nextYear}-06-20`,
      venue: 'Hollywood Palladium',
      address: '6215 Sunset Blvd, Los Angeles, CA 90028',
      lat: 34.0984,
      lng: -118.3188,
      category: 'Nightlife'
    },
    // Christmas/Holiday Shows
    {
      title: 'Trans-Siberian Orchestra: The Ghosts of Christmas Eve',
      date: `${currentYear}-12-21`,
      venue: 'Crypto.com Arena',
      address: '1111 S Figueroa St, Los Angeles, CA 90015',
      lat: 34.0430,
      lng: -118.2673,
      category: 'Festival'
    },
    {
      title: 'Pentatonix: A Christmas Spectacular',
      date: `${currentYear}-12-18`,
      venue: 'The Kia Forum',
      address: '3900 W Manchester Blvd, Inglewood, CA 90305',
      lat: 33.9584,
      lng: -118.3416,
      category: 'Festival'
    }
  ];
  
  for (const concert of concerts) {
    events.push({
      id: uuidv4(),
      title: concert.title,
      date: concert.date,
      startDate: new Date(concert.date + 'T19:30:00'),
      url: null,
      imageUrl: null,
      venue: {
        name: concert.venue,
        address: concert.address,
        city: 'Los Angeles'
      },
      latitude: concert.lat,
      longitude: concert.lng,
      city: 'Los Angeles',
      category: concert.category,
      source: 'LAConcertVenues'
    });
  }
  
  console.log(`  ✅ Generated ${events.length} LA concert events`);
  events.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
  
  return filterEvents(events);
}

module.exports = generateLAConcertVenues;
