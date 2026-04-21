/**
 * Italian Day on The Drive - Vancouver Scraper
 * Annual cultural festival on Commercial Drive
 * Typically held in June
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const BASE = 'https://italianday.ca';
const HDR = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};
const MONTHS = { january:'01', february:'02', march:'03', april:'04', may:'05', june:'06',
                 july:'07', august:'08', september:'09', october:'10', november:'11', december:'12' };

const ItalianDayEvents = {
  async scrape(city) {
    console.log('🇮🇹 Scraping Italian Day on The Drive...');

    try {
      const res = await axios.get(BASE + '/', { headers: HDR, timeout: 12000 });
      const $ = cheerio.load(res.data);

      const body = $('body').text().replace(/\s+/g, ' ');

      // Find date: "JUNE 14 2026" or "June 14, 2026"
      const dateMatch = body.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})/i);
      if (!dateMatch) {
        console.log('  ⚠️ Could not determine Italian Day date');
        return [];
      }
      const mo = MONTHS[dateMatch[1].toLowerCase()];
      const d = dateMatch[2].padStart(2, '0');
      const festDate = `${dateMatch[3]}-${mo}-${d}`;
      console.log(`  Festival date: ${festDate}`);

      // Get image: og:image or first content img
      let imageUrl = $('meta[property="og:image"]').attr('content') || null;
      if (!imageUrl) {
        $('img[src*="http"]').each((i, el) => {
          if (imageUrl) return;
          const src = $(el).attr('src');
          if (src && !src.includes('logo') && !src.includes('icon') && !src.includes('sponsor')) {
            imageUrl = src;
          }
        });
      }

      // Get event URL (look for a more specific event page)
      let eventUrl = BASE + '/';
      $('a[href]').each((i, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().toLowerCase();
        if (text.includes('event') || text.includes('festival') || text.includes('program')) {
          if (href.startsWith('http') || href.startsWith('/')) {
            eventUrl = href.startsWith('http') ? href : BASE + href;
          }
        }
      });

      const event = {
        id: uuidv4(),
        title: 'Italian Day on The Drive',
        date: festDate,
        url: BASE + '/',
        imageUrl,
        venue: {
          name: 'Commercial Drive',
          address: 'Commercial Drive, Vancouver, BC V5L 3X5',
          city: 'Vancouver'
        },
        city: 'Vancouver',
        source: 'Italian Day on The Drive',
        description: ''
      };

      const filtered = filterEvents([event]);
      console.log(`✅ Italian Day: ${filtered.length} event | date: ${festDate} | img: ${imageUrl ? '✅' : '❌'}`);
      return filtered;
    } catch (err) {
      console.error('Italian Day scraper error:', err.message);
      return [];
    }
  }
};

module.exports = ItalianDayEvents.scrape;
