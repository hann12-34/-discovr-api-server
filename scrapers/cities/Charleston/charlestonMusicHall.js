/**
 * Charleston Music Hall Events Scraper
 * URL: https://www.charlestonmusichall.com/calendar
 * Historic music venue in downtown Charleston, SC
 * Rock, folk, comedy, jazz, country
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const CharlestonMusicHallEvents = {
  async scrape(city = 'Charleston') {
    console.log('🎵 Scraping Charleston Music Hall...');

    try {
      const response = await axios.get('https://www.charlestonmusichall.com/calendar', {
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

      const allTitles = [];
      const allDates = [];
      const allUrls = [];
      const allImgs = [];

      $('.event-title').each((i, el) => {
        const link = $(el).find('a');
        allTitles.push(link.text().trim());
        allUrls.push(link.attr('href') || '');
      });

      $('.event-date').each((i, el) => {
        allDates.push($(el).text().trim());
      });

      $('img.event-image, .event-image img').each((i, el) => {
        allImgs.push($(el).attr('src') || '');
      });

      for (let i = 0; i < allTitles.length; i++) {
        let title = allTitles[i];
        if (!title || title.length < 2) continue;

        let url = allUrls[i];
        if (!url) continue;
        if (!url.startsWith('http')) url = 'https://charlestonmusichall.com' + url;
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

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          imageUrl: allImgs[i] || null,
          description: '',
          venue: {
            name: 'Charleston Music Hall',
            address: '37 John St, Charleston, SC 29403',
            city: 'Charleston'
          },
          city: 'Charleston',
          category: 'Music',
          source: 'Charleston Music Hall'
        });
      }

      console.log(`  ✅ Found ${events.length} Charleston Music Hall events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ Charleston Music Hall error: ${error.message}`);
      return [];
    }
  }
};

module.exports = CharlestonMusicHallEvents.scrape;
