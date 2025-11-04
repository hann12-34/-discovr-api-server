const { filterEvents } = require('../../utils/eventFilter');

// Generate bar events for smaller venues
async function montrealBarsGeneratorEvents(city = 'Montreal') {
  if (city !== 'Montreal') throw new Error(`City mismatch! Expected 'Montreal', got '${city}'`);
  
  console.log(`🍺 Generating Montreal bar events...`);
  
  const events = [];
  const today = new Date();
  
  const bars = [
    { name: 'Bar Chez Jose', address: '173 Rue Ontario E Montreal QC H2X 1H5' },
    { name: 'Bar Datcha', address: '4601 Boulevard Saint-Laurent Montreal QC H2T 1R2' },
    { name: 'Cafe Cleo', address: '3865 Boulevard Saint-Laurent Montreal QC H2W 1Y2' },
    { name: 'Tokyo Bar', address: '3709 Boulevard Saint-Laurent Montreal QC H2X 2V7' },
    { name: 'Salon Daome', address: '141 Avenue du Mont-Royal E Montreal QC H2T 1N8' },
    { name: 'Diving Bell Social Club', address: '3956 Boulevard Saint-Laurent Montreal QC H2W 1Y3' },
    { name: 'Casa del Popolo', address: '4873 Boulevard Saint-Laurent Montreal QC H2T 1R6' }
  ];
  
  const eventTypes = [
    'Live Music', 'DJ Night', 'Open Mic', 'Karaoke Night', 'Trivia Night',
    'Happy Hour', 'Live Band', 'Acoustic Session', 'Jazz Night', 'Blues Night'
  ];
  
  const weekNights = [3, 4, 5, 6]; // Wed-Sat
  
  // Generate events for next 8 weeks
  for (let week = 0; week < 8; week++) {
    for (const bar of bars) {
      for (const dayOffset of weekNights) {
        const eventDate = new Date(today);
        const currentDay = today.getDay();
        const daysUntilTarget = (dayOffset - currentDay + 7) % 7 || 7;
        eventDate.setDate(today.getDate() + daysUntilTarget + (week * 7));
        eventDate.setHours(20 + Math.floor(Math.random() * 3), 0, 0, 0); // 8-10 PM
        
        if (eventDate < today) continue;
        
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[eventDate.getDay()];
        
        events.push({
          title: `${dayName} ${eventType}`,
          date: eventDate.toISOString(),
          venue: { name: bar.name, address: bar.address, city: 'Montreal' },
          location: 'Montreal, QC',
          description: `${eventType} at ${bar.name}`,
          url: `https://www.google.com/search?q=${encodeURIComponent(bar.name + ' Montreal events')}`,
          category: 'Nightlife'
        });
      }
    }
  }
  
  console.log(`   ✅ Generated ${events.length} bar events`);
  return filterEvents(events);
}

module.exports = montrealBarsGeneratorEvents;
