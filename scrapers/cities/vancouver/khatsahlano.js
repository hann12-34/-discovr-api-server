/**
 * Khatsahlano Music & Arts Festival Scraper
 * Annual free outdoor street festival on West 4th Avenue, Vancouver
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const BASE = 'https://khatsahlano.com';
const HDR = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};
const MONTHS = { january:'01', february:'02', march:'03', april:'04', may:'05', june:'06',
                 july:'07', august:'08', september:'09', october:'10', november:'11', december:'12' };

const KhatsahlanoEvents = {
  async scrape(city) {
    console.log('🎸 Scraping Khatsahlano Festival...');

    try {
      const res = await axios.get(BASE + '/', { headers: HDR, timeout: 12000 });
      const $ = cheerio.load(res.data);

      // Extract festival date from page content
      const body = $('body').text().replace(/\s+/g, ' ');
      const dateMatch = body.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})/i);
      if (!dateMatch) {
        console.log('  ⚠️ Could not determine Khatsahlano date');
        return [];
      }
      const mo = MONTHS[dateMatch[1].toLowerCase()];
      const d = dateMatch[2].padStart(2, '0');
      const festDate = `${dateMatch[3]}-${mo}-${d}`;
      console.log(`  Festival date: ${festDate}`);

      // Festival image from og:image
      const imageUrl = $('meta[property="og:image"]').attr('content') || null;

      const event = {
        id: uuidv4(),
        title: 'Khatsahlano Music & Arts Festival',
        date: festDate,
        url: BASE + '/',
        imageUrl,
        venue: {
          name: 'West 4th Avenue',
          address: 'West 4th Avenue, Vancouver, BC V6K 1N5',
          city: 'Vancouver'
        },
        city: 'Vancouver',
        source: 'Khatsahlano Festival',
        description: ''
      };

      const filtered = filterEvents([event]);
      console.log(`✅ Khatsahlano: ${filtered.length} event | date: ${festDate} | img: ${imageUrl ? '✅' : '❌'}`);
      return filtered;
    } catch (err) {
      console.error('Khatsahlano scraper error:', err.message);
      return [];
    }
  }
};

module.exports = KhatsahlanoEvents.scrape;
