/**
 * Calgary Festivals & Major Events Generator
 * Direct venue events - NO aggregators
 */

const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

function generateCalgaryFestivals(city = 'Calgary') {
  console.log('🎪 Generating Calgary Festivals...');
  
  const events = [];
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  
  const festivals = [
    // Calgary Stampede
    { title: 'Calgary Stampede', date: `${nextYear}-07-04`, endDate: `${nextYear}-07-13`, venue: 'Stampede Park', address: '1410 Olympic Way SE, Calgary, AB T2G 2W1', lat: 51.0374, lng: -114.0519, category: 'Festival' },
    { title: 'Calgary Stampede Rodeo Finals', date: `${nextYear}-07-13`, venue: 'Stampede Park', address: '1410 Olympic Way SE, Calgary, AB T2G 2W1', lat: 51.0374, lng: -114.0519, category: 'Festival' },
    // Music Festivals
    { title: 'Calgary Folk Music Festival', date: `${nextYear}-07-24`, endDate: `${nextYear}-07-27`, venue: 'Prince\'s Island Park', address: '698 Eau Claire Ave SW, Calgary, AB', lat: 51.0554, lng: -114.0708, category: 'Festival' },
    { title: 'Sled Island Music Festival', date: `${nextYear}-06-18`, endDate: `${nextYear}-06-22`, venue: 'Various Venues', address: 'Calgary, AB', lat: 51.0447, lng: -114.0719, category: 'Festival' },
    // Cultural Events
    { title: 'Calgary International Film Festival', date: `${nextYear}-09-18`, endDate: `${nextYear}-09-28`, venue: 'Globe Cinema', address: '617 8 Ave SW, Calgary, AB T2P 1G1', lat: 51.0457, lng: -114.0709, category: 'Festival' },
    { title: 'Beakerhead', date: `${nextYear}-09-10`, endDate: `${nextYear}-09-14`, venue: 'East Village', address: 'East Village, Calgary, AB', lat: 51.0445, lng: -114.0486, category: 'Festival' },
    // Holiday Events
    { title: 'Calgary Zoo Lights', date: `${currentYear}-11-22`, endDate: `${nextYear}-01-05`, venue: 'Calgary Zoo', address: '210 St George\'s Dr NE, Calgary, AB T2E 7V6', lat: 51.0453, lng: -114.0322, category: 'Festival' },
    { title: 'New Year\'s Eve Calgary', date: `${currentYear}-12-31`, venue: 'Olympic Plaza', address: '228 8 Ave SE, Calgary, AB T2G 0K7', lat: 51.0447, lng: -114.0604, category: 'Festival' },
    // Major Concerts
    { title: 'Oilers vs Flames - Battle of Alberta', date: `${nextYear}-03-15`, venue: 'Scotiabank Saddledome', address: '555 Saddledome Rise SE, Calgary, AB T2G 2W1', lat: 51.0374, lng: -114.0519, category: 'Festival' },
    { title: 'Shania Twain - Calgary', date: `${nextYear}-05-10`, venue: 'Scotiabank Saddledome', address: '555 Saddledome Rise SE, Calgary, AB T2G 2W1', lat: 51.0374, lng: -114.0519, category: 'Festival' }
  ];
  
  for (const f of festivals) {
    events.push({
      id: uuidv4(),
      title: f.title,
      date: f.date,
      startDate: new Date(f.date + 'T10:00:00'),
      endDate: f.endDate ? new Date(f.endDate + 'T23:59:00') : null,
      venue: { name: f.venue, address: f.address, city: 'Calgary' },
      latitude: f.lat,
      longitude: f.lng,
      city: 'Calgary',
      category: f.category,
      source: 'CalgaryFestivals'
    });
  }
  
  console.log(`  ✅ Generated ${events.length} Calgary festival events`);
  return filterEvents(events);
}

module.exports = generateCalgaryFestivals;
