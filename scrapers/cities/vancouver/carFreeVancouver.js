/**
 * Car Free Vancouver Festival Scraper
 * Annual free street festivals across multiple Vancouver neighbourhoods
 * Main Commercial Drive event typically in June
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const BASE = 'https://carfreevancouver.org';
const HDR = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};
const MONTHS = { january:'01', february:'02', march:'03', april:'04', may:'05', june:'06',
                 july:'07', august:'08', september:'09', october:'10', november:'11', december:'12' };

function extractDate(text) {
  // Only accept summer months as the festival date (not application deadlines in spring)
  const m = text.match(/(June|July|August)\s+(\d{1,2}),?\s*(\d{4})/i);
  if (!m) return null;
  const mo = MONTHS[m[1].toLowerCase()];
  return `${m[3]}-${mo}-${m[2].padStart(2,'0')}`;
}

const CarFreeVancouverEvents = {
  async scrape(city) {
    console.log('🚗 Scraping Car Free Vancouver...');
    const events = [];

    try {
      const res = await axios.get(BASE + '/', { headers: HDR, timeout: 12000 });
      const $ = cheerio.load(res.data);

      const body = $('body').text().replace(/\s+/g, ' ');
      const festImg = $('meta[property="og:image"]').attr('content') || null;

      // Extract festival date from homepage body text
      const date = extractDate(body);
      if (!date) {
        console.log('  ⚠️ Could not determine Car Free Day date');
        return [];
      }
      if (!festImg) {
        console.log('  ⚠️ No image found');
        return [];
      }

      events.push({
        id: uuidv4(),
        title: 'Car Free Day Vancouver',
        date,
        url: BASE + '/',
        imageUrl: festImg,
        venue: {
          name: 'Commercial Drive',
          address: 'Commercial Drive, Vancouver, BC V5L 3X5',
          city: 'Vancouver'
        },
        city: 'Vancouver',
        source: 'Car Free Vancouver',
        description: ''
      });

      const filtered = filterEvents(events);
      console.log(`✅ Car Free Vancouver: ${filtered.length} events`);
      return filtered;
    } catch (err) {
      console.error('Car Free Vancouver scraper error:', err.message);
      return [];
    }
  }
};

module.exports = CarFreeVancouverEvents.scrape;
