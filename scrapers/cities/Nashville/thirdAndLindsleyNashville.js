/**
 * 3rd and Lindsley Nashville Events Scraper
 * URL: https://www.3rdandlindsley.com/events
 * Premier live music venue in Nashville, TN
 * Uses TicketWeb plugin with clean static HTML
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const ThirdAndLindsleyEvents = {
  async scrape(city = 'Nashville') {
    console.log('🎶 Scraping 3rd and Lindsley Nashville...');

    try {
      const response = await axios.get('https://www.3rdandlindsley.com/events', {
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
        if (!url.startsWith('http')) url = 'https://3rdandlindsley.com' + url;
        if (/eventbrite|songkick|allevents|facebook\.com\/events/i.test(url)) continue;

        const dateText = allDates[i] || '';
        // Format: "April 09, 2026"
        const dateMatch = dateText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})/i);
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
            name: '3rd and Lindsley',
            address: '818 3rd Ave S, Nashville, TN 37210',
            city: 'Nashville'
          },
          city: 'Nashville',
          category: 'Music',
          source: '3rd and Lindsley Nashville'
        });
      }

      console.log(`  ✅ Found ${events.length} 3rd and Lindsley events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ 3rd and Lindsley error: ${error.message}`);
      return [];
    }
  }
};

module.exports = ThirdAndLindsleyEvents.scrape;
