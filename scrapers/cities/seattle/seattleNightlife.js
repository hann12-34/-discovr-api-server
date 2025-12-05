/**
 * Seattle Nightlife Recurring Events Generator
 * Generates recurring events for Seattle clubs and bars
 */

const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

function generateSeattleNightlife(city = 'Seattle') {
  console.log('🌃 Generating Seattle Nightlife recurring events...');
  
  const events = [];
  const today = new Date();
  const currentYear = today.getFullYear();
  
  const weeksAhead = 8;
  
  const venues = [
    {
      name: 'Q Nightclub',
      address: '1426 Broadway, Seattle, WA 98122',
      lat: 47.6137,
      lng: -122.3211,
      events: [
        { day: 5, name: 'Q Nightclub Friday Electronic Night' },
        { day: 6, name: 'Q Nightclub Saturday DJ Party' }
      ]
    },
    {
      name: 'Foundation Nightclub',
      address: '2218 Western Ave, Seattle, WA 98121',
      lat: 47.6135,
      lng: -122.3492,
      events: [
        { day: 5, name: 'Foundation Friday Bass Night' },
        { day: 6, name: 'Foundation Saturday EDM Party' }
      ]
    },
    {
      name: 'Monkey Loft',
      address: '2915 1st Ave S, Seattle, WA 98134',
      lat: 47.5766,
      lng: -122.3545,
      events: [
        { day: 5, name: 'Monkey Loft Friday DJ Night' },
        { day: 6, name: 'Monkey Loft Saturday Warehouse Party' }
      ]
    },
    {
      name: 'Baltic Room',
      address: '1207 Pine St, Seattle, WA 98101',
      lat: 47.6140,
      lng: -122.3278,
      events: [
        { day: 4, name: 'Baltic Room Thursday Soul Night' },
        { day: 5, name: 'Baltic Room Friday DJ Party' },
        { day: 6, name: 'Baltic Room Saturday Dance Night' }
      ]
    },
    {
      name: 'Rhein Haus Capitol Hill',
      address: '912 12th Ave, Seattle, WA 98122',
      lat: 47.6136,
      lng: -122.3166,
      events: [
        { day: 5, name: 'Rhein Haus Friday Live Music' },
        { day: 6, name: 'Rhein Haus Saturday Night Party' }
      ]
    },
    {
      name: 'The Runaway',
      address: '800 Pine St, Seattle, WA 98101',
      lat: 47.6136,
      lng: -122.3311,
      events: [
        { day: 5, name: 'The Runaway Friday Rooftop DJ' },
        { day: 6, name: 'The Runaway Saturday Night' }
      ]
    },
    {
      name: 'Supernova Seattle',
      address: '110 S Horton St, Seattle, WA 98134',
      lat: 47.5697,
      lng: -122.3550,
      events: [
        { day: 5, name: 'Supernova Friday DJ Party' },
        { day: 6, name: 'Supernova Saturday Night' }
      ]
    },
    {
      name: 'The Crocodile',
      address: '2505 1st Ave, Seattle, WA 98121',
      lat: 47.6146,
      lng: -122.3522,
      events: [
        { day: 4, name: 'Crocodile Thursday Indie Night' },
        { day: 5, name: 'Crocodile Friday Live Music' },
        { day: 6, name: 'Crocodile Saturday Concert' }
      ]
    },
    {
      name: 'The Highline',
      address: '210 Broadway E, Seattle, WA 98102',
      lat: 47.6202,
      lng: -122.3212,
      events: [
        { day: 5, name: 'Highline Friday Punk Rock Night' },
        { day: 6, name: 'Highline Saturday Live Music' }
      ]
    },
    {
      name: 'Lo-Fi Performance Gallery',
      address: '429 Eastlake Ave E, Seattle, WA 98109',
      lat: 47.6265,
      lng: -122.3305,
      events: [
        { day: 5, name: 'Lo-Fi Friday Experimental Night' },
        { day: 6, name: 'Lo-Fi Saturday DJ Set' }
      ]
    }
  ];
  
  // Holiday events
  const holidays = [
    { date: `${currentYear}-12-31`, name: 'New Year\'s Eve Party', venues: ['Q Nightclub', 'Foundation Nightclub', 'Monkey Loft'] }
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
          startDate: new Date(isoDate + 'T21:00:00'),
          url: null,
          imageUrl: null,
          venue: {
            name: venue.name,
            address: venue.address,
            city: 'Seattle'
          },
          latitude: venue.lat,
          longitude: venue.lng,
          city: 'Seattle',
          category: 'Nightlife',
          source: 'SeattleNightlife'
        });
      }
    }
  }
  
  // Add holiday events
  for (const holiday of holidays) {
    for (const venueName of holiday.venues) {
      const venue = venues.find(v => v.name === venueName);
      if (venue) {
        events.push({
          id: uuidv4(),
          title: `${holiday.name} at ${venue.name}`,
          date: holiday.date,
          startDate: new Date(holiday.date + 'T21:00:00'),
          url: null,
          imageUrl: null,
          venue: {
            name: venue.name,
            address: venue.address,
            city: 'Seattle'
          },
          latitude: venue.lat,
          longitude: venue.lng,
          city: 'Seattle',
          category: 'Nightlife',
          source: 'SeattleNightlife'
        });
      }
    }
  }
  
  console.log(`  ✅ Generated ${events.length} Seattle nightlife events`);
  events.slice(0, 10).forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
  
  return filterEvents(events);
}

module.exports = generateSeattleNightlife;
