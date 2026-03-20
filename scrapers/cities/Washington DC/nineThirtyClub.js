/**
 * 9:30 Club Washington DC Events Scraper
 * URL: https://www.930.com/calendar
 * Iconic live music venue in Washington DC
 * Rock, indie, electronic, hip-hop, alternative
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const NineThirtyClubEvents = {
  async scrape(city = 'Washington DC') {
    console.log('🎸 Scraping 9:30 Club DC...');

    try {
      const response = await axios.get('https://www.930.com/calendar', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 15000,
        validateStatus: (status) => status < 500
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seen = new Set();

      const months = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
        'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
        'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12'
      };

      const currentYear = new Date().getFullYear();

      $('li[class*="eb-event-id"]').each((i, el) => {
        const li = $(el);

        const titleEl = li.find('.event-title').first();
        const title = titleEl.text().trim();
        if (!title || title.length < 2) return;

        const link = li.find('a[href*="/e/"]');
        let url = link.attr('href') || '';
        if (!url) return;
        if (!url.startsWith('http')) url = 'https://www.930.com' + url;

        const dateText = li.find('.event-date').text().trim();
        if (!dateText) return;

        const dateMatch = dateText.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})/i);
        if (!dateMatch) return;

        const monthKey = dateMatch[1].toLowerCase().substring(0, 3);
        const monthNum = months[monthKey] || months[dateMatch[1].toLowerCase()];
        if (!monthNum) return;
        const day = dateMatch[2].padStart(2, '0');
        let year = currentYear;
        if (parseInt(monthNum) < new Date().getMonth()) year++;
        const isoDate = `${year}-${monthNum}-${day}`;
        if (new Date(isoDate) < new Date()) return;

        const key = `${title}|${isoDate}`.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          imageUrl: null,
          description: '',
          venue: {
            name: '9:30 Club',
            address: '815 V St NW, Washington, DC 20001',
            city: 'Washington DC'
          },
          city: 'Washington DC',
          category: 'Music',
          source: '9:30 Club'
        });
      });

      console.log(`  ✅ Found ${events.length} 9:30 Club events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ 9:30 Club error: ${error.message}`);
      return [];
    }
  }
};

module.exports = NineThirtyClubEvents.scrape;
