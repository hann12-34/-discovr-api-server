/**
 * PNE Forum Events Scraper
 * Scrapes events from PNE Forum at Hastings Park
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

const VENUE_ADDRESSES = {
  'PNE Forum': '2901 E Hastings St, Vancouver, BC V5K 5J1',
  'Pacific Coliseum': '100 N Renfrew St, Vancouver, BC V5K 3N7',
};

const PNEForumEvents = {
  async scrape(city) {
    console.log('🎪 Scraping PNE events via Tribe Events API...');

    try {
      const events = [];
      const seenUrls = new Set();
      const today = new Date().toISOString().slice(0, 10);
      let page = 1;
      const maxPages = 5;

      while (page <= maxPages) {
        const url = `https://www.pne.ca/wp-json/tribe/events/v1/events?per_page=50&page=${page}`;
        let data;
        try {
          const response = await axios.get(url, { headers: HEADERS, timeout: 15000 });
          data = response.data;
        } catch (err) {
          if (err.response?.status === 404) break;
          console.log(`  Page ${page} error: ${err.message}`);
          break;
        }

        if (!data.events || data.events.length === 0) break;

        for (const item of data.events) {
          const eventUrl = item.url || '';
          if (!eventUrl || seenUrls.has(eventUrl)) continue;
          seenUrls.add(eventUrl);

          const title = (item.title || '').replace(/&#[0-9]+;/g, (m) => {
            const code = parseInt(m.slice(2,-1));
            return code === 8211 ? '–' : code === 38 ? '&' : code === 8217 ? "'" : m;
          }).trim();
          if (!title || title.length < 3) continue;

          const startDate = (item.start_date || '').slice(0, 10);
          if (!startDate || startDate < today) continue;

          const venue = Array.isArray(item.venue) ? {} : (item.venue || {});
          const venueName = (venue.venue || 'PNE').trim();
          const address = (venue.address || '').trim();
          const venueCity = (venue.city || 'Vancouver').trim();
          const fullAddress = address
            ? `${address}, ${venueCity}, BC`
            : VENUE_ADDRESSES[venueName] || `${venueCity}, BC`;

          if (!fullAddress || fullAddress.length < 5) continue;

          let description = '';
          const rawDesc = item.description || '';
          const cleanDesc = rawDesc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          if (cleanDesc.length >= 20) {
            description = cleanDesc.length > 1000 ? cleanDesc.slice(0, 1000) + '...' : cleanDesc;
          }

          const imageUrl = (item.image || {}).url || null;

          events.push({
            id: require('uuid').v4(),
            title,
            url: eventUrl,
            date: startDate,
            venue: { name: venueName, address: fullAddress, city: 'Vancouver' },
            city: 'Vancouver',
            description,
            imageUrl,
            source: 'pne',
          });
        }

        if (page >= (data.total_pages || 1)) break;
        page++;
        await new Promise(r => setTimeout(r, 500));
      }

      console.log(`  Found ${events.length} PNE events`);
      const filtered = filterEvents(events);
      console.log(`  ✅ Returning ${filtered.length} valid PNE events`);
      return filtered;

    } catch (error) {
      console.error('  ⚠️ PNE Forum error:', error.message);
      return [];
    }

    // Legacy dead code below kept for reference only
    try {
      const response = await axios.get('https://www.livenation.com/venue/KovZpZAavE7A/pne-forum-events', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seenUrls = new Set();

      // Multiple selectors to find event links
      const eventSelectors = [
        'a[href*="/event/"]',
        'a[href*="/events/"]',
        'a[href*="/show/"]',
        'a[href*="/shows/"]',
        'a[href*="/concert/"]',
        'a[href*="/concerts/"]',
        '.event-item a',
        '.show-item a',
        '.concert-item a',
        '.listing a',
        '.event-listing a',
        '.show-listing a',
        '.concert-listing a',
        '.event-card a',
        '.show-card a',
        '.concert-card a',
        'h3 a',
        'h2 a',
        'h1 a',
        '.event-title a',
        '.show-title a',
        '.concert-title a',
        '.artist-name a',
        '.performer-name a',
        'article a',
        '.event a',
        '.show a',
        '.concert a',
        'a[title]',
        '[data-testid*="event"] a',
        '[data-testid*="show"] a',
        '[data-testid*="concert"] a',
        'a:contains("Tour")',
        'a:contains("Concert")',
        'a:contains("Show")',
        'a:contains("Live")',
        'a:contains("Tickets")',
        'a:contains("Buy")',
        'a:contains("RSVP")',
        'a:contains("Event")',
        'a:contains("Performance")',
        'a:contains("Music")',
        'a:contains("Festival")'
      ];

      let foundCount = 0;
      for (const selector of eventSelectors) {
        const links = $(selector);
        if (links.length > 0) {
          console.log(`Found ${links.length} events with selector: ${selector}`);
          foundCount += links.length;
        }

        links.each((index, element) => {
          const $element = $(element);
          let title = $element.text().trim();
          let url = $element.attr('href');

          if (!title || !url) return;

          // Skip if we've already seen this URL
          if (seenUrls.has(url)) return;

          // Convert relative URLs to absolute
          if (url.startsWith('/')) {
            url = 'https://www.livenation.com' + url;
          }

          // Filter out navigation, social media, and promotional links
          const skipPatterns = [
            /facebook\.com/i, /twitter\.com/i, /instagram\.com/i, /youtube\.com/i,
            /\/about/i, /\/contact/i, /\/home/i, /\/search/i,
            /\/login/i, /\/register/i, /\/account/i, /\/cart/i,
            /mailto:/i, /tel:/i, /javascript:/i, /#/,
            /\/privacy/i, /\/terms/i, /\/policy/i
          ];

          if (skipPatterns.some(pattern => pattern.test(url))) {
            console.log(`✗ Filtered out: "${title}" (URL: ${url})`);
            return;
          }

          // Clean up title
          title = title.replace(/\s+/g, ' ').trim();
          
          // Skip very short or generic titles
          if (title.length < 2 || /^(home|about|contact|search|login|more|info|buy|tickets?)$/i.test(title)) {
            console.log(`✗ Filtered out generic title: "${title}"`);
            return;
          }

          seenUrls.add(url);

          // Only log valid events (junk will be filtered out)
          // Extract date from event element


          let dateText = null;


          const dateSelectors = ['time[datetime]', '.date', '.event-date', '[class*="date"]', 'time', '.datetime', '.when'];


          for (const selector of dateSelectors) {


            const dateEl = $element.find(selector).first();


            if (dateEl.length > 0) {


              dateText = dateEl.attr('datetime') || dateEl.text().trim();


              if (dateText && dateText.length > 0) break;


            }


          }


          if (!dateText) {


            const $parent = $element.closest('.event, .event-item, article, [class*="event"]');


            if ($parent.length > 0) {


              for (const selector of dateSelectors) {


                const dateEl = $parent.find(selector).first();


                if (dateEl.length > 0) {


                  dateText = dateEl.attr('datetime') || dateEl.text().trim();


                  if (dateText && dateText.length > 0) break;


                }


              }


            }


          }


          if (dateText) {
            dateText = dateText
              .replace(/\n/g, ' ')
              .replace(/\s+/g, ' ')
              .replace(/(\d+)(st|nd|rd|th)/gi, '$1')
              .replace(/\d{1,2}:\d{2}\s*(AM|PM)\d{1,2}:\d{2}/gi, '')
              .trim();
            
            if (!/\d{4}/.test(dateText)) {
              const currentYear = new Date().getFullYear();
              const currentMonth = new Date().getMonth();
              const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
              const dateLower = dateText.toLowerCase();
              const monthIndex = months.findIndex(m => dateLower.includes(m));
              if (monthIndex !== -1) {
                const year = monthIndex < currentMonth ? currentYear + 1 : currentYear;
                dateText = `${dateText}, ${year}`;
              } else {
                dateText = `${dateText}, ${currentYear}`;
              }
            }
          }


          


          events.push({
            id: uuidv4(),
            title: title,
            description: '',
            url: url,
            venue: { name: 'PNE Forum', address: '2901 East Hastings Street, Vancouver, BC V5K 5J1', city: 'Vancouver' },
            city: city,
            date: dateText || null,
            source: 'PNE Forum'
          });
        });
      }

      console.log(`Found ${events.length} total events from PNE Forum`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping PNE Forum events:', error.message);
      return [];
    }
  }
};


module.exports = PNEForumEvents.scrape;
