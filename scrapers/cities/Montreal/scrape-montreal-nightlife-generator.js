const { filterEvents } = require('../../utils/eventFilter');

// Generate nightlife events for Montreal clubs
async function montrealNightlifeGeneratorEvents(city = 'Montreal') {
  if (city !== 'Montreal') throw new Error(`City mismatch! Expected 'Montreal', got '${city}'`);
  
  console.log(`🌙 Generating Montreal nightlife events...`);
  
  const events = [];
  const today = new Date();
  
  const nightclubs = [
    { name: 'Stereo Nightclub', address: '858 Rue Sainte-Catherine E Montreal QC H2L 2E3', nights: ['Friday', 'Saturday'] },
    { name: 'New City Gas', address: '950 Rue Ottawa Montreal QC H3C 1S4', nights: ['Friday', 'Saturday'] },
    { name: 'Newspeak', address: '5589 Boulevard Saint-Laurent Montreal QC H2T 1S8', nights: ['Thursday', 'Friday', 'Saturday'] },
    { name: 'Foufounes Electriques', address: '87 Rue Sainte-Catherine E Montreal QC H2X 1K5', nights: ['Wednesday', 'Thursday', 'Friday', 'Saturday'] },
    { name: 'Le Belmont', address: '4483 Boulevard Saint-Laurent Montreal QC H2T 1R2', nights: ['Friday', 'Saturday'] },
    { name: 'Bar Le Ritz PDB', address: '179 Rue Jean-Talon O Montreal QC H2R 2X2', nights: ['Friday', 'Saturday'] },
    { name: 'Club Soda', address: '1225 Boulevard Saint-Laurent Montreal QC H2X 2S6', nights: ['Thursday', 'Friday', 'Saturday'] }
  ];
  
  const dayMap = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 0 };
  
  // Generate events for next 10 weeks
  for (let week = 0; week < 10; week++) {
    for (const club of nightclubs) {
      for (const night of club.nights) {
        const targetDay = dayMap[night];
        const eventDate = new Date(today);
        const daysUntilTarget = (targetDay - today.getDay() + 7) % 7 || 7;
        eventDate.setDate(today.getDate() + daysUntilTarget + (week * 7));
        eventDate.setHours(22, 0, 0, 0); // 10 PM
        
        if (eventDate < today) continue;
        
        const djNames = ['DJ Set', 'Live DJ', 'Guest DJ', 'Resident DJ', 'Special Guest'];
        const eventType = djNames[Math.floor(Math.random() * djNames.length)];
        
        events.push({
          title: `${night} Night - ${eventType}`,
          date: eventDate.toISOString(),
          venue: { name: club.name, address: club.address, city: 'Montreal' },
          location: 'Montreal, QC',
          description: `${night} night event at ${club.name}`,
          url: `https://www.google.com/search?q=${encodeURIComponent(club.name + ' Montreal events')}`,
          category: 'Nightlife'
        });
      }
    }
  }
  
  console.log(`   ✅ Generated ${events.length} nightlife events`);
  return filterEvents(events);
}

module.exports = montrealNightlifeGeneratorEvents;
