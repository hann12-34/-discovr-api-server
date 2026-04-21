const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎪 Scraping Commonwealth Bar & Stage events...');
  try {
    const res = await axios.get('https://www.commonwealthbar.ca/events?format=json', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 15000
    });
    const upcoming = res.data?.upcoming || [];
    const today = new Date().toISOString().slice(0, 10);
    const events = upcoming
      .filter(e => e.title && e.startDate)
      .map(e => {
        const dateStr = new Date(e.startDate).toISOString().slice(0, 10);
        if (dateStr < today) return null;
        const url = e.fullUrl
          ? (e.fullUrl.startsWith('http') ? e.fullUrl : `https://www.commonwealthbar.ca${e.fullUrl}`)
          : 'https://www.commonwealthbar.ca/events';
        return {
          id: uuidv4(),
          title: e.title,
          url,
          date: dateStr,
          description: e.body?.replace(/<[^>]+>/g, '').trim().slice(0, 500) || '',
          imageUrl: e.assetUrl || null,
          venue: {
            name: 'Commonwealth Bar & Stage',
            address: '731 10 Ave SW, Calgary, AB T2R 0B3',
            city: 'Calgary',
          },
          city,
          source: 'commonwealth-bar',
        };
      })
      .filter(Boolean);
    console.log(`✅ Commonwealth Bar: ${events.length} events`);
    return filterEvents(events);
  } catch (e) {
    console.error('Commonwealth Bar error:', e.message);
    return [];
  }
}

module.exports = scrapeEvents;
