/**
 * Cafe du Nord San Francisco Events Scraper
 * URL: https://www.cafedunord.com/events
 * Historic independent music venue in the Castro
 * Uses TicketWeb plugin with clean static HTML
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const CafeDuNordSFEvents = {
  async scrape(city = 'San Francisco') {
    console.log('🌉 Scraping Cafe du Nord San Francisco...');

    try {
      const response = await axios.get('https://www.cafedunord.com/events', {
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

      $('img.tw-event-image, img[class*="tw-"]').each((i, el) => {
        allImgs.push($(el).attr('src') || '');
      });

      for (let i = 0; i < allNames.length; i++) {
        const title = allNames[i].title;
        if (!title || title.length < 2) continue;

        let url = allNames[i].url;
        if (!url) continue;
        if (!url.startsWith('http')) url = 'https://cafedunord.com' + url;
        if (/eventbrite|songkick|allevents|facebook\.com\/events/i.test(url)) continue;

        const dateText = allDates[i] || '';
        // Format: "4.9" = month.day or "Apr 9, 2026" style
        let isoDate = '';
        const dotMatch = dateText.match(/^(\d{1,2})\.(\d{1,2})$/);
        const longMatch = dateText.match(/(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s*(\d{4})/i);

        if (dotMatch) {
          const m = parseInt(dotMatch[1]);
          const d = parseInt(dotMatch[2]);
          const year = m < currentMonth - 1 ? currentYear + 1 : currentYear;
          isoDate = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        } else if (longMatch) {
          const months = { january:'01',february:'02',march:'03',april:'04',may:'05',june:'06',july:'07',august:'08',september:'09',october:'10',november:'11',december:'12',jan:'01',feb:'02',mar:'03',apr:'04',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
          const m = months[longMatch[1].toLowerCase()];
          isoDate = `${longMatch[3]}-${m}-${String(parseInt(longMatch[2])).padStart(2,'0')}`;
        } else {
          continue;
        }

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
            name: 'Cafe du Nord',
            address: '2170 Market St, San Francisco, CA 94114',
            city: 'San Francisco'
          },
          city: 'San Francisco',
          category: 'Music',
          source: 'Cafe du Nord SF'
        });
      }

      console.log(`  ✅ Found ${events.length} Cafe du Nord events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ Cafe du Nord error: ${error.message}`);
      return [];
    }
  }
};

module.exports = CafeDuNordSFEvents.scrape;
