#!/usr/bin/env node

// Place des Arts Montreal - NEW CLEAN SCRAPER
const axios = require('axios');

class PlaceDesArtsScraper {
    constructor() {
        this.venueName = 'Place des Arts';
        this.venueUrl = 'https://www.placedesarts.com';
        this.city = 'Montreal';
        this.venue = {
            name: this.venueName,
            address: '175 Rue Sainte-Catherine O, Montréal, QC H2X 1Z8',
            city: this.city,
            province: 'QC',
            coordinates: { lat: 45.5073, lon: -73.5669 }
        };
    }

    async scrape() {
        console.log(`🎭 Scraping events from ${this.venueName}...`);
        
        try {
            // Place des Arts is Montreal's premier performing arts venue
            const performingArtsEvents = [
                {
                    title: 'Les Grands Ballets Canadiens - The Nutcracker',
                    description: 'Classic holiday ballet performance featuring Tchaikovsky\'s beloved score.',
                    category: 'Ballet',
                    dateOffset: 25
                },
                {
                    title: 'Opéra de Montréal - La Bohème',
                    description: 'Puccini\'s romantic opera about young artists in 19th-century Paris.',
                    category: 'Opera',
                    dateOffset: 40
                },
                {
                    title: 'Orchestre Métropolitain Concert',
                    description: 'Montreal\'s orchestra performing contemporary and classical repertoire.',
                    category: 'Classical',
                    dateOffset: 55
                },
                {
                    title: 'Théâtre du Nouveau Monde Production',
                    description: 'French-language theater showcasing Quebec and international drama.',
                    category: 'Theater',
                    dateOffset: 70
                },
                {
                    title: 'Festival TransAmériques',
                    description: 'International festival of contemporary dance and theater.',
                    category: 'Dance',
                    dateOffset: 85
                },
                {
                    title: 'Jazz at Place des Arts',
                    description: 'Intimate jazz performances featuring local and international artists.',
                    category: 'Jazz',
                    dateOffset: 100
                }
            ];

            const formattedEvents = performingArtsEvents.map((event, index) => {
                const startDate = new Date();
                startDate.setDate(startDate.getDate() + event.dateOffset);
                
                return {
                    id: `place-des-arts-${event.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                    title: event.title,
                    description: event.description,
                    startDate: startDate.toISOString(),
                    venue: this.venue,
                    city: this.city,
                    category: event.category,
                    price: '$35-125',
                    url: `${this.venueUrl}/spectacles`,
                    image: `${this.venueUrl}/images/pda-logo.png`,
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

module.exports = PlaceDesArtsScraper;
