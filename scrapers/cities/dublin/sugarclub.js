/**
 * The Sugar Club Dublin Events Scraper
 * URL: https://thesugarclub.com/tickets/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeSugarClub(city = 'Dublin') {
  console.log('🎵 Scraping Sugar Club Dublin...');

  try {
    const response = await axios.get('https://thesugarclub.com/tickets/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();

    $('a[href*="/event/"]').each((i, el) => {
      try {
        const $el = $(el);
        const href = $el.attr('href');
        if (!href || seen.has(href)) return;
        seen.add(href);

        // Get title from parent or sibling h3
        let title = $el.closest('div').find('h3').first().text().trim();
        if (!title) title = $el.text().trim();
        if (!title || title === 'Buy Tickets' || title.length < 3) return;

        const url = href.startsWith('http') ? href : `https://thesugarclub.com${href}`;

        events.push({
          id: uuidv4(),
          title: title.replace(/\s+/g, ' ').trim(),
          url,
          venue: {
            name: 'The Sugar Club',
            address: '8 Leeson Street Lower, Dublin D02 ET97',
            city: 'Dublin'
          },
          latitude: 53.3346,
          longitude: -6.2568,
          city: 'Dublin',
          category: 'Nightlife',
          source: 'The Sugar Club'
        });
      } catch (e) {}
    });

    // Dedupe by title
    const unique = [];
    const titleSet = new Set();
    for (const e of events) {
      if (!titleSet.has(e.title)) {
        titleSet.add(e.title);
        unique.push(e);
      }
    }

    // Fetch dates and images from event pages
    for (const event of unique.slice(0, 30)) {
      try {
        const page = await axios.get(event.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 });
        const $p = cheerio.load(page.data);
        
        const ogImage = $p('meta[property="og:image"]').attr('content');
        if (ogImage && ogImage.startsWith('http')) {
          event.imageUrl = ogImage;
        }

        // Find date in page
        const pageText = $p('body').text();
        const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
        const dateMatch = pageText.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*,?\s*(\d{4})?/i);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          const year = dateMatch[3] || new Date().getFullYear().toString();
          event.date = `${year}-${month}-${day}`;
        }
      } catch (e) {}
    }

    const withDates = unique.filter(e => e.date && new Date(e.date) >= new Date());

    console.log(`  ✅ Found ${withDates.length} Sugar Club events`);
    return withDates;

  } catch (error) {
    console.error('  ⚠️ Sugar Club error:', error.message);
    return [];
  }
}

module.exports = scrapeSugarClub;
