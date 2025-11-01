const { filterEvents } = require('../../utils/eventFilter');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const MaisonneuveParkEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Maisonneuve Park (Montreal)...');

    try {
      const response = await axios.get('https://ville.montreal.qc.ca/portal/page?_pageid=5798,42657625&_dad=portal&_schema=PORTAL&id=15929', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seenUrls = new Set();

      const eventSelectors = [
        '.event-item',
        '.activity-item',
        'a[href*="/event"]',
        'a[href*="/activite"]',
        '.park-event',
        '.calendar-event'
      ];

      for (const selector of eventSelectors) {
        const eventElements = $(selector);
        if (eventElements.length > 0) {
          console.log(`Found ${eventElements.length} events with selector: ${selector}`);

          eventElements.each((i, element) => {
            const $event = $(element);
            
            let title = $event.find('h1, h2, h3, h4, .title').first().text().trim() ||
                       $event.find('a').first().text().trim() ||
                       $event.text().trim().split('\n')[0].trim();

            let url = $event.find('a').first().attr('href') || $event.attr('href') || '';
            if (url && !url.startsWith('http')) {
              url = 'https://ville.montreal.qc.ca' + url;
            }

            if (!title || title.length < 3 || seenUrls.has(url)) {
              return;
            }

            const skipTerms = ['menu', 'contact', 'about', 'home', 'portal'];
            if (skipTerms.some(term => title.toLowerCase().includes(term))) {
              return;
            }

            seenUrls.add(url);
            console.log(`✓ Event: ${title}`);

            events.push({
              id: uuidv4(),
              title: title,
              date: dateText || 'Date TBA',  // FIXED: Extract date from page
              time: null,
              url: url,
              venue: { name: 'Maisonneuve Park', address: '4601 Rue Sherbrooke E, Montreal, QC H1X 2B2', city: 'Montreal' },
              location: 'Montreal, QC',
              description: description && description.length > 20 ? description : `${title} in Montreal`,
              image: null
            });
          });
        }
      }

      console.log(`Found ${events.length} total events from Maisonneuve Park`);
      return filterEvents(events);

    } catch (error) {
      console.error('Error scraping Maisonneuve Park events:', error.message);
      return [];
    }
  }
};

module.exports = MaisonneuveParkEvents.scrape;
