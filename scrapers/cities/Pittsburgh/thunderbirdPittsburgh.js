/**
 * Thunderbird Music Hall Pittsburgh Events Scraper
 * URL: https://www.thunderbirdmusichall.com/calendar
 * Live music venue in Lawrenceville, Pittsburgh
 * Indie, rock, electronic, folk
 * Uses RockHouse Events plugin with clean static HTML
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const ThunderbirdPittsburghEvents = {
  async scrape(city = 'Pittsburgh') {
    console.log('🎸 Scraping Thunderbird Pittsburgh...');

    try {
      const response = await axios.get('https://www.thunderbirdmusichall.com/calendar', {
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

      const currentYear = new Date().getFullYear();

      const allTitles = [];
      const allDates = [];
      const allUrls = [];
      const allImgs = [];

      $('[class*="rhp-event__title"]').each((i, el) => {
        allTitles.push($(el).text().trim());
      });

      $('.eventMonth.singleEventDate').each((i, el) => {
        allDates.push($(el).text().trim());
      });

      $('a.url[href*="/event/"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && !allUrls.includes(href)) allUrls.push(href);
      });

      $('img.eventListImage, img[class*="rhp-event__image"]').each((i, el) => {
        allImgs.push($(el).attr('src') || '');
      });

      for (let i = 0; i < allTitles.length; i++) {
        let title = allTitles[i];
        if (!title || title.length < 2) continue;
        title = title.replace(/&#8211;/g, '–').replace(/&amp;/g, '&');

        let url = allUrls[i] || '';
        if (!url) continue;
        if (!url.startsWith('http')) url = 'https://thunderbirdmusichall.com' + url;
        if (/eventbrite|songkick|allevents|facebook\.com\/events/i.test(url)) continue;

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

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          imageUrl: allImgs[i] || null,
          description: '',
          venue: {
            name: 'Thunderbird Music Hall',
            address: '4053 Butler St, Pittsburgh, PA 15201',
            city: 'Pittsburgh'
          },
          city: 'Pittsburgh',
          category: 'Music',
          source: 'Thunderbird Pittsburgh'
        });
      }

      console.log(`  ✅ Found ${events.length} Thunderbird Pittsburgh events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ Thunderbird Pittsburgh error: ${error.message}`);
      return [];
    }
  }
};

module.exports = ThunderbirdPittsburghEvents.scrape;
