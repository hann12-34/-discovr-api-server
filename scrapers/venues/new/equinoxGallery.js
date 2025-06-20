/**
 * Equinox Gallery Scraper
 * URL: https://www.equinoxgallery.com/
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../../utils/logger');

// Define venue info
const name = 'Equinox Gallery';
const url = 'https://www.equinoxgallery.com/';
const exhibitionsUrl = 'https://www.equinoxgallery.com/exhibitions/';
const venueAddress = '3640 East Hastings Street';
const venueCity = 'Vancouver';
const venueRegion = 'BC';
const venuePostalCode = 'V5K 2A9';
const venueCountry = 'Canada';
