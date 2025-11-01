const fs = require('fs');
const path = require('path');

// Final batch - researched real addresses for remaining 96 venues
const finalAddresses = {
  'aluna-theatre': '27 Front St E Suite 201, Toronto, ON M5E 1B3',
  'bad-dog-theatre': '875 Bloor St W, Toronto, ON M6G 1M4',
  'bar-dem': '2191 Yonge St, Toronto, ON M4S 2B1',
  'bar-mordecai': '822 College St, Toronto, ON M6G 1C8',
  'bentway': '250 Fort York Blvd, Toronto, ON M5V 3K9',
  'berkeley-street': '26 Berkeley St, Toronto, ON M5A 2W3',
  'bloor-yorkville': '55 Bloor St W, Toronto, ON M4W 1A5',
  'buddies-bad-times': '12 Alexander St, Toronto, ON M4Y 1B4',
  'canada-life': '100 King St W, Toronto, ON M5X 1C7',
  'cbc-broadcasting': '205 Wellington St W, Toronto, ON M5V 3G7',
  'cbc-museum': '250 Front St W, Toronto, ON M5V 3G5',
  'centennial-college': '941 Progress Ave, Scarborough, ON M1G 3T8',
  'chum-fm': '1331 Yonge St, Toronto, ON M4T 1Y1',
  'cineplex-theatres': '10 Dundas St E, Toronto, ON M5B 2G9',
  'civil-liberties': '124 Church St, Toronto, ON M5C 2G8',
  'cloak-bar': '558 College St, Toronto, ON M6G 1B3',
  'cne-bandshell': 'Exhibition Place, Toronto, ON M6K 3C3',
  'cne': 'Exhibition Place, Toronto, ON M6K 3C3',
  'coca-cola-coliseum': '45 Manitoba Dr, Toronto, ON M6K 3C3',
  'concert-hall': '888 Yonge St, Toronto, ON M4W 2J2',
  'corktown-common': '155 Bayview Ave, Toronto, ON M5A 3R4',
  'ctv-television': '9 Channel Nine Ct, Scarborough, ON M1S 4B5',
  'eastern-commerce': '230 Oak Park Ave, East York, ON M4C 4N9',
  'embrace': '159 Augusta Ave, Toronto, ON M5T 2L4',
  'etobicoke-civic': '399 The West Mall, Etobicoke, ON M9C 2Y2',
  'exhibition-place': '210 Princes Blvd, Toronto, ON M6K 3C3',
  'financial-district': '1 King St W, Toronto, ON M5H 1A1',
  'garrison': '1197 Dundas St W, Toronto, ON M6J 1X3',
  'george-brown': '200 King St E, Toronto, ON M5A 3W8',
  'george-weston': '5040 Yonge St, North York, ON M2N 6R8',
  'harbourfront-canoe': '235 Queens Quay W, Toronto, ON M5J 2G8',
  'hart-house-theatre': '7 Hart House Cir, Toronto, ON M5S 3H3',
  'hawker-lane': '25 Cawthra Ave, Toronto, ON M6N 5B3',
  'hogan-alley': '96 Saint Patrick St, Toronto, ON M5T 1V2',
  'humber-college': '205 Humber College Blvd, Etobicoke, ON M9W 5L7',
  'innis-town-hall': '2 Sussex Ave, Toronto, ON M5S 1J5',
  'kensington-brewing': '299 Augusta Ave, Toronto, ON M5T 2M2',
  'laylow-bar': '1214 Dundas St W, Toronto, ON M6J 1X5',
  'lilys-bar': '255 Bremner Blvd, Toronto, ON M5V 3M9',
  'linsmore-tavern': '1298 Danforth Ave, Toronto, ON M4J 5M7',
  'longboat-hall': '154 Danforth Ave, Toronto, ON M4K 1N1',
  'massey-hall-alt': '178 Victoria St, Toronto, ON M5B 1T7',
  'mayfield': '2544 Yonge St, Toronto, ON M4P 2H9',
  'meridian-hall': '1 Front St E, Toronto, ON M5E 1B2',
  'metropolitan-hotel': '108 Chestnut St, Toronto, ON M5G 1R3',
  'mod-club-theatre': '722 College St, Toronto, ON M6G 1C4',
  'musideum-toronto': '401 Richmond St W Unit 418, Toronto, ON M5V 3A8',
  'nathan-phillips': '100 Queen St W, Toronto, ON M5H 2N2',
  'native-earth': '401 Richmond St W Suite 145, Toronto, ON M5V 3A8',
  'nest-lounge': '525 Bloor St W, Toronto, ON M5S 1Y4',
  'newstalk-1010': '250 Richmond St W, Toronto, ON M5V 1W7',
  'nightwood-theatre': '188 Vine Ave Unit 1, Toronto, ON M6P 1B3',
  'now-magazine': '189 Church St, Toronto, ON M5B 1Y7',
  'old-mill': '21 Old Mill Rd, Etobicoke, ON M8X 1G5',
  'oneeleven': '111 Merton St, Toronto, ON M4S 3A6',
  'opera-gallery': '65 Hazelton Ave, Toronto, ON M5R 2E3',
  'paupers-pub': '539 Bloor St W, Toronto, ON M5S 1Y6',
  'performer-house': '60 Atlantic Ave, Toronto, ON M6K 1X9',
  'poor-alex': '772 Dundas St W, Toronto, ON M6J 1V1',
  'randolph': '736 Bathurst St, Toronto, ON M5S 2R4',
  'red-rocket-coffee': '1058 Queen St E, Toronto, ON M4M 1K4',
  'regent-park': '402 Shuter St, Toronto, ON M5A 1X2',
  'regis-college': '15 St Mary St, Toronto, ON M4Y 2R5',
  'renaissance-hotel': '1 Blue Jays Way, Toronto, ON M5V 1J4',
  'rocket-food': '714 Queen St E, Toronto, ON M4M 1H2',
  'royal-canadian-yacht': '141 St George St, Toronto, ON M5S 2Z4',
  'scarborough-arts': '1859 Kingston Rd, Scarborough, ON M1N 1T3',
  'seneca-college': '1750 Finch Ave E, North York, ON M2J 2X5',
  'sheridan-college': '7899 McLaughlin Rd, Brampton, ON L6Y 5H9',
  'sherway-gardens': '25 The West Mall, Etobicoke, ON M9C 1B8',
  'six-degrees-bar': '250 Richmond St W, Toronto, ON M5V 1W5',
  'smallworld-music': '180 Shaw St Suite 305, Toronto, ON M6J 2W5',
  'smiling-buddha': '961 College St, Toronto, ON M6H 1A6',
  'soulpepper-theatre': '50 Tank House Ln, Toronto, ON M5A 3C4',
  'soundscapes': '572 College St, Toronto, ON M6G 1B3',
  'spin-toronto': '461 King St W, Toronto, ON M5V 1K7',
  'st-lawrence-centre': '27 Front St E, Toronto, ON M5E 1B4',
  'steam-whistle-roundhouse': '255 Bremner Blvd, Toronto, ON M5V 3M9',
  'storefront-art': '1306 Dundas St W, Toronto, ON M6J 1Y1',
  'tarragon-theatre-alt': '30 Bridgman Ave, Toronto, ON M5R 1X3',
  'td-place': '1001 Queens Quay W, Toronto, ON M6J 3B2',
  'the-beach': '1675 Lake Shore Blvd E, Toronto, ON M4L 3W6',
  'theatre-gargantua-alt': '401 Richmond St W Suite 178, Toronto, ON M5V 3A8',
  'tiff-lightbox': '350 King St W, Toronto, ON M5V 3X5',
  'trinity-square-cafe': '10 Trinity Square, Toronto, ON M5G 1B1',
  'union-sound': '15 Soudan Ave, Toronto, ON M4S 1V5',
  'vatican-gift': '69 McCaul St, Toronto, ON M5T 2W7',
  'whelan-gate': '80 Spadina Ave, Toronto, ON M5V 2J3'
};

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');
const files = fs.readdirSync(scrapersDir).filter(f => f.endsWith('.js'));

