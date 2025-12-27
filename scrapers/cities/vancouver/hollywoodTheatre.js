/**
 * Hollywood Theatre Events Scraper
 * Scrapes events from hollywoodtheatre.ca - Vancouver's historic theatre
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const VENUE = {
  name: 'Hollywood Theatre',
  address: '3123 W Broadway, Vancouver, BC V6K 2H2',
  city: 'Vancouver'
};

const HollywoodTheatreEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Hollywood Theatre...');

    try {
      const response = await axios.get('https://www.hollywoodtheatre.ca/events', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seenUrls = new Set();

      // Find all event items
      $('.event_item-2, .w-dyn-item').each((i, el) => {
        const $item = $(el);
        
        // Get event URL
        const $link = $item.find('a[href*="/events/"]').first();
        let url = $link.attr('href');
        if (!url) return;
        
        if (!url.startsWith('http')) {
          url = 'https://www.hollywoodtheatre.ca' + url;
        }
        
        if (seenUrls.has(url)) return;
        seenUrls.add(url);
        
        // Get title
        const title = $item.find('.heading-small-3, [fs-cmsfilter-field="name"]').text().trim();
        if (!title || title.length < 2) return;
        
        // Get date from the date wrapper
        const monthText = $item.find('.text-style-allcaps').first().text().trim();
        const dayText = $item.find('.heading-style-h4').first().text().trim();
        
        if (!monthText || !dayText) return;
        
        // Convert month abbreviation to number
        const months = {
          'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
          'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
          'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
        };
        
        const monthNum = months[monthText.toLowerCase()];
        if (!monthNum) return;
        
        const day = dayText.padStart(2, '0');
        
        // Determine year (if month is in the past, use next year)
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        const eventMonth = parseInt(monthNum);
        const year = eventMonth < currentMonth ? currentYear + 1 : currentYear;
        
        const dateText = `${year}-${monthNum}-${day}`;
        
        // Get image
        const image = $item.find('img').first().attr('src') || null;
        
        events.push({
          id: uuidv4(),
          title: title,
          date: dateText,
          url: url,
          venue: VENUE,
          city: 'Vancouver',
          description: null,
          image: image,
          source: 'Hollywood Theatre'
        });
      });

      console.log(`Found ${events.length} total events from Hollywood Theatre`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Hollywood Theatre:', error.message);
      return [];
    }
  }
};

module.exports = HollywoodTheatreEvents.scrape;
