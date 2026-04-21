/**
 * Commodore Ballroom Events Scraper
 * Source: https://www.commodoreballroom.com/shows
 * Address: 868 Granville Street, Vancouver, BC V6Z 1K3
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const VENUE = { name: 'Commodore Ballroom', address: '868 Granville Street, Vancouver, BC V6Z 1K3', city: 'Vancouver' };
const BASE_URL = 'https://www.commodoreballroom.com';

const CommodoreBallroomEvents = {
  async scrape(city = 'Vancouver') {
    console.log('🎸 Scraping Commodore Ballroom...');

    try {
      const response = await axios.get(`${BASE_URL}/shows`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 20000
      });

      const d = response.data;
      const today = new Date().toISOString().slice(0, 10);

      // Build slug→image map from embedded escaped JSON
      // Page embeds event data as escaped JSON: \"slug\":\"name\" \"images\":[{\"url\":\"https://...\"}]
      const slugImgMap = {};
      const imgPat = /\\\"slug\\\":\\\"([^\\\"]+)\\\"[^[]{1,800}\\\"images\\\":\[{\\\"type\\\":\\\"image\\\",\\\"url\\\":\\\"(https:\/\/[^\\\"]+)\\\"/g;
      let im;
      while ((im = imgPat.exec(d)) !== null) {
        if (!slugImgMap[im[1]]) slugImgMap[im[1]] = im[2];
      }

      // Extract events: name, slug, start_date_local
      const eventPat = /\\\"name\\\":\\\"([^\\\"]+)\\\",\\\"slug\\\":\\\"([^\\\"]+)\\\",\\\"url\\\"[^,]+,\\\"type\\\":\\\"[^\\\"]+\\\",\\\"start_date_local\\\":\\\"([^\\\"]+)\\\"/g;
      const events = [];
      const seenSlugs = new Set();
      let em;

      while ((em = eventPat.exec(d)) !== null) {
        const rawName = em[1];
        const slug = em[2];
        const dateStr = em[3];

        if (!slug || !dateStr || seenSlugs.has(slug)) continue;
        if (dateStr < today) continue;
        seenSlugs.add(slug);

        const title = rawName.replace(/\\u0026/g, '&').replace(/\\"/g, '"').trim();
        if (!title || title.length < 2) continue;

        const eventUrl = `${BASE_URL}/shows/${slug}`;

        // Find image: try exact slug match, then progressively shorter prefix matches
        let imageUrl = slugImgMap[slug] || null;
        if (!imageUrl) {
          const parts = slug.split('-');
          for (let len = Math.min(parts.length - 1, 4); len >= 2; len--) {
            const prefix = parts.slice(0, len).join('-');
            const match = Object.entries(slugImgMap).find(([k]) => k === prefix || k.startsWith(prefix + '-'));
            if (match) { imageUrl = match[1]; break; }
          }
        }

        events.push({
          id: uuidv4(),
          title,
          date: dateStr,
          url: eventUrl,
          imageUrl: imageUrl || null,
          description: '',
          venue: VENUE,
          city,
          source: 'commodore-ballroom'
        });
      }

      // Fetch og:image from event pages for events that still lack images
      const noImg = events.filter(e => !e.imageUrl);
      if (noImg.length > 0) {
        const _cheerio = require('cheerio');
        await Promise.all(noImg.map(async (ev) => {
          try {
            const r = await axios.get(ev.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 });
            const $p = _cheerio.load(r.data);
            const og = $p('meta[property="og:image"]').attr('content');
            if (og && og.startsWith('http') && !/logo|placeholder|favicon/i.test(og)) ev.imageUrl = og;
          } catch (e) { /* skip */ }
        }));
      }

      console.log(`✅ Commodore Ballroom: ${events.length} events`);
      return filterEvents(events);

    } catch (error) {
      console.error('Error scraping Commodore Ballroom:', error.message);
      return [];
    }
  }
};

module.exports = CommodoreBallroomEvents.scrape;

