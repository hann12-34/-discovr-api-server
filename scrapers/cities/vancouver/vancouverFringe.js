/**
 * Vancouver Fringe Festival Events Scraper
 * Scrapes events from Vancouver Fringe Festival
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const BASE = 'https://www.vancouverfringe.com';
const HDR = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};
const MONTHS = { january:'01', february:'02', march:'03', april:'04', may:'05', june:'06',
                 july:'07', august:'08', september:'09', october:'10', november:'11', december:'12' };

function parseDate(text) {
  const m = text.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:th|st|nd|rd)?,?\s*(\d{4})/i);
  if (!m) return null;
  return `${m[3]}-${MONTHS[m[1].toLowerCase()]}-${m[2].padStart(2,'0')}`;
}

const VancouverFringeEvents = {
  async scrape(city) {
    console.log('🎭 Scraping Vancouver Fringe Festival...');

    try {
      // Use Fringe Presents page which lists curated shows with real event pages
      const response = await axios.get(BASE + '/fringe-presents/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const events = [];

      // Collect unique /events/ links from Fringe Presents listing
      const eventUrls = new Set();
      $('a[href*="/events/"]').each((i, el) => {
        const href = $(el).attr('href') || '';
        if (href.match(/\/events\/[a-z0-9-]+\/?$/) && !href.endsWith('/events/') && !href.includes('#')) {
          eventUrls.add(href.startsWith('http') ? href : BASE + href);
        }
      });

      console.log(`  Found ${eventUrls.size} Fringe event URLs`);

      // Fetch each event page for details
      for (const url of eventUrls) {
        try {
          const pageRes = await axios.get(url, { headers: HDR, timeout: 12000 });
          const $p = cheerio.load(pageRes.data);

          // Title: from h1 or page title
          let title = $p('h1').first().text().trim();
          if (!title) title = ($p('title').text() || '').split(/[|\u2013]/)[0].trim();
          if (!title) continue;
          title = title.replace(/\s*[-\u2013|]?\s*Vancouver Fringe\s*$/i, '').trim();
          if (title.length < 3) continue;

          // Image from og:image only
          const imageUrl = $p('meta[property="og:image"]').attr('content') || null;
          if (!imageUrl) continue;

          // Date from body text
          const bodyText = $p('body').text().replace(/\s+/g, ' ');
          const date = parseDate(bodyText);
          if (!date) {
            console.log(`  ⚠️ No date: ${title}`);
            continue;
          }

          events.push({
            id: uuidv4(),
            title,
            date,
            url,
            imageUrl,
            venue: { name: 'Vancouver Fringe Festival', address: '1895 Venables Street, Vancouver, BC V5L 2H6', city: 'Vancouver' },
            city: 'Vancouver',
            source: 'Vancouver Fringe Festival',
            description: ''
          });
          console.log(`  ✓ ${title} | ${date}`);
        } catch (_) {}
      }

      console.log(`Found ${events.length} total events from Vancouver Fringe Festival`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Vancouver Fringe Festival events:', error.message);
      return [];
    }
  }
};


module.exports = VancouverFringeEvents.scrape;
