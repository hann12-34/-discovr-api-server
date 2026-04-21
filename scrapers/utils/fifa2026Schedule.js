/**
 * FIFA World Cup 2026 Schedule Shared Utility
 * Data source: https://github.com/openfootball/worldcup (open public data)
 * Returns all matches for a given host city
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const SCHEDULE_URLS = [
  'https://raw.githubusercontent.com/openfootball/worldcup/master/2026--usa/cup.txt',
  'https://raw.githubusercontent.com/openfootball/worldcup/master/2026--usa/cup_finals.txt',
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'text/plain',
};

const FIFA_IMAGE = 'https://upload.wikimedia.org/wikipedia/en/thumb/1/17/2026_FIFA_World_Cup_emblem.svg/800px-2026_FIFA_World_Cup_emblem.svg.png';

// Map venue strings in the schedule to city/venue/address info
const CITY_MAP = {
  'Vancouver': {
    city: 'Vancouver',
    venue: 'BC Place',
    address: '777 Pacific Blvd, Vancouver, BC',
  },
  'Toronto': {
    city: 'Toronto',
    venue: 'BMO Field',
    address: '170 Princes\' Blvd, Toronto, ON',
  },
  'Seattle': {
    city: 'Seattle',
    venue: 'Lumen Field',
    address: '800 Occidental Ave S, Seattle, WA',
  },
  'Los Angeles (Inglewood)': {
    city: 'Los Angeles',
    venue: 'SoFi Stadium',
    address: '1001 Stadium Dr, Inglewood, CA',
  },
  'San Francisco Bay Area (Santa Clara)': {
    city: 'San Francisco',
    venue: "Levi's Stadium",
    address: '4900 Marie P DeBartolo Way, Santa Clara, CA',
  },
  'Atlanta': {
    city: 'Atlanta',
    venue: 'Mercedes-Benz Stadium',
    address: '1 AMB Dr NW, Atlanta, GA',
  },
  'Miami (Miami Gardens)': {
    city: 'Miami',
    venue: 'Hard Rock Stadium',
    address: '347 Don Shula Dr, Miami Gardens, FL',
  },
  'New York/New Jersey (East Rutherford)': {
    city: 'New York',
    venue: 'MetLife Stadium',
    address: '1 MetLife Stadium Dr, East Rutherford, NJ',
  },
  'Boston (Foxborough)': {
    city: 'Boston',
    venue: 'Gillette Stadium',
    address: '1 Patriot Place, Foxborough, MA',
  },
  'Philadelphia': {
    city: 'Philadelphia',
    venue: 'Lincoln Financial Field',
    address: '1 Lincoln Financial Field Way, Philadelphia, PA',
  },
};

// Month name to number
const MONTHS = {
  January: '01', February: '02', March: '03', April: '04',
  May: '05', June: '06', July: '07', August: '08',
  September: '09', October: '10', November: '11', December: '12',
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

function parseDate(dayStr, timeStr) {
  // dayStr like "June 13" or "Jul 2"
  // returns ISO date string "2026-06-13"
  const match = dayStr.match(/([A-Za-z]+)\s+(\d+)/);
  if (!match) return null;
  const monthName = match[1];
  const day = match[2].padStart(2, '0');
  const month = MONTHS[monthName];
  if (!month) return null;
  return `2026-${month}-${day}`;
}

function parseScheduleText(text, round) {
  const matches = [];
  const lines = text.split('\n');
  let currentDate = null;
  let currentRound = round || 'Group Stage';
  let inSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Section headers (▪ Group A, ▪ Round of 32, etc.)
    const sectionMatch = line.match(/^▪\s+(.+)/);
    if (sectionMatch) {
      currentRound = sectionMatch[1].trim();
      inSection = true;
      continue;
    }

    // Date lines (Mon June 15, Fri Jun 28, etc.)
    const dateMatch = line.match(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)\s+\d+)/);
    if (dateMatch) {
      currentDate = dateMatch[1].trim();
      continue;
    }

    if (!currentDate || !inSection) continue;

    // Match lines: time  team1 v team2  @ venue  (with optional match number)
    const matchLine = line.match(/(?:\(\d+\)\s+)?[\d:]+\s+UTC[+-]\d+\s+(.+?)\s+v\s+(.+?)\s+@\s+(.+)/);
    if (matchLine) {
      const team1 = matchLine[1].trim().replace(/\s+/g, ' ');
      const team2 = matchLine[2].trim().replace(/\s+/g, ' ');
      const venueRaw = matchLine[3].trim();

      const cityInfo = CITY_MAP[venueRaw];
      if (!cityInfo) continue; // Not a city we cover

      const isoDate = parseDate(currentDate, null);
      if (!isoDate) continue;

      const isKnownTeams = !/^[WL]\d+/.test(team1) && !/^[WL]\d+/.test(team2);
      const roundLabel = currentRound;

      let title;
      if (isKnownTeams) {
        title = `FIFA World Cup 2026: ${team1} vs ${team2}`;
      } else {
        title = `FIFA World Cup 2026: ${roundLabel}`;
      }

      matches.push({
        id: uuidv4(),
        title,
        date: isoDate,
        url: 'https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026',
        venue: {
          name: cityInfo.venue,
          address: cityInfo.address,
          city: cityInfo.city,
        },
        city: cityInfo.city,
        description: isKnownTeams
          ? `${roundLabel} - ${team1} vs ${team2} at ${cityInfo.venue}. FIFA World Cup 2026.`
          : `${roundLabel} match at ${cityInfo.venue}. FIFA World Cup 2026.`,
        imageUrl: FIFA_IMAGE,
        source: 'fifa-2026',
      });
    }
  }

  return matches;
}

/**
 * Get all FIFA 2026 matches, optionally filtered by city name.
 * @param {string|null} targetCity - city name to filter (e.g. 'Vancouver'), or null for all
 * @returns {Array} array of event objects
 */
async function getFifa2026Matches(targetCity) {
  const allMatches = [];

  for (const url of SCHEDULE_URLS) {
    try {
      const response = await axios.get(url, { headers: HEADERS, timeout: 15000 });
      const matches = parseScheduleText(response.data);
      allMatches.push(...matches);
    } catch (err) {
      console.error(`  FIFA schedule fetch error (${url}): ${err.message}`);
    }
  }

  if (targetCity) {
    return allMatches.filter(m => m.city === targetCity);
  }
  return allMatches;
}

module.exports = { getFifa2026Matches, CITY_MAP };
