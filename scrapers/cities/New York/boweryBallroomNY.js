/**
 * Bowery Ballroom New York Events Scraper
 * URL: https://www.boweryballroom.com/events
 * Legendary indie/rock venue on Delancey St
 * Uses TicketWeb plugin with clean static HTML
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const BoweryBallroomNYEvents = {
  async scrape(city = 'New York') {
    console.log('🗽 Scraping Bowery Ballroom New York...');

    try {
      const response = await axios.get('https://www.boweryballroom.com/events', {
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
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
        'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
        'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
      };

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

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
        const title = allNames[i].title;
        if (!title || title.length < 2) continue;

        let url = allNames[i].url;
        if (!url) continue;
        if (!url.startsWith('http')) url = 'https://boweryballroom.com' + url;
        if (/eventbrite|songkick|allevents|facebook\.com\/events/i.test(url)) continue;

        const dateText = allDates[i] || '';
        // Format: "Thu Apr 9, 2026" or "Apr 9, 2026"
        const dateMatch = dateText.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s*(\d{4})/i);
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
            name: 'Bowery Ballroom',
            address: '6 Delancey St, New York, NY 10002',
            city: 'New York'
          },
          city: 'New York',
          category: 'Music',
          source: 'Bowery Ballroom NY'
        });
      }

      console.log(`  ✅ Found ${events.length} Bowery Ballroom events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ Bowery Ballroom error: ${error.message}`);
      return [];
    }
  }
};

module.exports = BoweryBallroomNYEvents.scrape;
