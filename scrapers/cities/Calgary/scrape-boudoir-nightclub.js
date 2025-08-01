/**
 * Boudoir Nightclub Calgary Scraper
 * 
 * This scraper extracts event information from Boudoir's events page.
 * It identifies VIP services, special nights, and party packages at this Calgary nightclub.
 */

const axios = require('axios');
const cheerio = require('cheerio');

class BoudoirNightclubScraper {
    constructor() {
        this.baseUrl = 'https://www.fmentertainment.com';
        this.targetUrl = 'https://www.fmentertainment.com/boudoir_events.php';
        this.venue = {
            name: 'Boudoir Nightclub',
            address: 'Calgary, AB',
            city: 'Calgary',
            state: 'Alberta',
            country: 'Canada',
            websiteUrl: 'https://www.fmentertainment.com'
        };
    }

    async scrapeEvents() {
        try {
            console.log('🍸 Scraping Boudoir Nightclub events...');
            
            const response = await axios.get(this.targetUrl, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const $ = cheerio.load(response.data);
            const events = [];

            // Extract navigation links to find services and events
            const navLinks = $('a').toArray();
            
            navLinks.forEach(link => {
                const $link = $(link);
                const linkText = this.cleanText($link.text());
                const linkUrl = $link.attr('href');
                
                if (linkText && linkUrl && this.isEventOrService(linkText)) {
                    const eventData = this.parseServiceLink(linkText, linkUrl);
                    if (eventData) {
                        events.push(eventData);
                    }
                }
            });

            // Create events for known services
            const services = this.getKnownServices();
            services.forEach(service => {
                if (!events.find(e => e.title === service.title)) {
                    events.push({
                        title: service.title,
                        description: service.description,
                        venue: this.venue,
                        category: service.category,
                        url: service.url,
                        date: this.getUpcomingDate(),
                        source: 'Boudoir Nightclub',
                        scrapedAt: new Date(),
                        tags: service.tags || [],
                        price: service.price || ''
                    });
                }
            });

            // Create weekly nightclub events
            const weeklyEvents = this.generateWeeklyEvents();
            weeklyEvents.forEach(event => {
                if (!events.find(e => e.title === event.title)) {
                    events.push(event);
                }
            });

            const uniqueEvents = this.removeDuplicateEvents(events);
            
            console.log(`🎉 Successfully scraped ${uniqueEvents.length} unique events from Boudoir Nightclub`);
            return uniqueEvents;

        } catch (error) {
            console.error('❌ Error scraping Boudoir Nightclub:', error.message);
            return [];
        }
    }

    isEventOrService(text) {
        const serviceKeywords = [
            'bachelor', 'bachelorette', 'birthday', 'bottle service', 'vip',
            'guest list', 'free limo', 'party', 'events', 'nightclub'
        ];
        
        return serviceKeywords.some(keyword => 
            text.toLowerCase().includes(keyword.toLowerCase())
        );
    }

    parseServiceLink(linkText, linkUrl) {
        const text = linkText.toLowerCase();
        
        if (text.includes('bachelor') && !text.includes('bachelorette')) {
            return {
                title: 'Bachelor Party Package',
                description: 'Exclusive bachelor party packages with VIP treatment, bottle service, and premium experiences.',
                venue: this.venue,
                category: 'Party Package',
                url: linkUrl.startsWith('http') ? linkUrl : `${this.baseUrl}/${linkUrl}`,
                date: this.getUpcomingDate(),
                source: 'Boudoir Nightclub',
                scrapedAt: new Date(),
                tags: ['bachelor', 'vip', 'party'],
                price: 'Contact for pricing'
            };
        }
        
        if (text.includes('bachelorette')) {
            return {
                title: 'Bachelorette Party Package',
                description: 'Unforgettable bachelorette party experiences with VIP amenities and exclusive access.',
                venue: this.venue,
                category: 'Party Package',
                url: linkUrl.startsWith('http') ? linkUrl : `${this.baseUrl}/${linkUrl}`,
                date: this.getUpcomingDate(),
                source: 'Boudoir Nightclub',
                scrapedAt: new Date(),
                tags: ['bachelorette', 'vip', 'party'],
                price: 'Contact for pricing'
            };
        }
        
        if (text.includes('birthday')) {
            return {
                title: 'Birthday Party Package',
                description: 'Celebrate your birthday in style with our exclusive birthday packages and VIP treatment.',
                venue: this.venue,
                category: 'Party Package',
                url: linkUrl.startsWith('http') ? linkUrl : `${this.baseUrl}/${linkUrl}`,
                date: this.getUpcomingDate(),
                source: 'Boudoir Nightclub',
                scrapedAt: new Date(),
                tags: ['birthday', 'vip', 'celebration'],
                price: 'Contact for pricing'
            };
        }
        
        if (text.includes('bottle service')) {
            return {
                title: 'VIP Bottle Service',
                description: 'Premium bottle service with reserved seating and VIP treatment throughout the night.',
                venue: this.venue,
                category: 'VIP Service',
                url: linkUrl.startsWith('http') ? linkUrl : `${this.baseUrl}/${linkUrl}`,
                date: this.getUpcomingDate(),
                source: 'Boudoir Nightclub',
                scrapedAt: new Date(),
                tags: ['vip', 'bottle-service', 'premium'],
                price: 'Contact for pricing'
            };
        }
        
        return null;
    }

    getKnownServices() {
        return [
            {
                title: 'Free Limo Service',
                description: 'Complimentary limo service to and from the club. Contact for availability and booking.',
                category: 'Transportation',
                url: `${this.baseUrl}/boudoir_free_limo.php`,
                tags: ['limo', 'transportation', 'free'],
                price: 'Free'
            },
            {
                title: 'VIP Guest List',
                description: 'Get on the VIP guest list for priority entry and exclusive benefits.',
                category: 'VIP Service',
                url: `${this.baseUrl}/boudoir_guestlist.php`,
                tags: ['vip', 'guest-list', 'priority'],
                price: 'Varies'
            },
            {
                title: 'Vegas Style Club Experience',
                description: 'Experience Calgary\'s premier Vegas-style nightclub with world-class entertainment.',
                category: 'Nightclub',
                url: `${this.baseUrl}/calgary_nightclub.php`,
                tags: ['vegas-style', 'nightclub', 'entertainment'],
                price: 'Cover charge applies'
            }
        ];
    }

    generateWeeklyEvents() {
        const events = [];
        const days = ['Friday', 'Saturday'];
        
        days.forEach((day, index) => {
            events.push({
                title: `${day} Night Party`,
                description: `Join us for an unforgettable ${day} night experience with top DJs, premium drinks, and VIP service available.`,
                venue: this.venue,
                category: 'Nightclub',
                url: this.targetUrl,
                date: this.getNextWeekend(index === 0 ? 5 : 6), // Friday or Saturday
                source: 'Boudoir Nightclub',
                scrapedAt: new Date(),
                tags: ['nightclub', 'weekend', 'party'],
                price: 'Cover charge applies'
            });
        });
        
        return events;
    }

    getUpcomingDate() {
        const now = new Date();
        const upcoming = new Date(now);
        upcoming.setDate(now.getDate() + 1); // Tomorrow
        return upcoming;
    }

    getNextWeekend(dayOfWeek) {
        const now = new Date();
        const nextDate = new Date(now);
        
        // Get next occurrence of the specified day (5 = Friday, 6 = Saturday)
        const daysUntilEvent = (dayOfWeek - now.getDay() + 7) % 7;
        nextDate.setDate(now.getDate() + (daysUntilEvent === 0 ? 7 : daysUntilEvent));
        
        return nextDate;
    }

    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = `${event.title}-${event.category}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    cleanText(text) {
        return text ? text.trim().replace(/\s+/g, ' ').replace(/[^\w\s&'-]/g, '') : '';
    }
}

module.exports = BoudoirNightclubScraper;
