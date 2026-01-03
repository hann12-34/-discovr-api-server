/**
 * Club Tropicana Edinburgh Events Scraper
 * URL: https://tropicanaedinburgh.com/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeTropicana(city = 'Edinburgh') {
  console.log('🌴 Scraping Club Tropicana Edinburgh...');

  try {
    const response = await axios.get('https://tropicanaedinburgh.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const currentYear = new Date().getFullYear();

    // Find event sections with dates
    $('h3, .event-title, [class*="event"]').each((i, el) => {
      try {
        const $el = $(el);
        const text = $el.text().trim();
        
        // Match patterns like "Disco Days | Edinburgh | 31st January"
        const dateMatch = text.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        if (!dateMatch) return;

        const day = dateMatch[1].padStart(2, '0');
        const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
        const year = currentYear.toString();
        const isoDate = `${year}-${month}-${day}`;

        if (new Date(isoDate) < new Date()) return;

        // Extract title (part before the date usually)
        let title = text.split('|')[0].trim();
        if (!title || title.length < 3) return;

        const key = `${title}|${isoDate}`;
        if (seen.has(key)) return;
        seen.add(key);

        // Find nearby ticket link
        const $parent = $el.closest('div, section');
        let ticketUrl = $parent.find('a[href*="skiddle"], a[href*="fatsoma"], a[href*="ticket"]').attr('href');
        if (!ticketUrl) ticketUrl = 'https://tropicanaedinburgh.com/';

        events.push({
          id: uuidv4(),
          title: title.replace(/\s+/g, ' ').trim(),
          date: isoDate,
          url: ticketUrl,
          venue: {
            name: 'Club Tropicana',
            address: '23 Lothian Rd, Edinburgh EH1 2DJ',
            city: 'Edinburgh'
          },
          latitude: 55.9472,
          longitude: -3.2055,
          city: 'Edinburgh',
          category: 'Nightlife',
          source: 'Club Tropicana'
        });
      } catch (e) {}
    });

    // Fetch images
    for (const event of events.slice(0, 20)) {
      if (event.url && event.url !== 'https://tropicanaedinburgh.com/') {
        try {
          const page = await axios.get(event.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
          const $p = cheerio.load(page.data);
          const ogImage = $p('meta[property="og:image"]').attr('content');
          if (ogImage && ogImage.startsWith('http')) {
            event.imageUrl = ogImage;
          }
        } catch (e) {}
      }
    }

    console.log(`  ✅ Found ${events.length} Tropicana events`);
    return events;

  } catch (error) {
    console.error('  ⚠️ Tropicana error:', error.message);
    return [];
  }
}

module.exports = scrapeTropicana;
