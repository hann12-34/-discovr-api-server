/**
 * Snug Harbor Jazz Bistro New Orleans Events Scraper
 * URL: https://www.snugjazz.com/events
 * Premier jazz club on Frenchmen Street
 * Uses TicketWeb plugin with clean static HTML
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const SnugJazzNolaEvents = {
  async scrape(city = 'New Orleans') {
    console.log('🎺 Scraping Snug Harbor Jazz New Orleans...');

    try {
      const response = await axios.get('https://www.snugjazz.com/events', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 20000,
        validateStatus: (status) => status < 500
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seen = new Set();

      const months = {
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'may': '05', 'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12'
      };

      const now = new Date();
      const currentYear = now.getFullYear();

      const allNames = [];
      const allDates = [];
      const allImgs = [];

      $('.tw-name').each((i, el) => {
        const link = $(el).find('a');
        allNames.push({ title: link.text().trim(), url: link.attr('href') || '' });
      });

      $('.tw-event-date').each((i, el) => {
        allDates.push($(el).text().trim());
      });

      $('img.tw-event-image, img[class*="tw-"]').each((i, el) => {
        allImgs.push($(el).attr('src') || '');
      });

      for (let i = 0; i < allNames.length; i++) {
        const title = allNames[i].title;
        if (!title || title.length < 2) continue;

        let url = allNames[i].url;
        if (!url) continue;
        if (!url.startsWith('http')) url = 'https://snugjazz.com' + url;
        if (/eventbrite|songkick|allevents|facebook\.com\/events/i.test(url)) continue;

        const dateText = allDates[i] || '';
        // Format: "April 7th, 2026" or "April 7, 2026"
        const dateMatch = dateText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i);
        if (!dateMatch) continue;

        const monthNum = months[dateMatch[1].toLowerCase()];
        if (!monthNum) continue;
        const day = String(parseInt(dateMatch[2])).padStart(2, '0');
        const year = dateMatch[3] || currentYear;
        const isoDate = `${year}-${monthNum}-${day}`;
        if (new Date(isoDate) < now) continue;

        const key = `${title}|${isoDate}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          imageUrl: allImgs[i] || null,
          description: '',
          venue: {
            name: 'Snug Harbor Jazz Bistro',
            address: '626 Frenchmen St, New Orleans, LA 70116',
            city: 'New Orleans'
          },
          city: 'New Orleans',
          category: 'Music',
          source: 'Snug Harbor Jazz NOLA'
        });
      }

      console.log(`  ✅ Found ${events.length} Snug Harbor Jazz events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ Snug Harbor Jazz error: ${error.message}`);
      return [];
    }
  }
};

module.exports = SnugJazzNolaEvents.scrape;
