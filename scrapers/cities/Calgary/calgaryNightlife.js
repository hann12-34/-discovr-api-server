/**
 * Calgary Nightlife Recurring Events Generator
 * Direct venue events - NO aggregators
 */

const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

function generateCalgaryNightlife(city = 'Calgary') {
  console.log('🌃 Generating Calgary Nightlife events...');
  
  const events = [];
  const today = new Date();
  const weeksAhead = 8;
  
  const venues = [
    {
      name: 'Commonwealth Bar & Stage',
      address: '731 10 Ave SW, Calgary, AB T2R 0B3',
      lat: 51.0411, lng: -114.0775,
      events: [
        { day: 4, name: 'Commonwealth Thursday Live Music' },
        { day: 5, name: 'Commonwealth Friday DJ Night' },
        { day: 6, name: 'Commonwealth Saturday Party' }
      ]
    },
    {
      name: 'Hifi Club Calgary',
      address: '219 10 Ave SW, Calgary, AB T2R 0A4',
      lat: 51.0411, lng: -114.0665,
      events: [
        { day: 5, name: 'Hifi Friday Electronic Night' },
        { day: 6, name: 'Hifi Saturday DJ Party' }
      ]
    },
    {
      name: 'Palace Theatre Calgary',
      address: '219 8 Ave SW, Calgary, AB T2P 2M5',
      lat: 51.0457, lng: -114.0666,
      events: [
        { day: 5, name: 'Palace Theatre Friday Concert' },
        { day: 6, name: 'Palace Theatre Saturday Live Show' }
      ]
    },
    {
      name: 'Knoxville\'s Tavern',
      address: '840 9 Ave SW, Calgary, AB T2P 2T1',
      lat: 51.0444, lng: -114.0748,
      events: [
        { day: 5, name: 'Knoxville\'s Friday Country Night' },
        { day: 6, name: 'Knoxville\'s Saturday Live Music' }
      ]
    },
    {
      name: 'Cowboys Dance Hall',
      address: '421 12 Ave SE, Calgary, AB T2G 1A4',
      lat: 51.0389, lng: -114.0553,
      events: [
        { day: 5, name: 'Cowboys Friday Western Night' },
        { day: 6, name: 'Cowboys Saturday Dance Party' }
      ]
    },
    {
      name: 'The National on 10th',
      address: '341 10 Ave SW, Calgary, AB T2R 0A5',
      lat: 51.0411, lng: -114.0690,
      events: [
        { day: 4, name: 'National Thursday Local Music' },
        { day: 5, name: 'National Friday DJ Party' },
        { day: 6, name: 'National Saturday Night' }
      ]
    },
    {
      name: 'Broken City',
      address: '613 11 Ave SW, Calgary, AB T2R 0E1',
      lat: 51.0422, lng: -114.0748,
      events: [
        { day: 5, name: 'Broken City Friday Indie Night' },
        { day: 6, name: 'Broken City Saturday Live Music' }
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
          startDate: new Date(isoDate + 'T21:00:00'),
          venue: { name: venue.name, address: venue.address, city: 'Calgary' },
          latitude: venue.lat,
          longitude: venue.lng,
          city: 'Calgary',
          category: 'Nightlife',
          source: 'CalgaryNightlife'
        });
      }
    }
  }
  
  console.log(`  ✅ Generated ${events.length} Calgary nightlife events`);
  return filterEvents(events);
}

module.exports = generateCalgaryNightlife;