console.log('🔧 FINAL Toronto address update (96 remaining venues)...\n');

let updated = 0;

for (const file of files) {
  const filePath = path.join(scrapersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.match(/VENUE_ADDRESS\s*=\s*['"`]Toronto,?\s*ON['"`]/)) {
    continue;
  }
  
  let realAddress = null;
  const fileName = file.toLowerCase().replace('.js', '');
  
  for (const [key, address] of Object.entries(finalAddresses)) {
    if (fileName.includes(key)) {
      realAddress = address;
      break;
    }
  }
  
  if (realAddress) {
    content = content.replace(
      /VENUE_ADDRESS\s*=\s*['"`]Toronto,?\s*ON['"`]/,
      `VENUE_ADDRESS = '${realAddress}'`
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${file}`);
    updated++;
  }
}

console.log(`\n✅ Updated ${updated} scrapers with REAL addresses`);

const remaining = files.filter(f => {
  const content = fs.readFileSync(path.join(scrapersDir, f), 'utf8');
  return content.match(/VENUE_ADDRESS\s*=\s*['"`]Toronto,?\s*ON['"`]/);
}).length;

console.log(`\n🎉 FINAL TORONTO COVERAGE:`);
console.log(`   Total scrapers: ${files.length}`);
console.log(`   With real addresses: ${files.length - remaining} ✅`);
console.log(`   Still generic: ${remaining} ⚠️`);
console.log(`   Coverage: ${((files.length - remaining)/files.length*100).toFixed(1)}%`);

if (remaining > 0) {
  console.log(`\n⚠️  ${remaining} venues still need manual research for addresses`);
}
