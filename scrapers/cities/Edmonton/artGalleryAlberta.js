/**
 * Art Gallery of Alberta Edmonton Events Scraper
 * URL: https://www.youraga.ca/whats-on
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeArtGalleryAlberta(city = 'Edmonton') {
  console.log('🎨 Scraping Art Gallery of Alberta Edmonton...');

  try {
    const response = await axios.get('https://www.youraga.ca/whats-on', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };

    $('a[href*="/whats-on/"]').each((i, el) => {
      try {
        const $el = $(el);
        const url = $el.attr('href');
        if (!url || seen.has(url) || url === '/whats-on' || url.includes('#')) return;
        seen.add(url);

        const $container = $el.closest('div, article, li');
        const title = $container.find('h2, h3, h4').first().text().trim() || $el.text().trim();
        if (!title || title.length < 3 || title.length > 150) return;

        const text = $container.text();
        // Match dates like "January 10, 2026" or "November 29, 2025 - March 15, 2026"
        const dateMatch = text.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})/i);
        
        let isoDate = null;
        if (dateMatch) {
          const month = months[dateMatch[1].toLowerCase()];
          const day = dateMatch[2].padStart(2, '0');
          const year = dateMatch[3];
          isoDate = `${year}-${month}-${day}`;
        }

        if (!isoDate || new Date(isoDate) < new Date()) return;

        const imgEl = $container.find('img').first();
        const imageUrl = imgEl.attr('src') || null;

        events.push({
          id: uuidv4(),
          title,
          description: 'Exhibition at Art Gallery of Alberta',
          date: isoDate,
          startDate: new Date(isoDate + 'T10:00:00'),
          url: url.startsWith('http') ? url : `https://www.youraga.ca${url}`,
          imageUrl: imageUrl?.startsWith('http') ? imageUrl : imageUrl ? `https://www.youraga.ca${imageUrl}` : null,
          venue: {
            name: 'Art Gallery of Alberta',
            address: '2 Sir Winston Churchill Square, Edmonton, AB T5J 2C1',
            city: 'Edmonton'
          },
          latitude: 53.5461,
          longitude: -113.4938,
          city: 'Edmonton',
          category: 'Festivals',
          source: 'Art Gallery of Alberta'
        });
      } catch (e) {}
    });

    console.log(`  ✅ Found ${events.length} Art Gallery of Alberta events`);
    return events;

  } catch (error) {
    console.error(`  ⚠️ Art Gallery of Alberta error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeArtGalleryAlberta;
