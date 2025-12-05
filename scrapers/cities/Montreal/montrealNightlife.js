/**
 * Montreal Nightlife Recurring Events Generator
 * Direct venue events - NO aggregators
 */

const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

function generateMontrealNightlife(city = 'Montreal') {
  console.log('🌃 Generating Montreal Nightlife events...');
  
  const events = [];
  const today = new Date();
  const weeksAhead = 8;
  
  const venues = [
    {
      name: 'New City Gas',
      address: '950 Rue Ottawa, Montreal, QC H3C 1S4',
      lat: 45.4956, lng: -73.5524,
      events: [
        { day: 5, name: 'New City Gas Friday Massive' },
        { day: 6, name: 'New City Gas Saturday Main Event' }
      ]
    },
    {
      name: 'Stereo Nightclub',
      address: '858 Rue Ste-Catherine E, Montreal, QC H2L 2E3',
      lat: 45.5178, lng: -73.5577,
      events: [
        { day: 5, name: 'Stereo Friday After Hours' },
        { day: 6, name: 'Stereo Saturday After Hours' }
      ]
    },
    {
      name: 'MTELUS',
      address: '59 Rue Ste-Catherine E, Montreal, QC H2X 1K5',
      lat: 45.5115, lng: -73.5634,
      events: [
        { day: 5, name: 'MTELUS Friday Concert' },
        { day: 6, name: 'MTELUS Saturday Live Show' }
      ]
    },
    {
      name: 'La Voute',
      address: '360 Rue St-Jacques, Montreal, QC H2Y 1P5',
      lat: 45.5027, lng: -73.5587,
      events: [
        { day: 5, name: 'La Voute Friday Underground' },
        { day: 6, name: 'La Voute Saturday Night' }
      ]
    },
    {
      name: 'Apt. 200',
      address: '3643 Boulevard Saint-Laurent, Montreal, QC H2X 2V5',
      lat: 45.5163, lng: -73.5734,
      events: [
        { day: 4, name: 'Apt. 200 Thursday Hip-Hop Night' },
        { day: 5, name: 'Apt. 200 Friday Party' },
        { day: 6, name: 'Apt. 200 Saturday DJ Night' }
      ]
    },
    {
      name: 'Le Belmont',
      address: '4483 Boulevard Saint-Laurent, Montreal, QC H2W 1Z8',
      lat: 45.5223, lng: -73.5833,
      events: [
        { day: 5, name: 'Le Belmont Friday Live Music' },
        { day: 6, name: 'Le Belmont Saturday Dance Night' }
      ]
    },
    {
      name: 'Foufounes Électriques',
      address: '87 Rue Ste-Catherine E, Montreal, QC H2X 1K5',
      lat: 45.5113, lng: -73.5627,
      events: [
        { day: 4, name: 'Foufounes Thursday Punk Night' },
        { day: 5, name: 'Foufounes Friday Metal Night' },
        { day: 6, name: 'Foufounes Saturday Alternative' }
      ]
    },
    {
      name: 'Circus Afterhours',
      address: '917 Rue Ste-Catherine E, Montreal, QC H2L 2E9',
      lat: 45.5181, lng: -73.5569,
      events: [
        { day: 5, name: 'Circus Friday After Hours Party' },
        { day: 6, name: 'Circus Saturday After Hours' }
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
          venue: { name: venue.name, address: venue.address, city: 'Montreal' },
          latitude: venue.lat,
          longitude: venue.lng,
          city: 'Montreal',
          category: 'Nightlife',
          source: 'MontrealNightlife'
        });
      }
    }
  }
  
  console.log(`  ✅ Generated ${events.length} Montreal nightlife events`);
  return filterEvents(events);
}

module.exports = generateMontrealNightlife;
