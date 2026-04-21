/**
 * Theatre Under the Stars (TUTS) Events Scraper
 * Scrapes shows from TUTS at Malkin Bowl in Stanley Park
 * Vancouver's beloved outdoor musical theatre
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const BASE = 'https://www.tuts.ca';
const HDR = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

const MONTHS = { jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06', jul:'07', aug:'08', sep:'09', oct:'10', nov:'11', dec:'12' };

function parseFirstDate(bodyText) {
  // Pattern: "Dates...FridayJul 3Preview...ShowTitle" - extract first date
  const m = bodyText.match(/Dates.*?(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})/i);
  if (!m) return null;
  const mo = MONTHS[m[1].toLowerCase().substring(0,3)];
  if (!mo) return null;
  const year = new Date().getFullYear();
  // If month is past, use next year
  const d = m[2].padStart(2, '0');
  return `${year}-${mo}-${d}`;
}

const TUTSEvents = {
  async scrape(city) {
    console.log('🎭 Scraping Theatre Under the Stars (TUTS)...');
    const events = [];

    try {
      const listRes = await axios.get(`${BASE}/shows-and-tickets/on-stage/`, { headers: HDR, timeout: 15000 });
      const $ = cheerio.load(listRes.data);

      // Collect unique show URLs
      const showUrls = new Set();
      $('a[href*="/show/"]').each((i, el) => {
        const href = $(el).attr('href') || '';
        if (href.match(/\/show\/[a-z0-9-]+\/?$/) && !href.includes('#')) {
          showUrls.add(href.startsWith('http') ? href : BASE + href);
        }
      });

      console.log(`  Found ${showUrls.size} show URLs`);

      for (const url of showUrls) {
        try {
          const showRes = await axios.get(url, { headers: HDR, timeout: 12000 });
          const $s = cheerio.load(showRes.data);

          // Title from page <title> tag (most reliable on TUTS)
          let title = ($s('title').first().text() || '').split('|')[0].trim();
          if (!title || title === 'On Stage') {
            // Fallback to URL slug
            const slug = url.replace(/\/$/, '').split('/').pop();
            title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          }
          title = title.replace(/\s*[|–-]\s*Theatre Under the Stars\s*$/i, '').trim();
          if (!title || title.length < 2) continue;

          // Image: first wp-content/uploads data-src, strip thumbnail size suffix
          let imageUrl = null;
          $s('[data-src]').each((i, el) => {
            if (imageUrl) return;
            const src = $s(el).attr('data-src') || '';
            if (src.includes('/wp-content/uploads/') && !src.includes('.js') && !src.includes('.svg') && !src.includes('.css')) {
              // Use original size (remove -WxH suffix)
              imageUrl = src.replace(/-\d+x\d+(\.\w+)$/, '$1');
            }
          });

          // Date: parse opening date from the performance schedule in body text
          const bodyText = $s('body').text().replace(/\s+/g, ' ');
          const date = parseFirstDate(bodyText);
          if (!date) {
            console.log(`  ⚠️ No date found for: ${title}`);
            continue;
          }

          events.push({
            id: uuidv4(),
            title,
            date,
            url,
            imageUrl,
            venue: {
              name: 'Malkin Bowl (TUTS)',
              address: '610 Pipeline Road, Stanley Park, Vancouver, BC V6G 1Z4',
              city: 'Vancouver'
            },
            city: 'Vancouver',
            source: 'Theatre Under the Stars',
            description: ''
          });

          console.log(`  ✓ ${title} | ${date} | img: ${imageUrl ? '✅' : '❌'}`);
        } catch (err) {
          console.log(`  ✗ Failed: ${url} - ${err.message.substring(0, 40)}`);
        }
      }

      const filtered = filterEvents(events);
      console.log(`✅ TUTS: ${filtered.length} shows`);
      return filtered;
    } catch (err) {
      console.error('TUTS scraper error:', err.message);
      return [];
    }
  }
};

module.exports = TUTSEvents.scrape;
