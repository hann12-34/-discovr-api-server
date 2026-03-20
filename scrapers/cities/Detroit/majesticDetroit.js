/**
 * The Majestic Detroit Events Scraper
 * URL: https://www.majesticdetroit.com/calendar
 * Historic entertainment complex in Detroit
 * Venues: Majestic Theatre, Magic Stick, Garden Bowl, The Alley Deck
 * Uses TicketWeb plugin with clean static HTML
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const venueMap = {
  'majestic theatre': { name: 'Majestic Theatre', address: '4140 Woodward Ave, Detroit, MI 48201' },
  'magic stick': { name: 'Magic Stick', address: '4120 Woodward Ave, Detroit, MI 48201' },
  'garden bowl': { name: 'Garden Bowl', address: '4120 Woodward Ave, Detroit, MI 48201' },
  'the alley deck': { name: 'The Alley Deck', address: '4120 Woodward Ave, Detroit, MI 48201' }
};

const MajesticDetroitEvents = {
  async scrape(city = 'Detroit') {
    console.log('🎸 Scraping Majestic Detroit...');

    try {
      const response = await axios.get('https://www.majesticdetroit.com/calendar', {
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
      const allVenues = [];
      const allImgs = [];

      $('.tw-name').each((i, el) => {
        const link = $(el).find('a');
        allNames.push({ title: link.text().trim(), url: link.attr('href') || '' });
      });

      $('.tw-event-date').each((i, el) => {
        allDates.push($(el).text().trim());
      });

      $('.tw-venue-name').each((i, el) => {
        allVenues.push($(el).text().trim().replace(/,$/, ''));
      });

      $('img.event-img').each((i, el) => {
        allImgs.push($(el).attr('src') || '');
      });

      for (let i = 0; i < allNames.length; i++) {
        let title = allNames[i].title;
        if (!title || title.length < 2) continue;
        title = title.replace(/&#039;/g, "'").replace(/&amp;/g, '&');

        let url = allNames[i].url;
        if (!url) continue;
        if (!url.startsWith('http')) url = 'https://www.majesticdetroit.com' + url;
        if (/eventbrite|songkick|allevents|facebook\.com\/events/i.test(url)) continue;

        const dateText = allDates[i] || '';
        const dateMatch = dateText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})/i);
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

        const venueName = (allVenues[i] || '').toLowerCase();
        const venueInfo = venueMap[venueName] || venueMap['majestic theatre'];

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          imageUrl: allImgs[i] || null,
          description: '',
          venue: { ...venueInfo, city: 'Detroit' },
          city: 'Detroit',
          category: 'Music',
          source: 'Majestic Detroit'
        });
      }

      console.log(`  ✅ Found ${events.length} Majestic Detroit events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ Majestic Detroit error: ${error.message}`);
      return [];
    }
  }
};

module.exports = MajesticDetroitEvents.scrape;
