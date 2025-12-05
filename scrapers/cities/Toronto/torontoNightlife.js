/**
 * Toronto Nightlife Recurring Events Generator
 * Direct venue events - NO aggregators
 */

const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

function generateTorontoNightlife(city = 'Toronto') {
  console.log('🌃 Generating Toronto Nightlife events...');
  
  const events = [];
  const today = new Date();
  const weeksAhead = 8;
  
  const venues = [
    {
      name: 'Rebel Toronto',
      address: '11 Polson St, Toronto, ON M5A 1A4',
      lat: 43.6428, lng: -79.3580,
      events: [
        { day: 5, name: 'Rebel Friday Mega Party' },
        { day: 6, name: 'Rebel Saturday Main Event' }
      ]
    },
    {
      name: 'CODA Toronto',
      address: '794 Bathurst St, Toronto, ON M5R 3G1',
      lat: 43.6656, lng: -79.4113,
      events: [
        { day: 5, name: 'CODA Friday Techno Night' },
        { day: 6, name: 'CODA Saturday Underground Session' }
      ]
    },
    {
      name: 'Toybox Toronto',
      address: '473 Adelaide St W, Toronto, ON M5V 1T1',
      lat: 43.6462, lng: -79.3974,
      events: [
        { day: 5, name: 'Toybox Friday Party' },
        { day: 6, name: 'Toybox Saturday Night' }
      ]
    },
    {
      name: 'EFS Toronto',
      address: '647 King St W, Toronto, ON M5V 1M5',
      lat: 43.6443, lng: -79.4016,
      events: [
        { day: 5, name: 'EFS Friday VIP Night' },
        { day: 6, name: 'EFS Saturday DJ Party' }
      ]
    },
    {
      name: 'Cube Nightclub',
      address: '314 Queen St W, Toronto, ON M5V 2A2',
      lat: 43.6500, lng: -79.3937,
      events: [
        { day: 5, name: 'Cube Friday Latin Night' },
        { day: 6, name: 'Cube Saturday Dance Party' }
      ]
    },
    {
      name: 'Nest Toronto',
      address: '423 College St, Toronto, ON M5T 1T1',
      lat: 43.6570, lng: -79.4071,
      events: [
        { day: 4, name: 'Nest Thursday Industry Night' },
        { day: 5, name: 'Nest Friday Party' },
        { day: 6, name: 'Nest Saturday Club Night' }
      ]
    },
    {
      name: 'Lost & Found Toronto',
      address: '577 King St W, Toronto, ON M5V 1M1',
      lat: 43.6446, lng: -79.3993,
      events: [
        { day: 5, name: 'Lost & Found Friday Rooftop Party' },
        { day: 6, name: 'Lost & Found Saturday Night' }
      ]
    },
    {
      name: 'The Drake Hotel',
      address: '1150 Queen St W, Toronto, ON M6J 1J3',
      lat: 43.6433, lng: -79.4252,
      events: [
        { day: 4, name: 'Drake Underground Thursday Live Music' },
        { day: 5, name: 'Drake Friday DJ Night' },
        { day: 6, name: 'Drake Saturday Party' }
      ]
    }
  ];
  
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
          startDate: new Date(isoDate + 'T22:00:00'),
          venue: { name: venue.name, address: venue.address, city: 'Toronto' },
          latitude: venue.lat,
          longitude: venue.lng,
          city: 'Toronto',
          category: 'Nightlife',
          source: 'TorontoNightlife'
        });
      }
    }
  }
  
  console.log(`  ✅ Generated ${events.length} Toronto nightlife events`);
  return filterEvents(events);
}

module.exports = generateTorontoNightlife;
