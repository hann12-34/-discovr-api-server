/**
 * LA Festivals & Major Events Generator
 * Generates major LA festivals and outdoor events
 */

const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

function generateLAFestivals(city = 'Los Angeles') {
  console.log('🎪 Generating LA Festivals and major events...');
  
  const events = [];
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  
  // Major LA Festivals and Events
  const festivals = [
    // Music Festivals
    {
      title: 'Coachella Valley Music and Arts Festival - Weekend 1',
      date: `${nextYear}-04-11`,
      endDate: `${nextYear}-04-13`,
      venue: 'Empire Polo Club',
      address: '81-800 Ave 51, Indio, CA 92201',
      lat: 33.6803,
      lng: -116.2373,
      category: 'Festival'
    },
    {
      title: 'Coachella Valley Music and Arts Festival - Weekend 2',
      date: `${nextYear}-04-18`,
      endDate: `${nextYear}-04-20`,
      venue: 'Empire Polo Club',
      address: '81-800 Ave 51, Indio, CA 92201',
      lat: 33.6803,
      lng: -116.2373,
      category: 'Festival'
    },
    {
      title: 'Stagecoach Country Music Festival',
      date: `${nextYear}-04-25`,
      endDate: `${nextYear}-04-27`,
      venue: 'Empire Polo Club',
      address: '81-800 Ave 51, Indio, CA 92201',
      lat: 33.6803,
      lng: -116.2373,
      category: 'Festival'
    },
    {
      title: 'Hard Summer Music Festival',
      date: `${nextYear}-08-02`,
      endDate: `${nextYear}-08-03`,
      venue: 'Hollywood Park',
      address: '3883 W Century Blvd, Inglewood, CA 90303',
      lat: 33.9535,
      lng: -118.3392,
      category: 'Festival'
    },
    // Day N Vegas removed - it's in Las Vegas, not LA
    {
      title: 'Rolling Loud LA',
      date: `${nextYear}-03-14`,
      endDate: `${nextYear}-03-16`,
      venue: 'Hollywood Park',
      address: '3883 W Century Blvd, Inglewood, CA 90303',
      lat: 33.9535,
      lng: -118.3392,
      category: 'Festival'
    },
    {
      title: 'This Ain\'t No Picnic Festival',
      date: `${nextYear}-08-23`,
      endDate: `${nextYear}-08-24`,
      venue: 'Brookside at the Rose Bowl',
      address: '1133 Rosemont Ave, Pasadena, CA 91103',
      lat: 34.1613,
      lng: -118.1676,
      category: 'Festival'
    },
    // Holiday Events
    {
      title: 'LA Zoo Lights',
      date: `${currentYear}-12-06`,
      endDate: `${nextYear}-01-05`,
      venue: 'Los Angeles Zoo',
      address: '5333 Zoo Dr, Los Angeles, CA 90027',
      lat: 34.1483,
      lng: -118.2868,
      category: 'Festival'
    },
    {
      title: 'Marina del Rey Holiday Boat Parade',
      date: `${currentYear}-12-14`,
      venue: 'Marina del Rey',
      address: 'Marina del Rey, CA 90292',
      lat: 33.9802,
      lng: -118.4517,
      category: 'Festival'
    },
    {
      title: 'Hollywood Christmas Parade',
      date: `${currentYear}-12-01`,
      venue: 'Hollywood Boulevard',
      address: 'Hollywood Blvd, Los Angeles, CA 90028',
      lat: 34.1016,
      lng: -118.3267,
      category: 'Festival'
    },
    {
      title: 'Rose Parade',
      date: `${nextYear}-01-01`,
      venue: 'Colorado Boulevard',
      address: 'Colorado Blvd, Pasadena, CA 91101',
      lat: 34.1478,
      lng: -118.1445,
      category: 'Festival'
    },
    {
      title: 'Rose Bowl Game',
      date: `${nextYear}-01-01`,
      venue: 'Rose Bowl Stadium',
      address: '1001 Rose Bowl Dr, Pasadena, CA 91103',
      lat: 34.1613,
      lng: -118.1676,
      category: 'Festival'
    },
    // Food & Cultural Festivals
    {
      title: 'LA Food & Wine Festival',
      date: `${nextYear}-08-22`,
      endDate: `${nextYear}-08-25`,
      venue: 'Paramount Studios',
      address: '5515 Melrose Ave, Los Angeles, CA 90038',
      lat: 34.0839,
      lng: -118.3195,
      category: 'Festival'
    },
    {
      title: 'Fiesta Broadway',
      date: `${nextYear}-04-27`,
      venue: 'Downtown LA',
      address: 'Broadway, Los Angeles, CA 90012',
      lat: 34.0522,
      lng: -118.2437,
      category: 'Festival'
    },
    {
      title: 'LA Pride Festival',
      date: `${nextYear}-06-07`,
      endDate: `${nextYear}-06-08`,
      venue: 'LA State Historic Park',
      address: '1245 N Spring St, Los Angeles, CA 90012',
      lat: 34.0647,
      lng: -118.2285,
      category: 'Festival'
    },
    // Film Festivals
    {
      title: 'AFI Fest',
      date: `${currentYear}-10-23`,
      endDate: `${currentYear}-10-27`,
      venue: 'TCL Chinese Theatre',
      address: '6925 Hollywood Blvd, Los Angeles, CA 90028',
      lat: 34.1022,
      lng: -118.3410,
      category: 'Festival'
    },
    // New Year's Eve
    {
      title: 'Grand Park New Year\'s Eve Countdown Concert',
      date: `${currentYear}-12-31`,
      venue: 'Grand Park',
      address: '200 N Grand Ave, Los Angeles, CA 90012',
      lat: 34.0563,
      lng: -118.2468,
      category: 'Festival'
    },
    {
      title: 'Universal CityWalk New Year\'s Eve Party & Fireworks',
      date: `${currentYear}-12-31`,
      venue: 'Universal CityWalk',
      address: '100 Universal City Plaza, Universal City, CA 91608',
      lat: 34.1367,
      lng: -118.3531,
      category: 'Festival'
    }
  ];
  
  for (const festival of festivals) {
    events.push({
      id: uuidv4(),
      title: festival.title,
      date: festival.date,
      startDate: new Date(festival.date + 'T10:00:00'),
      endDate: festival.endDate ? new Date(festival.endDate + 'T23:59:00') : null,
      url: null,
      imageUrl: null,
      venue: {
        name: festival.venue,
        address: festival.address,
        city: 'Los Angeles'
      },
      latitude: festival.lat,
      longitude: festival.lng,
      city: 'Los Angeles',
      category: festival.category,
      source: 'LAFestivals'
    });
  }
  
  console.log(`  ✅ Generated ${events.length} LA festival events`);
  events.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
  
  return filterEvents(events);
}

module.exports = generateLAFestivals;
