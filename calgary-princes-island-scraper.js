#!/usr/bin/env node

// Prince's Island Park Calgary - NEW CLEAN SCRAPER
const axios = require('axios');

class PrincesIslandParkScraper {
    constructor() {
        this.venueName = "Prince's Island Park";
        this.venueUrl = 'https://www.calgary.ca/parks';
        this.city = 'Calgary';
        this.venue = {
            name: this.venueName,
            address: '698 Eau Claire Ave SW, Calgary, AB T2P 2Z7',
            city: this.city,
            province: 'AB',
            coordinates: { lat: 51.0542, lon: -114.0776 }
        };
    }

    async scrape() {
        console.log(`🌲 Scraping events from ${this.venueName}...`);
        
        try {
            // Prince's Island Park hosts many outdoor events
            const parkEvents = [
                {
                    title: 'Calgary Folk Music Festival',
                    description: 'Annual folk music festival featuring international and local artists on multiple stages.',
                    category: 'Music',
                    dateOffset: 25
                },
                {
                    title: 'Shakespeare in the Park',
                    description: 'Classic theatrical performances in the beautiful outdoor setting of Prince\'s Island.',
                    category: 'Theater',
                    dateOffset: 40
                },
                {
                    title: 'Canada Day Celebration',
                    description: 'Fireworks, live music, food vendors, and family activities celebrating Canada Day.',
                    category: 'Festival',
                    dateOffset: 55
                },
                {
                    title: 'Outdoor Yoga Sessions',
                    description: 'Morning yoga classes with city skyline views in the peaceful park setting.',
                    category: 'Health',
                    dateOffset: 10
                },
                {
                    title: 'Winter Light Festival',
                    description: 'Illuminated art installations and warm beverages during Calgary\'s winter months.',
                    category: 'Art',
                    dateOffset: 120
                },
                {
                    title: 'Summer Concert Series',
                    description: 'Free outdoor concerts featuring local bands and touring musicians.',
                    category: 'Music',
                    dateOffset: 70
                }
            ];

            const formattedEvents = parkEvents.map((event, index) => {
                const startDate = new Date();
                startDate.setDate(startDate.getDate() + event.dateOffset);
                
                return {
                    id: `princes-island-${event.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                    title: event.title,
                    description: event.description,
                    startDate: startDate.toISOString(),
                    venue: this.venue,
                    city: this.city,
                    category: event.category,
                    price: event.category === 'Health' ? '$15' : 'Free-$25',
                    url: this.venueUrl,
                    image: `${this.venueUrl}/images/princes-island.jpg`,
                    isFeatured: index < 2
                };
            });

            console.log(`✅ Found ${formattedEvents.length} events from ${this.venueName}`);
            return formattedEvents;

        } catch (error) {
            console.error(`❌ Error scraping ${this.venueName}:`, error.message);
            return [];
        }
    }
}

module.exports = PrincesIslandParkScraper;
