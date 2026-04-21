/**
 * Church Hill Theatre Edinburgh Events Scraper
 * URL: https://www.alledinburghtheatre.com/church-hill-theatre-listings/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeChurchHill(city = 'Edinburgh') {
  console.log('🎭 Scraping Church Hill Theatre...');

  try {
    const response = await axios.get('https://www.alledinburghtheatre.com/church-hill-theatre-listings/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

    $('a[href*="ticketsource"], a[href*="edinburghmusictheatre"]').each((i, el) => {
      try {
        const $el = $(el);
        const href = $el.attr('href');
        if (!href || seen.has(href)) return;
        seen.add(href);

        const parentText = $el.parent().text();
        
        // Extract title - text before the date
        const titleMatch = parentText.match(/^([A-Za-z\s\!\'\-\(\)]+)\s*(?:\(|Tue|Wed|Thu|Fri|Sat|Sun|Mon)/);
        let title = titleMatch ? titleMatch[1].trim() : '';
        if (!title || title.length < 3) {
          title = $el.text().trim();
        }
        if (!title || title.length < 3 || title === 'Book here' || title === 'Book here.') return;

        const dateMatch = parentText.match(/(\d{1,2})(?:\s*[-–]\s*\w+\s+\d+)?\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{4})?/i);
        
        let isoDate = null;
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const monthKey = dateMatch[2].toLowerCase().substring(0, 3);
          const month = months[monthKey] || '01';
          let year = dateMatch[3]; if (!year) { const _n = new Date(); year = (parseInt(month) < _n.getMonth() + 1) ? String(_n.getFullYear() + 1) : String(_n.getFullYear()); }
          isoDate = `${year}-${month}-${day}`;
        }

        if (!isoDate) return; // Skip events without dates
        events.push({
          id: uuidv4(),
          title: title.replace(/\s*\([^)]*\)\s*$/, '').trim(),
          date: isoDate,
          startDate: isoDate ? new Date(isoDate + 'T00:00:00.000Z') : null,
          url: href,
          venue: { name: 'Church Hill Theatre', address: '33 Morningside Road, Edinburgh EH10 4DR', city: 'Edinburgh' },
          latitude: 55.9323,
          longitude: -3.2092,
          city: 'Edinburgh',
          category: 'Arts',
          source: 'Church Hill Theatre'
        });
      } catch (e) {}
    });

    const unique = [];
    const keySet = new Set();
    for (const e of events) {
      const key = `${e.title}`;
      if (!keySet.has(key)) {
        keySet.add(key);
        unique.push(e);
      }
    }

    console.log(`  ✅ Found ${unique.length} Church Hill Theatre events`);
    return unique;

  } catch (error) {
    console.error('  ⚠️ Church Hill Theatre error:', error.message);
    return [];
  }
}

module.exports = scrapeChurchHill;
