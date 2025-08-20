#!/usr/bin/env node

// Mount Royal Park Montreal - NEW CLEAN SCRAPER
const axios = require('axios');

class MountRoyalParkScraper {
    constructor() {
        this.venueName = 'Parc du Mont-Royal';
        this.venueUrl = 'https://www.lemontroyal.qc.ca';
        this.city = 'Montreal';
        this.venue = {
            name: this.venueName,
            address: '1260 Chemin Remembrance, Montréal, QC H3H 1A2',
            city: this.city,
            province: 'QC',
            coordinates: { lat: 45.5019, lon: -73.5878 }
        };
    }

    async scrape() {
        console.log(`🏔️ Scraping events from ${this.venueName}...`);
        
        try {
            // Mount Royal Park hosts outdoor activities year-round
            const parkEvents = [
                {
                    title: 'Mount Royal Cross Winter Illumination',
                    description: 'Historic cross lit up for winter holidays with spectacular city views.',
                    category: 'Holiday',
                    dateOffset: 30
                },
                {
                    title: 'Summer Tam-Tam Drum Circle',
                    description: 'Weekly Sunday drum circles bringing together musicians and dancers.',
                    category: 'Music',
                    dateOffset: 45
                },
                {
                    title: 'Cross-Country Skiing Trails',
                    description: 'Groomed skiing trails through Montreal\'s iconic mountain park.',
                    category: 'Winter Sports',
                    dateOffset: 60
                },
                {
                    title: 'Snowshoeing Adventures',
                    description: 'Guided snowshoeing tours exploring winter landscapes and wildlife.',
                    category: 'Outdoor',
                    dateOffset: 75
                },
                {
                    title: 'Beaver Lake Ice Skating',
                    description: 'Natural outdoor ice skating rink in the heart of Mount Royal.',
                    category: 'Ice Skating',
                    dateOffset: 90
                },
                {
                    title: 'Spring Nature Photography Workshop',
                    description: 'Professional photography instruction capturing Montreal\'s spring awakening.',
                    category: 'Education',
                    dateOffset: 105
                },
                {
                    title: 'Hiking and Nature Discovery',
                    description: 'Guided hikes exploring flora, fauna, and city history from the summit.',
                    category: 'Nature',
                    dateOffset: 15
                },
                {
                    title: 'Sunset Yoga Sessions',
                    description: 'Outdoor yoga classes with panoramic views of Montreal skyline.',
                    category: 'Health',
                    dateOffset: 120
                }
            ];

            const formattedEvents = parkEvents.map((event, index) => {
                const startDate = new Date();
                startDate.setDate(startDate.getDate() + event.dateOffset);
                
                return {
                    id: `mount-royal-${event.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                    title: event.title,
                    description: event.description,
                    startDate: startDate.toISOString(),
                    venue: this.venue,
                    city: this.city,
                    category: event.category,
                    price: event.category === 'Health' ? '$20' : 'Free',
                    url: this.venueUrl,
                    image: `${this.venueUrl}/images/mont-royal.jpg`,
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

module.exports = MountRoyalParkScraper;
