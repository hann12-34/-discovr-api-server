/**
 * The Independent San Francisco Events Scraper
 * URL: https://www.theindependentsf.com/calendar
 * Live music venue in San Francisco
 * Indie, rock, electronic, hip-hop
 * Uses TicketWeb plugin with clean static HTML
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const IndependentSFEvents = {
  async scrape(city = 'San Francisco') {
    console.log('🎸 Scraping The Independent SF...');

    try {
      const response = await axios.get('https://www.theindependentsf.com/calendar', {
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
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'may': '05', 'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12'
      };

      const currentYear = new Date().getFullYear();

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

      $('img.event-img').each((i, el) => {
        allImgs.push($(el).attr('src') || '');
      });

      for (let i = 0; i < allNames.length; i++) {
        let title = allNames[i].title;
        if (!title || title.length < 2) continue;
        title = title.replace(/&#039;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"');

        let url = allNames[i].url;
        if (!url) continue;
        if (!url.startsWith('http')) url = 'https://www.theindependentsf.com' + url;
        if (/eventbrite|songkick|allevents|facebook\.com\/events/i.test(url)) continue;

        const dateText = allDates[i] || '';
        const dateMatch = dateText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})?/i);
        if (!dateMatch) continue;

        const monthNum = months[dateMatch[1].toLowerCase()];
        if (!monthNum) continue;
        const day = dateMatch[2].padStart(2, '0');
        const year = dateMatch[3] ? parseInt(dateMatch[3]) : currentYear;
        const isoDate = `${year}-${monthNum}-${day}`;
        if (new Date(isoDate) < new Date()) continue;

        const key = `${title}|${isoDate}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        const imageUrl = allImgs[i] || null;

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          imageUrl,
          description: '',
          venue: {
            name: 'The Independent',
            address: '628 Divisadero St, San Francisco, CA 94117',
            city: 'San Francisco'
          },
          city: 'San Francisco',
          category: 'Music',
          source: 'The Independent SF'
        });
      }

      console.log(`  ✅ Found ${events.length} Independent SF events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ Independent SF error: ${error.message}`);
      return [];
    }
  }
};

module.exports = IndependentSFEvents.scrape;
