/**
 * LA Nightlife Recurring Events Generator
 * Generates recurring weekly events for popular LA nightclubs and lounges
 */

const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

function generateLANightlife(city = 'Los Angeles') {
  console.log('🌃 Generating LA Nightlife recurring events...');
  
  const events = [];
  const today = new Date();
  const currentYear = today.getFullYear();
  
  // Generate events for next 8 weeks
  const weeksAhead = 8;
  
  // LA's top nightlife venues with their weekly events
  const venues = [
    {
      name: 'Nightingale Plaza',
      address: '643 N La Cienega Blvd, West Hollywood, CA 90069',
      lat: 34.0838,
      lng: -118.3793,
      events: [
        { day: 5, name: 'Nightingale Plaza Friday DJ Party' },
        { day: 6, name: 'Nightingale Plaza Saturday DJ Night' }
      ]
    },
    {
      name: 'Bootsy Bellows',
      address: '9229 W Sunset Blvd, West Hollywood, CA 90069',
      lat: 34.0903,
      lng: -118.3888,
      events: [
        { day: 4, name: 'Bootsy Bellows Thursday DJ Party' },
        { day: 5, name: 'Bootsy Bellows Friday Club Night' },
        { day: 6, name: 'Bootsy Bellows Saturday DJ Night' }
      ]
    },
    {
      name: 'Hyde Sunset',
      address: '8117 Sunset Blvd, Los Angeles, CA 90046',
      lat: 34.0976,
      lng: -118.3636,
      events: [
        { day: 4, name: 'Hyde Sunset Thursday DJ Party' },
        { day: 5, name: 'Hyde Sunset Friday DJ Session' },
        { day: 6, name: 'Hyde Sunset Saturday DJ Night' }
      ]
    },
    {
      name: 'Delilah',
      address: '7969 Santa Monica Blvd, West Hollywood, CA 90046',
      lat: 34.0906,
      lng: -118.3604,
      events: [
        { day: 3, name: 'Delilah Wednesday Live Music Supper Club' },
        { day: 4, name: 'Delilah Thursday DJ Night' },
        { day: 5, name: 'Delilah Friday Live DJ Performance' },
        { day: 6, name: 'Delilah Saturday DJ Party' }
      ]
    },
    {
      name: 'Catch One',
      address: '4067 W Pico Blvd, Los Angeles, CA 90019',
      lat: 34.0476,
      lng: -118.3256,
      events: [
        { day: 5, name: 'Catch One Friday DJ Party Night' },
        { day: 6, name: 'Catch One Saturday DJ Night' }
      ]
    },
    {
      name: 'No Vacancy Hollywood',
      address: '1727 N Hudson Ave, Los Angeles, CA 90028',
      lat: 34.1021,
      lng: -118.3325,
      events: [
        { day: 4, name: 'No Vacancy Hollywood Thursday DJ Party' },
        { day: 5, name: 'No Vacancy Hollywood Friday DJ Night' },
        { day: 6, name: 'No Vacancy Hollywood Saturday DJ Night' }
      ]
    },
    {
      name: 'The Highlight Room Rooftop',
      address: '6417 Selma Ave, Los Angeles, CA 90028',
      lat: 34.1013,
      lng: -118.3302,
      events: [
        { day: 5, name: 'Highlight Room Rooftop Friday DJ Party' },
        { day: 6, name: 'Highlight Room Saturday DJ Night' },
        { day: 0, name: 'Highlight Room Sunday Pool Party' }
      ]
    },
    {
      name: 'The Abbey WeHo',
      address: '692 N Robertson Blvd, West Hollywood, CA 90069',
      lat: 34.0854,
      lng: -118.3848,
      events: [
        { day: 4, name: 'The Abbey WeHo Thursday DJ Night' },
        { day: 5, name: 'The Abbey WeHo Friday DJ Party' },
        { day: 6, name: 'The Abbey WeHo Saturday DJ Night' },
        { day: 0, name: 'The Abbey WeHo Sunday DJ Brunch Party' }
      ]
    }
  ];
  
  // Special holiday events
  const holidays = [
    { date: `${currentYear}-12-24`, name: 'Christmas Eve Party', venues: ['Nightingale Plaza', 'Hyde Sunset', 'Bootsy Bellows'] },
    { date: `${currentYear}-12-31`, name: 'New Year\'s Eve LA', venues: ['Nightingale Plaza', 'Hyde Sunset', 'Bootsy Bellows', 'Delilah', 'The Abbey'] },
    { date: `${currentYear + 1}-01-01`, name: 'New Year\'s Day Recovery Brunch', venues: ['The Highlight Room', 'Delilah'] }
  ];
  
  // Generate recurring weekly events
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
          source: 'LANightlife'
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
            city: 'Los Angeles'
          },
          latitude: venue.lat,
          longitude: venue.lng,
          city: 'Los Angeles',
          category: 'Nightlife',
          source: 'LANightlife'
        });
      }
    }
  }
  
  console.log(`  ✅ Generated ${events.length} LA nightlife events`);
  events.slice(0, 10).forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
  
  return filterEvents(events);
}

module.exports = generateLANightlife;
