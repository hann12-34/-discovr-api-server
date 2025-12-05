/**
 * LA Rooftop Bars Event Generator
 * Generates recurring events for DTLA and Hollywood rooftop venues
 */

const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

function generateLARooftopBars(city = 'Los Angeles') {
  console.log('🌆 Generating LA Rooftop Bar events...');
  
  const events = [];
  const today = new Date();
  const currentYear = today.getFullYear();
  
  const weeksAhead = 8;
  
  const venues = [
    {
      name: 'Perch LA',
      address: '448 S Hill St, Los Angeles, CA 90013',
      lat: 34.0492,
      lng: -118.2527,
      events: [
        { day: 4, name: 'Perch LA Thursday Live Jazz Night' },
        { day: 5, name: 'Perch LA Friday Rooftop DJ Party' },
        { day: 6, name: 'Perch LA Saturday Night DJ' },
        { day: 0, name: 'Perch LA Sunday Jazz Brunch' }
      ]
    },
    {
      name: 'Spire 73',
      address: '633 W 5th St, Los Angeles, CA 90071',
      lat: 34.0513,
      lng: -118.2554,
      events: [
        { day: 5, name: 'Spire 73 Friday Skyline DJ Night' },
        { day: 6, name: 'Spire 73 Saturday Rooftop Party' }
      ]
    },
    {
      name: 'The Rooftop at The Standard DTLA',
      address: '550 S Flower St, Los Angeles, CA 90071',
      lat: 34.0502,
      lng: -118.2575,
      events: [
        { day: 4, name: 'Standard Rooftop Thursday Pool Party' },
        { day: 5, name: 'Standard Rooftop Friday DJ Night' },
        { day: 6, name: 'Standard Rooftop Saturday DJ Party' },
        { day: 0, name: 'Standard Rooftop Sunday Pool Party' }
      ]
    },
    {
      name: 'Broken Shaker LA',
      address: '3515 Wilshire Blvd, Los Angeles, CA 90010',
      lat: 34.0618,
      lng: -118.3089,
      events: [
        { day: 5, name: 'Broken Shaker Friday DJ Session' },
        { day: 6, name: 'Broken Shaker Saturday Pool Party' },
        { day: 0, name: 'Broken Shaker Sunday Funday' }
      ]
    },
    {
      name: 'E.P. & L.P.',
      address: '603 N La Cienega Blvd, West Hollywood, CA 90069',
      lat: 34.0832,
      lng: -118.3773,
      events: [
        { day: 4, name: 'E.P. & L.P. Thursday Rooftop Night' },
        { day: 5, name: 'E.P. & L.P. Friday DJ Party' },
        { day: 6, name: 'E.P. & L.P. Saturday Rooftop Party' }
      ]
    },
    {
      name: 'Mama Shelter Rooftop',
      address: '6500 Selma Ave, Los Angeles, CA 90028',
      lat: 34.0989,
      lng: -118.3302,
      events: [
        { day: 5, name: 'Mama Shelter Friday DJ Night' },
        { day: 6, name: 'Mama Shelter Saturday Rooftop Party' },
        { day: 0, name: 'Mama Shelter Sunday Brunch DJ' }
      ]
    },
    {
      name: 'The Roof on Wilshire',
      address: '3515 Wilshire Blvd, Los Angeles, CA 90010',
      lat: 34.0617,
      lng: -118.3091,
      events: [
        { day: 5, name: 'Roof on Wilshire Friday Sunset DJ' },
        { day: 6, name: 'Roof on Wilshire Saturday Night Party' }
      ]
    },
    {
      name: 'The LINE Hotel Rooftop',
      address: '3515 Wilshire Blvd, Los Angeles, CA 90010',
      lat: 34.0617,
      lng: -118.3091,
      events: [
        { day: 5, name: 'LINE Hotel Friday Koreatown DJ Night' },
        { day: 6, name: 'LINE Hotel Saturday Pool Party' }
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
          startDate: new Date(isoDate + 'T20:00:00'),
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
          source: 'LARooftopBars'
        });
      }
    }
  }
  
  console.log(`  ✅ Generated ${events.length} LA rooftop bar events`);
  events.slice(0, 8).forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
  
  return filterEvents(events);
}

module.exports = generateLARooftopBars;
