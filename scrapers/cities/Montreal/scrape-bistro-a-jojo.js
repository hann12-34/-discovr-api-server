/**
 * Bistro A Jojo Live Music Events Scraper
 * Scrapes live music events from Bistro A Jojo in Montreal
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

const BistroAJojoEvents = {
  name: 'Bistro A Jojo',
  url: 'https://www.bistroajojo.com/livemusic',
  enabled: true,

  parseDateRange(daeventDateText) {
    if (!daeventDateText) return { startDate: null, endDate: null };

    try {
      daeventDateText = daeventDateText.replace(/\s+/g, ' ').trim();

      const frenchToEnglish = {
        'janvier': 'january', 'jan': 'jan',
        'février': 'february', 'fevrier': 'february', 'fév': 'feb',
        'mars': 'march', 'mar': 'mar',
        'avril': 'april', 'avr': 'apr',
        'mai': 'may',
        'juin': 'june', 'jun': 'jun',
        'juillet': 'july', 'jul': 'jul',
        'août': 'august', 'aout': 'august', 'aoû': 'aug',
        'septembre': 'september', 'sep': 'sep', 'sept': 'sep',
        'octobre': 'october', 'oct': 'oct',
        'novembre': 'november', 'nov': 'nov',
        'décembre': 'december', 'decembre': 'december', 'déc': 'dec'
      };

      let processedDaeventDateText = daeventDateText.toLowerCase();
      for (const [french, english] of Object.entries(frenchToEnglish)) {
        processedDaeventDateText = processedDaeventDateText.replace(new RegExp(french, 'gi'), english);
      }

      const dateInfo = this._parseSingleDate(processedDaeventDateText);
      if (dateInfo) {
        const endDate = new Date(dateInfo.date);

        if (dateInfo.hasTimeInfo) {
          endDate.setHours(endDate.getHours() + 3);
        } else {
          endDate.setHours(22, 0, 0);
        }

        return {
          startDate: dateInfo.date,
          endDate
        };
      }

      console.log(`Could not parse date: ${daeventDateText}`);
      return { startDate: null, endDate: null };

    } catch (error) {
      console.error(`Error parsing date "${daeventDateText}": ${error.message}`);
      return { startDate: null, endDate: null };
    }
  },

  _parseSingleDate(daeventDateText) {
    if (!daeventDateText) return null;

    daeventDateText = daeventDateText.trim();
    let hasTimeInfo = false;

    const dayMonthDayYearPattern = /([\w]+),?\s+([\w]+)\s+(\d{1,2}(?:st|nd|rd|th)?,?\s*(\d{4}?/i;
    const dayMonthDayYearMatch = daeventDateText.match(dayMonthDayYearPattern);

    if (dayMonthDayYearMatch) {
      const month = dayMonthDayYearMatch[2];
      const day = parseInt(dayMonthDayYearMatch[3]);
      const year = dayMonthDayYearMatch[4] ? parseInt(dayMonthDayYearMatch[4]) : new Date().getFullYear();

      const months = {
        january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
        april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
        august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
        november: 10, nov: 10, december: 11, dec: 11
      };

      const monthNum = months[month.toLowerCase()];

      if (monthNum !== undefined) {
        const timePattern = /(\d{1,2}(?::(\d{2}?\s*(am|pm|h)?/i;
        const timeMatch = daeventDateText.match(timePattern);

        let hours = 19; // Default to 7 PM for live music
        let minutes = 0;

        if (timeMatch) {
          hasTimeInfo = true;
          hours = parseInt(timeMatch[1]);
          minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;

          if (timeMatch[3] === 'h' || !timeMatch[3]) {
            // 24h format
          } else {
            const isPM = timeMatch[3].toLowerCase() === 'pm';
            if (isPM && hours < 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;
          }
        }

        const date = new Date(year, monthNum, day, hours, minutes, 0);
        return { date, hasTimeInfo };
      }
    }

    const monthDayYearPattern = /(\d{1,2}\s+([\w]+)\s+(\d{4}|([A-Za-z]+)\s+(\d{1,2}(?:st|nd|rd|th)?,?\s*(\d{4}?/i;
    const monthDayYearMatch = daeventDateText.match(monthDayYearPattern);

    if (monthDayYearMatch) {
      let month, day, year;

      if (monthDayYearMatch[1]) {
        day = parseInt(monthDayYearMatch[1]);
        month = monthDayYearMatch[2];
        year = parseInt(monthDayYearMatch[3]);
      } else {
        month = monthDayYearMatch[4];
        day = parseInt(monthDayYearMatch[5]);
        year = monthDayYearMatch[6] ? parseInt(monthDayYearMatch[6]) : new Date().getFullYear();
      }

      const months = {
        january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
        april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
        august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
        november: 10, nov: 10, december: 11, dec: 11
      };

      const monthNum = months[month.toLowerCase()];

      if (monthNum !== undefined) {
        const timePattern = /(\d{1,2}(?::(\d{2}?\s*(am|pm|h)?/i;
        const timeMatch = daeventDateText.match(timePattern);

        let hours = 19; // Default to 7 PM
        let minutes = 0;

        if (timeMatch) {
          hasTimeInfo = true;
          hours = parseInt(timeMatch[1]);
          minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;

          if (timeMatch[3] === 'h' || !timeMatch[3]) {
            // 24h format
          } else {
            const isPM = timeMatch[3].toLowerCase() === 'pm';
            if (isPM && hours < 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;
          }
        }

        const date = new Date(year, monthNum, day, hours, minutes, 0);
        return { date, hasTimeInfo };
      }
    }

    const parsedDate = new Date(daeventDateText);
    if (!isNaN(parsedDate.getTime())) {
      hasTimeInfo = daeventDateText.match(/\d{1,2}:\d{2}/) !== null ||
                    daeventDateText.match(/\d{1,2}\s*(am|pm|h)/i) !== null;

      if (!hasTimeInfo) {
        parsedDate.setHours(19, 0, 0);
      }

      return { date: parsedDate, hasTimeInfo };
    }

    return null;
  },

  generateEventId(title, startDate) {
    if (!title) return '';

    let dateStr = '';
    if (startDate && !isNaN(startDate.getTime())) {
      dateStr = startDate.toISOString().split('T')[0];
    }

    const slug = slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    }.substring(0, 50);

    return `bistro-a-jojo-${slug}-${dateStr}`;
  },

  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl) {
    let categories = ['live music', 'bistro', 'dining', 'entertainment'];

    const categoryKeywords = {
      'jazz': ['jazz', 'swing', 'blues'],
      'folk': ['folk', 'acoustic', 'singer-songwriter'],
      'rock': ['rock', 'indie', 'alternative'],
      'world': ['world music', 'ethnic', 'traditional'],
      'classical': ['classical', 'chamber', 'orchestra'],
      'food': ['dinner', 'diner', 'cuisine', 'meal']
    };

    const fullText = ((title || '') + ' ' + (description || '')).toLowerCase();

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (fullText.includes(keyword)) {
          categories.push(category);
          break;
        }
      }
    }

    return {
      id,
      title,
      description: description || '',
      startDate,
      endDate,
      imageUrl: imageUrl || '',
      sourceUrl: sourceUrl || this.url,
      venue: { ...RegExp.venue: {
        name: this.name,
        address: '1875 Rue Amherst',
        city: city,
        province: 'QC',
        country: 'Canada',
        postalCode: 'H2L 3L4',
        website: this.url,
        googleMapsUrl: 'https://goo.gl/maps/bistroajojoexample'
      }, city },,
      categories: [...new Set(categories)],
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'bistro-a-jojo'
    };
  },

  async scrape(city) {
    if (!this.enabled) {
      console.log(`${this.name} scraper is disabled`);
      return [];
    }

    console.log(`🔍 Scraping events from ${this.name}...`);
    const events = [];
    let browser;

    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      };

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 };
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');

      page.setDefaultNavigationTimeout(30000);

      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2' };

      const eventData = await page.evaluate(() => {
        const events = [];

        const eventElements = Array.from(document.querySelectorAll(
          '.event, .show, .concert, .performance, article, .card, .listing'
        ));

        eventElements.forEach(element => {
          let title = '';
          const titleElement = element.querySelector('h1, h2, h3, h4, .title, .artist, .band');
          if (titleElement) {
            title = titleElement.textContent.trim();
          }

          if (!title) return;

          let description = '';
          const descElement = element.querySelector('p, .description, .details, .info');
          if (descElement) {
            description = descElement.textContent.trim();
          }

          let dateText = '';
          const dateElement = element.querySelector('.date, .dates, time, .when');
          if (dateElement) {
            dateText = dateElement.textContent.trim();
          }

          if (!dateText) {
            const text = element.textContent;
            const datePatterns = [
              /\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}/i,
              /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}/i,
              /\d{1,2}\/\d{1,2}\/\d{4}/,
              /\d{4}-\d{2}-\d{2}/
            ];

            for (const pattern of datePatterns) {
              const match = text.match(pattern);
              if (match) {
                dateText = match[0];
                break;
              }
            }
          }

          let imageUrl = '';
          const imgElement = element.querySelector('img');
          if (imgElement && imgElement.src) {
            imageUrl = imgElement.src;
          }

          let sourceUrl = '';
          const linkElement = element.querySelector('a');
          if (linkElement && linkElement.href) {
            sourceUrl = linkElement.href;
          }

          if (title && (dateText || description.length > 10)) {
            events.push({
              title,
              description,
              dateText,
              imageUrl,
              sourceUrl
            };
          }
        };

        return events;
      };

      console.log(`Found ${eventData.length} potential events`);

      for (const event of eventData) {
        if (!event.dateText) {
          console.log(`Skipping event "${event.title}" - no date information`);
          continue;
        }

        const dateInfo = this.parseDateRange(event.dateText);

        if (!dateInfo.startDate || !dateInfo.endDate) {
          console.log(`Skipping event "${event.title}" - invalid date: "${event.dateText}"`);
          continue;
        }

        const eventId = this.generateEventId(event.title, dateInfo.startDate);

        const eventObject = this.createEventObject(
          eventId,
          event.title,
          event.description,
          dateInfo.startDate,
          dateInfo.endDate,
          event.imageUrl,
          event.sourceUrl
        );

        events.push(eventObject);
      }

      console.log(`Found ${events.length} total events from ${this.name}`);

    } catch (error) {
      console.error(`Error scraping ${this.name}: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    return events;
  }
};

module.exports = BistroAJojoEvents;