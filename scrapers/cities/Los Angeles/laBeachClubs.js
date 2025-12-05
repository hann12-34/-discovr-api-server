/**
 * LA Beach & Pool Clubs Event Generator
 * Generates recurring events for Santa Monica, Venice, and Malibu venues
 */

const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

function generateLABeachClubs(city = 'Los Angeles') {
  console.log('🏖️ Generating LA Beach & Pool Club events...');
  
  const events = [];
  const today = new Date();
  const currentYear = today.getFullYear();
  
  const weeksAhead = 8;
  
  const venues = [
    {
      name: 'High Rooftop Lounge',
      address: '1697 Pacific Ave, Venice, CA 90291',
      lat: 33.9885,
      lng: -118.4654,
      events: [
        { day: 5, name: 'High Rooftop Friday Sunset DJ Session' },
        { day: 6, name: 'High Rooftop Saturday Beach Party' },
        { day: 0, name: 'High Rooftop Sunday Brunch DJ Party' }
      ]
    },
    {
      name: 'Erwin Rooftop',
      address: '1697 Pacific Ave, Venice, CA 90291',
      lat: 33.9885,
      lng: -118.4654,
      events: [
        { day: 4, name: 'Erwin Rooftop Thursday Sunset Session' },
        { day: 5, name: 'Erwin Rooftop Friday DJ Night' },
        { day: 6, name: 'Erwin Rooftop Saturday Night Party' }
      ]
    },
    {
      name: 'The Bungalow Santa Monica',
      address: '101 Wilshire Blvd, Santa Monica, CA 90401',
      lat: 34.0156,
      lng: -118.4976,
      events: [
        { day: 4, name: 'Bungalow Thursday Beach Night' },
        { day: 5, name: 'Bungalow Friday DJ Party' },
        { day: 6, name: 'Bungalow Saturday Night Live DJ' },
        { day: 0, name: 'Bungalow Sunday Funday Beach Party' }
      ]
    },
    {
      name: 'Elephante Santa Monica',
      address: '1332 2nd St, Santa Monica, CA 90401',
      lat: 34.0145,
      lng: -118.4948,
      events: [
        { day: 5, name: 'Elephante Friday Mediterranean Night' },
        { day: 6, name: 'Elephante Saturday Rooftop DJ Party' },
        { day: 0, name: 'Elephante Sunday Brunch DJ' }
      ]
    },
    {
      name: 'Shutters on the Beach',
      address: '1 Pico Blvd, Santa Monica, CA 90405',
      lat: 34.0073,
      lng: -118.4889,
      events: [
        { day: 5, name: 'Shutters Friday Sunset Live Music' },
        { day: 6, name: 'Shutters Saturday Beach Party' }
      ]
    },
    {
      name: 'Casa Del Mar',
      address: '1910 Ocean Way, Santa Monica, CA 90405',
      lat: 34.0066,
      lng: -118.4908,
      events: [
        { day: 5, name: 'Casa Del Mar Friday Jazz Night' },
        { day: 6, name: 'Casa Del Mar Saturday Sunset Session' }
      ]
    },
    {
      name: 'Nobu Malibu',
      address: '22706 Pacific Coast Hwy, Malibu, CA 90265',
      lat: 34.0339,
      lng: -118.6784,
      events: [
        { day: 5, name: 'Nobu Malibu Friday Night' },
        { day: 6, name: 'Nobu Malibu Saturday Sunset Dinner' }
      ]
    },
    {
      name: 'Soho House Malibu',
      address: '22200 Pacific Coast Hwy, Malibu, CA 90265',
      lat: 34.0371,
      lng: -118.6691,
      events: [
        { day: 6, name: 'Soho House Malibu Saturday Pool Party' },
        { day: 0, name: 'Soho House Malibu Sunday DJ Brunch' }
      ]
    }
  ];
  
  // Generate weekly events
  for (let week = 0; week < weeksAhead; week++) {
    for (const venue of venues) {
      for (const event of venue.events) {
        const eventDate = new Date(today);
        eventDate.setDate(today.getDate() + (week * 7) + ((event.day - today.getDay() + 7) % 7));
        
        if (eventDate < today) continue;
        
        const isoDate = eventDate.toISOString().split('T')[0];
        
        events.push({
          id: uuidv4(),
          title: event.name,
          date: isoDate,
          startDate: new Date(isoDate + 'T17:00:00'),
          url: null,
          imageUrl: null,
          venue: {
            name: venue.name,
            address: venue.address,
            city: 'Los Angeles'
          },
          latitude: venue.lat,
          longitude: venue.lng,
          city: 'Los Angeles',
          category: 'Nightlife',
          source: 'LABeachClubs'
        });
      }
    }
  }
  
  console.log(`  ✅ Generated ${events.length} LA beach/pool club events`);
  events.slice(0, 8).forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
  
  return filterEvents(events);
}

module.exports = generateLABeachClubs;
