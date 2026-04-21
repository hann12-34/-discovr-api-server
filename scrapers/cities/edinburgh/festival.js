/**
 * Festival Theatre Edinburgh Events Scraper
 * URL: https://www.alledinburghtheatre.com/festival-theatre-listings/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeFestivalTheatre(city = 'Edinburgh') {
  console.log('🎭 Scraping Festival Theatre Edinburgh...');

  try {
    const response = await axios.get('https://www.alledinburghtheatre.com/festival-theatre-listings/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seen = new Set();
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
                     january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };

    // Page structure: dates and event links alternate in the content
    // Walk through ALL elements sequentially, tracking the current date
    let currentDate = null;
    const dateRegex = /(?<!\d)(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)\s*(\d{4})?/i;

    $('body *').each((i, el) => {
      try {
        const $el = $(el);
        const text = $el.clone().children().remove().end().text().trim();
        
        // Check if this element contains a date
        if (text) {
          const dm = text.match(dateRegex);
          if (dm) {
            const day = dm[1].padStart(2, '0');
            const monthKey = dm[2].toLowerCase().substring(0, 3);
            const month = months[monthKey];
            if (month) {
              let year = dm[3]; if (!year) { const _n = new Date(); year = (parseInt(month) < _n.getMonth() + 1) ? String(_n.getFullYear() + 1) : String(_n.getFullYear()); }
              currentDate = `${year}-${month}-${day}`;
            }
          }
        }

        // Check if this is a capitaltheatres.com event link
        if (el.tagName === 'a' || el.name === 'a') {
          const href = $el.attr('href');
          if (!href || !href.includes('capitaltheatres.com')) return;
          if (!href.includes('/whats-on/') && !href.includes('/event') && !href.includes('/show')) return;
          if (seen.has(href)) return;
          seen.add(href);

          const title = $el.text().trim().replace(/\s+/g, ' ');
          if (!title || title.length < 4 || title.length > 150) return;
          if (/^(book|view|more|read|click|buy|www\.|http|tickets?|home|menu|about|contact)$/i.test(title)) return;
          if (/^(book here|more info|view all|read more|buy tickets)$/i.test(title)) return;

          if (!currentDate) return; // Skip if no date found yet

          events.push({
            id: uuidv4(),
            title,
            date: currentDate,
            startDate: new Date(currentDate + 'T00:00:00.000Z'),
            url: href,
            venue: { name: 'Festival Theatre', address: '13-29 Nicolson St, Edinburgh EH8 9FT', city: 'Edinburgh' },
            latitude: 55.9469,
            longitude: -3.1863,
            city: 'Edinburgh',
            category: 'Arts',
            source: 'Festival Theatre'
          });
        }
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

    for (const event of unique) {
      try {
        const page = await axios.get(event.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
        const $p = cheerio.load(page.data);
        const ogImage = $p('meta[property="og:image"]').attr('content');
        if (ogImage && ogImage.startsWith('http')) event.imageUrl = ogImage;
        // If no date yet, try to extract from event detail page
        if (!event.date) {
          const pageText = $p('body').text();
          const dm = pageText.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})/i);
          if (dm) {
            const day = dm[1].padStart(2, '0');
            const month = months[dm[2].toLowerCase().substring(0, 3)];
            if (month) {
              event.date = `${dm[3]}-${month}-${day}`;
              event.startDate = new Date(event.date + 'T00:00:00.000Z');
            }
          }
        }
      } catch (e) {}
    }
    // Remove events that still have no date after detail page check
    const dated = unique.filter(e => e.date && e.startDate);
    console.log(`  ✅ Found ${dated.length} Festival Theatre events (${unique.length - dated.length} had no date)`);
    return dated;

  } catch (error) {
    console.error('  ⚠️ Festival Theatre error:', error.message);
    return [];
  }
}

module.exports = scrapeFestivalTheatre;
