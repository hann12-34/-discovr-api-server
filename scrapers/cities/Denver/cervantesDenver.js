/**
 * Cervantes' Masterpiece Ballroom Denver Events Scraper
 * URL: https://www.cervantesmasterpiece.com/calendar
 * Live music venue in Denver - EDM, jam bands, hip-hop, funk
 * Venues: Cervantes' Masterpiece Ballroom, Cervantes' Other Side
 * Uses RockHouse Events plugin with clean static HTML
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const venueMap = {
  'cervantes-masterpiece-ballroom': { name: "Cervantes' Masterpiece Ballroom", address: '2637 Welton St, Denver, CO 80205' },
  'cervantes-other-side': { name: "Cervantes' Other Side", address: '2635 Welton St, Denver, CO 80205' },
  'mission-ballroom': { name: 'Mission Ballroom', address: '4242 Wynkoop St, Denver, CO 80216' }
};

const CervantesDenverEvents = {
  async scrape(city = 'Denver') {
    console.log('🎸 Scraping Cervantes Denver...');

    try {
      const response = await axios.get('https://www.cervantesmasterpiece.com/calendar', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 20000
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seen = new Set();

      const months = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
        'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
        'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
      };

      const currentYear = new Date().getFullYear();

      $('.eventDesktopView .rhp-event-thumb').closest('.row, [class*="eventWrapper"], [class*="col-12"]').each((i, el) => {
        // Walk up to the full event container
        const container = $(el).closest('.eventDesktopView').length ? $(el).closest('.eventDesktopView') : $(el);
        // Fallback: use the parent structure
        const root = container.length ? container : $(el);

        const titleEl = root.find('.rhp-event__title--list');
        const title = titleEl.text().trim();
        if (!title || title.length < 2) return;

        const linkEl = root.find('a.url[href*="/event/"]').first();
        let url = linkEl.attr('href');
        if (!url) return;
        if (!url.startsWith('http')) url = 'https://cervantesmasterpiece.com' + url;

        const dateEl = root.find('.eventMonth.singleEventDate');
        const dateText = dateEl.text().trim();
        if (!dateText) return;

        const dateMatch = dateText.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i);
        if (!dateMatch) return;

        const monthNum = months[dateMatch[1].toLowerCase()];
        if (!monthNum) return;
        const day = dateMatch[2].padStart(2, '0');
        let year = currentYear;
        if (parseInt(monthNum) < new Date().getMonth()) year++;
        const isoDate = `${year}-${monthNum}-${day}`;
        if (new Date(isoDate) < new Date()) return;

        const key = `${title}|${isoDate}`.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);

        // Extract venue from URL path
        const urlParts = url.replace(/\/$/, '').split('/');
        const venueSlug = urlParts.length >= 3 ? urlParts[urlParts.length - 2] : '';
        const venueInfo = venueMap[venueSlug] || {
          name: "Cervantes' Masterpiece Ballroom",
          address: '2637 Welton St, Denver, CO 80205'
        };

        const img = root.find('.eventListImage, .rhp-event__image--list');
        let imageUrl = img.attr('src') || null;

        events.push({
          id: uuidv4(),
          title: title.replace(/&amp;/g, '&'),
          date: isoDate,
          url,
          imageUrl,
          description: '',
          venue: { ...venueInfo, city: 'Denver' },
          city: 'Denver',
          category: 'Music',
          source: 'Cervantes Denver'
        });
      });

      // Fallback: parse all event blocks directly if above selector missed them
      if (events.length === 0) {
        const allTitles = [];
        const allDates = [];
        const allUrls = [];
        const allImgs = [];

        $('.rhp-event__title--list').each((i, el) => {
          allTitles.push($(el).text().trim());
        });

        $('.eventMonth.singleEventDate').each((i, el) => {
          allDates.push($(el).text().trim());
        });

        $('a.url[href*="/event/"]').each((i, el) => {
          const href = $(el).attr('href');
          if (href && !allUrls.includes(href)) allUrls.push(href);
        });

        $('img.eventListImage, img.rhp-event__image--list').each((i, el) => {
          allImgs.push($(el).attr('src') || '');
        });

        for (let i = 0; i < allTitles.length; i++) {
          const title = allTitles[i];
          if (!title || title.length < 2) continue;

          let url = allUrls[i] || '';
          if (!url) continue;
          if (!url.startsWith('http')) url = 'https://cervantesmasterpiece.com' + url;

          const dateText = allDates[i] || '';
          const dateMatch = dateText.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i);
          if (!dateMatch) continue;

          const monthNum = months[dateMatch[1].toLowerCase()];
          if (!monthNum) continue;
          const day = dateMatch[2].padStart(2, '0');
          let year = currentYear;
          if (parseInt(monthNum) < new Date().getMonth()) year++;
          const isoDate = `${year}-${monthNum}-${day}`;
          if (new Date(isoDate) < new Date()) continue;

          const key = `${title}|${isoDate}`.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);

          const urlParts = url.replace(/\/$/, '').split('/');
          const venueSlug = urlParts.length >= 3 ? urlParts[urlParts.length - 2] : '';
          const venueInfo = venueMap[venueSlug] || {
            name: "Cervantes' Masterpiece Ballroom",
            address: '2637 Welton St, Denver, CO 80205'
          };

          events.push({
            id: uuidv4(),
            title: title.replace(/&amp;/g, '&'),
            date: isoDate,
            url,
            imageUrl: allImgs[i] || null,
            description: '',
            venue: { ...venueInfo, city: 'Denver' },
            city: 'Denver',
            category: 'Music',
            source: 'Cervantes Denver'
          });
        }
      }

      console.log(`  ✅ Found ${events.length} Cervantes Denver events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ Cervantes Denver error: ${error.message}`);
      return [];
    }
  }
};

module.exports = CervantesDenverEvents.scrape;
