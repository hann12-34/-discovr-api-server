/**
 * Miami Rooftop Bars & Beach Clubs Event Generator
 * Generates recurring events for South Beach and Brickell venues
 */

const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

function generateMiamiRooftops(city = 'Miami') {
  console.log('🌴 Generating Miami Rooftop & Beach Club events...');
  
  const events = [];
  const today = new Date();
  const currentYear = today.getFullYear();
  
  const weeksAhead = 8;
  
  const venues = [
    {
      name: 'Juvia Miami Beach',
      address: '1111 Lincoln Rd, Miami Beach, FL 33139',
      lat: 25.7908,
      lng: -80.1393,
      events: [
        { day: 5, name: 'Juvia Friday Rooftop DJ Party' },
        { day: 6, name: 'Juvia Saturday Sunset Session' }
      ]
    },
    {
      name: 'Sugar at EAST Miami',
      address: '788 Brickell Plaza, Miami, FL 33131',
      lat: 25.7631,
      lng: -80.1913,
      events: [
        { day: 4, name: 'Sugar Rooftop Thursday DJ Night' },
        { day: 5, name: 'Sugar Friday Brickell Views Party' },
        { day: 6, name: 'Sugar Saturday Night DJ' }
      ]
    },
    {
      name: 'Area 31 at Kimpton EPIC',
      address: '270 Biscayne Blvd Way, Miami, FL 33131',
      lat: 25.7689,
      lng: -80.1867,
      events: [
        { day: 5, name: 'Area 31 Friday Rooftop Party' },
        { day: 6, name: 'Area 31 Saturday DJ Night' }
      ]
    },
    {
      name: 'Nikki Beach Miami',
      address: '1 Ocean Dr, Miami Beach, FL 33139',
      lat: 25.7642,
      lng: -80.1304,
      events: [
        { day: 0, name: 'Nikki Beach Sunday Beach Party' },
        { day: 5, name: 'Nikki Beach Friday DJ Night' },
        { day: 6, name: 'Nikki Beach Saturday Pool Party' }
      ]
    },
    {
      name: 'SLS South Beach Pool',
      address: '1701 Collins Ave, Miami Beach, FL 33139',
      lat: 25.7917,
      lng: -80.1291,
      events: [
        { day: 6, name: 'SLS Saturday Pool Party' },
        { day: 0, name: 'SLS Sunday DJ Pool Party' }
      ]
    },
    {
      name: 'Mondrian South Beach',
      address: '1100 West Ave, Miami Beach, FL 33139',
      lat: 25.7835,
      lng: -80.1424,
      events: [
        { day: 5, name: 'Mondrian Friday Sunset DJ Session' },
        { day: 6, name: 'Mondrian Saturday Pool Party' },
        { day: 0, name: 'Mondrian Sunday Pool Party' }
      ]
    },
    {
      name: 'Hyde Beach at SLS',
      address: '1701 Collins Ave, Miami Beach, FL 33139',
      lat: 25.7917,
      lng: -80.1291,
      events: [
        { day: 5, name: 'Hyde Beach Friday DJ Night' },
        { day: 6, name: 'Hyde Beach Saturday Pool Party' }
      ]
    },
    {
      name: 'W South Beach',
      address: '2201 Collins Ave, Miami Beach, FL 33139',
      lat: 25.7969,
      lng: -80.1275,
      events: [
        { day: 5, name: 'W South Beach Friday WET Pool Party' },
        { day: 6, name: 'W South Beach Saturday DJ Night' }
      ]
    },
    {
      name: 'Delano Beach Club',
      address: '1685 Collins Ave, Miami Beach, FL 33139',
      lat: 25.7908,
      lng: -80.1297,
      events: [
        { day: 6, name: 'Delano Saturday Beach DJ Party' },
        { day: 0, name: 'Delano Sunday Pool Party' }
      ]
    },
    {
      name: 'Faena Miami Beach',
      address: '3201 Collins Ave, Miami Beach, FL 33140',
      lat: 25.8106,
      lng: -80.1225,
      events: [
        { day: 5, name: 'Faena Friday Night Live Music' },
        { day: 6, name: 'Faena Saturday Mambo Room Party' }
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
          startDate: new Date(isoDate + 'T16:00:00'),
          url: null,
          imageUrl: null,
          venue: {
            name: venue.name,
            address: venue.address,
            city: 'Miami'
          },
          latitude: venue.lat,
          longitude: venue.lng,
          city: 'Miami',
          category: 'Nightlife',
          source: 'MiamiRooftops'
        });
      }
    }
  }
  
  console.log(`  ✅ Generated ${events.length} Miami rooftop/beach club events`);
  events.slice(0, 8).forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
  
  return filterEvents(events);
}

module.exports = generateMiamiRooftops;
