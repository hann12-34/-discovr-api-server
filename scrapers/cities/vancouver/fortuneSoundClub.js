/**
 * Fortune Sound Club Events Scraper
 * Scrapes upcoming events from Fortune Sound Club
 * Vancouver's premier nightclub and electronic music venue
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const MONTHS = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };

function parseSquarespaceDate(text) {
  const m = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})/i);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase().substring(0, 3)];
  const day = m[2].padStart(2, '0');
  const now = new Date();
  let year = now.getFullYear();
  if ((parseInt(month) - 1) < now.getMonth() - 1) year += 1;
  return `${year}-${month}-${day}`;
}

const FortuneSoundClubEvents = {
  async scrape(city) {
    console.log('🎵 Scraping Fortune Sound Club...');

    try {
      const response = await axios.get('https://www.fortunesoundclub.com/events', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seen = new Set();
      const today = new Date().toISOString().slice(0, 10);

      $('.eventlist-event').each((i, el) => {
        const container = $(el);

        const titleEl = container.find('.eventlist-title-link, .eventlist-title a, h1 a, h2 a').first();
        const title = titleEl.text().trim() || container.find('h1,h2,h3').first().text().trim();
        if (!title || title.length < 2) return;

        const href = titleEl.attr('href') || container.find('a[href]').first().attr('href') || '';
        const url = href.startsWith('http') ? href : `https://www.fortunesoundclub.com${href}`;

        // ISO date from time[datetime]
        const isoDate = container.find('time[datetime]').first().attr('datetime');
        let eventDate = isoDate ? isoDate.slice(0, 10) : null;
        if (!eventDate) {
          const dateText = container.find('.eventlist-datetag, time, .event-date').first().text().trim();
          eventDate = parseSquarespaceDate(dateText);
        }
        if (!eventDate || eventDate < today) return;

        const key = `${title}|${eventDate}`;
        if (seen.has(key)) return;
        seen.add(key);

        // Squarespace image selector
        const img = container.find('.sqs-image-shape-container-element img, .image-block-wrapper img, img[src*="squarespace"]').first();
        let imageUrl = img.attr('src') || img.attr('data-src') || null;
        if (imageUrl && /logo|placeholder|favicon|icon/i.test(imageUrl)) imageUrl = null;

        events.push({
          id: uuidv4(),
          title,
          description: '',
          date: eventDate,
          url,
          imageUrl,
          venue: { name: 'Fortune Sound Club', address: '147 East Pender Street, Vancouver, BC V6A 1T6', city: 'Vancouver' },
          city: 'Vancouver',
          category: 'Nightlife',
          source: 'Fortune Sound Club'
        });
      });

      console.log(`✅ Found ${events.length} Fortune Sound Club events`);
      return events;

    } catch (error) {
      console.error('Error:', error.message);
      return [];
    }
  }
};


module.exports = FortuneSoundClubEvents.scrape;
