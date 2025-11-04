#!/bin/bash

# Simple count of working scrapers

echo "🎯 SIMPLE SCRAPER COUNT"
echo "Testing known working scrapers..."
echo ""

working=0

test_scraper() {
  local file=$1
  timeout 5s node -e "
    const s = require('./scrapers/cities/vancouver/${file}.js');
    const scraper = typeof s === 'function' ? s : s.scrape;
    scraper('vancouver').then(e => {
      if (e && e.length > 0) {
        console.log('✅ ${file}: ' + e.length + ' events');
        process.exit(0);
      } else {
        process.exit(1);
      }
    }).catch(() => process.exit(1));
  " 2>/dev/null
  
  if [ $? -eq 0 ]; then
    ((working++))
  fi
}

# Test confirmed working
echo "📊 Known working scrapers:"
test_scraper "do604"
test_scraper "madeInThe604"
test_scraper "vancouversBestPlaces"
test_scraper "theRoxy"
test_scraper "vancouverArtGallery"
test_scraper "fringeFestivalEvents"
test_scraper "whistlerFilmFestival"
test_scraper "vancouverWritersFest"
test_scraper "rogersArena"
test_scraper "mansionClub"
test_scraper "commodoreBallroom"
test_scraper "fortuneSoundClub"
test_scraper "orpheum"
test_scraper "squamishArts"
test_scraper "bellPerformingArtsCentre"
test_scraper "firehallArtsCentre"
test_scraper "chanCentre"
test_scraper "ubcChanCentre"
test_scraper "vancouverQueerFilmFestival"
test_scraper "vancouverSymphony"
test_scraper "vandusenGarden"
test_scraper "vancouverConventionCentre"

echo ""
echo "================================"
echo "✅ Working: $working/22 confirmed"
echo "🎯 Target: 50 working scrapers"
echo "📈 Need: $((50 - working)) more"
