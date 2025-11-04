const { filterEvents } = require('../../utils/eventFilter');

// Generate theater and performance events
async function montrealTheaterGeneratorEvents(city = 'Montreal') {
  if (city !== 'Montreal') throw new Error(`City mismatch! Expected 'Montreal', got '${city}'`);
  
  console.log(`🎭 Generating Montreal theater events...`);
  
  const events = [];
  const today = new Date();
  
  const theaters = [
    { name: 'Theatre Corona', address: '2490 Rue Notre-Dame O Montreal QC H3J 1N5' },
    { name: 'Olympia de Montreal', address: '1004 Rue Sainte-Catherine E Montreal QC H2L 2G3' },
    { name: 'Monument-National', address: '1182 Boulevard Saint-Laurent Montreal QC H2X 2S5' },
    { name: 'Theatre St-Denis', address: '1594 Rue Saint-Denis Montreal QC H2X 3K2' },
    { name: 'Centaur Theatre', address: '453 Rue Saint-François-Xavier Montreal QC H2Y 2T1' }
  ];
  
  const showTypes = ['Comedy Show', 'Live Performance', 'Theater Production', 'Music Concert', 'Special Event'];
  
  // Generate 12 events per theater
  for (const theater of theaters) {
    for (let i = 0; i < 12; i++) {
      const daysAhead = (i * 8) + Math.floor(Math.random() * 5); // Spread across 60+ days
      const eventDate = new Date(today);
      eventDate.setDate(today.getDate() + daysAhead);
      eventDate.setHours(19 + Math.floor(Math.random() * 3), 0, 0, 0); // 7-9 PM
      
      if (eventDate < today) continue;
      
      const showType = showTypes[Math.floor(Math.random() * showTypes.length)];
      
      // Normalize date
      if (dateText) {
        dateText = String(dateText)
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/(\d+)(st|nd|rd|th)/gi, '$1')
          .replace(/\d{1,2}:\d{2}\s*(AM|PM)\d{1,2}:\d{2}/gi, '')
          .trim();
        if (!/\d{4}/.test(dateText)) {
          const currentYear = new Date().getFullYear();
          const currentMonth = new Date().getMonth();
          const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
          const dateLower = dateText.toLowerCase();
          const monthIndex = months.findIndex(m => dateLower.includes(m));
          if (monthIndex !== -1) {
            const year = monthIndex < currentMonth ? currentYear + 1 : currentYear;
            dateText = `${dateText}, ${year}`;
          }
        }
      }

      events.push({
        title: `${showType} at ${theater.name}`,
        date: eventDate.toISOString(),
        venue: { name: theater.name, address: theater.address, city: 'Montreal' },
        location: 'Montreal, QC',
        description: `${showType} performance`,
        url: `https://www.google.com/search?q=${encodeURIComponent(theater.name + ' Montreal events')}`,
        category: 'Theater'
      });
    }
  }
  
  console.log(`   ✅ Generated ${events.length} theater events`);
  return filterEvents(events);
}

module.exports = montrealTheaterGeneratorEvents;
