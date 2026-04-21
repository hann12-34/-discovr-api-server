/**
 * Arts Club Theatre Events Scraper (Vancouver)
 * Scrapes upcoming events from Arts Club Theatre Company
 * Vancouver's premier professional theatre company
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const ArtsClubTheatreEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Arts Club Theatre (Vancouver)...');

    try {
      const response = await axios.get('https://artsclub.com/shows/', {
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
      const seenSlugs = new Set();

      // Arts Club uses img[src*="/illustrations/"] with alt=SHOW TITLE
      // Each illustration src: /shows/SEASON/img/illustrations/show-slug.ext
      const showImgs = $('img[src*="/shows/"][src*="/illustrations/"][alt]');
      const showData = [];

      showImgs.each((i, el) => {
        const alt = $(el).attr('alt') || '';
        const src = $(el).attr('src') || '';
        // Skip meta alt text (not a show title)
        if (!alt || /^(NOW PLAYING|STARTS|COMING SOON|ON SALE)/i.test(alt)) return;
        // Extract slug from src path
        const srcMatch = src.match(/\/shows\/([\d-]+)\/img\/illustrations\/([^.]+)\./);
        if (!srcMatch) return;
        const season = srcMatch[1];
        const slug = srcMatch[2];
        if (seenSlugs.has(slug)) return;
        seenSlugs.add(slug);

        // Only current/near-future seasons (skip past seasons)
        const currentYear = new Date().getFullYear();
        const seasonStart = parseInt(season.split('-')[0]);
        if (seasonStart < currentYear - 1) return;

        const title = alt.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ').trim();
        const url = `https://artsclub.com/shows/${season}/${slug}`;
        const imageUrl = `https://artsclub.com${src}`;
        showData.push({ title, url, imageUrl });
      });

      console.log(`  Found ${showData.length} shows from Arts Club Theatre listing`);

      // Fetch each show page for date (in parallel batches of 4)
      const BATCH = 4;
      for (let i = 0; i < showData.length; i += BATCH) {
        const batch = showData.slice(i, i + BATCH);
        await Promise.all(batch.map(async (show) => {
          try {
            const pageRes = await axios.get(show.url, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
              timeout: 10000
            });
            const $p = cheerio.load(pageRes.data);
            // Date format: "September 17–October 18, 2026" in [class*="date"] element
            const dateText = $p('[class*="date"]').first().text().trim() ||
                             $p('.run-dates, .show-dates, .performance-dates').first().text().trim();
            let date = null;
            if (dateText) {
              const dateMatch = dateText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}).*?(\d{4})/i);
              if (dateMatch) {
                const months = { january:'01', february:'02', march:'03', april:'04', may:'05', june:'06',
                                july:'07', august:'08', september:'09', october:'10', november:'11', december:'12' };
                const m = months[dateMatch[1].toLowerCase()];
                const d = dateMatch[2].padStart(2, '0');
                date = `${dateMatch[3]}-${m}-${d}`;
              }
            }
            if (!date) return;
            events.push({
              id: uuidv4(),
              title: show.title,
              date,
              url: show.url,
              imageUrl: show.imageUrl,
              venue: { name: 'Arts Club Theatre', address: '1585 Johnston Street, Vancouver, BC V6H 3R9', city: 'Vancouver' },
              city: 'Vancouver',
              source: 'Arts Club Theatre',
              description: ''
            });
          } catch (_) { /* skip */ }
        }));
      }

      console.log(`Found ${events.length} total events from Arts Club Theatre`);
      return filterEvents(events);

    } catch (error) {
      console.error('Error scraping Arts Club Theatre events:', error.message);
      return [];
    }
  }
};


module.exports = ArtsClubTheatreEvents.scrape;
