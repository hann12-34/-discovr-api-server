/**
 * Sheffield Theatres Events Scraper
 * URL: https://www.sheffieldtheatres.co.uk/whats-on
 * Major theatre complex: Crucible, Lyceum, Playhouse
 * Theatre, comedy, music, dance, opera
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const SheffieldTheatresEvents = {
  async scrape(city = 'Sheffield') {
    console.log('🎭 Scraping Sheffield Theatres...');

    try {
      const response = await axios.get('https://www.sheffieldtheatres.co.uk/whats-on', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seen = new Set();

      const venueMap = {
        'crucible': { name: 'Crucible Theatre', address: '55 Norfolk St, Sheffield S1 1DA, UK' },
        'lyceum': { name: 'Lyceum Theatre', address: '55 Norfolk St, Sheffield S1 1DA, UK' },
        'playhouse': { name: 'Playhouse', address: '55 Norfolk St, Sheffield S1 1DA, UK' },
        'studio': { name: 'Crucible Studio', address: '55 Norfolk St, Sheffield S1 1DA, UK' },
        'tanya moiseiwitsch': { name: 'Tanya Moiseiwitsch Playhouse', address: '55 Norfolk St, Sheffield S1 1DA, UK' },
        'adelphi': { name: 'Adelphi Room', address: '55 Norfolk St, Sheffield S1 1DA, UK' },
        'tudor square': { name: 'Tudor Square', address: 'Tudor Square, Sheffield S1 1DA, UK' },
      };

      const defaultVenue = { name: 'Sheffield Theatres', address: '55 Norfolk St, Sheffield S1 1DA, UK' };

      $('a.c-card--event').each((i, el) => {
        const card = $(el);

        const title = card.find('.c-card__title-text').text().trim();
        if (!title || title.length < 2) return;

        const url = card.attr('href');
        if (!url) return;

        // Extract start date from datetime attribute
        const startTime = card.find('time[itemprop="startDate"]');
        const dt = startTime.attr('datetime');
        if (!dt) return;

        const isoDate = dt.substring(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return;
        if (new Date(isoDate) < new Date()) return;

        // Deduplicate
        const key = `${title}|${isoDate}`.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);

        // Extract venue from posttitle
        const venueName = card.find('.c-card__posttitle').text().trim().toLowerCase();
        const venueKey = Object.keys(venueMap).find(k => venueName.includes(k));
        const venue = venueKey ? venueMap[venueKey] : defaultVenue;

        // Extract image
        const img = card.find('img[itemprop="image"]');
        let imageUrl = img.attr('src') || null;

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          imageUrl,
          description: '',
          venue: { ...venue, city: 'Sheffield' },
          city: 'Sheffield',
          category: 'Theatre',
          source: 'Sheffield Theatres'
        });
      });

      console.log(`  ✅ Found ${events.length} Sheffield Theatres events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ Sheffield Theatres error: ${error.message}`);
      return [];
    }
  }
};

module.exports = SheffieldTheatresEvents.scrape;
