const fs = require('fs');
const path = require('path');

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'vancouver');

fs.readdir(scrapersDir, (err, files) => {
  if (err) {
    console.error('Error reading scraper directory:', err);
    return;
  }

  files.forEach(file => {
    if (file.endsWith('.js')) {
      const filePath = path.join(scrapersDir, file);
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.error(`Error reading file ${file}:`, err);
          return;
        }

        const regex = /module\.exports = new (\w+)\(\);/;
        const match = data.match(regex);

        if (match) {
          const className = match[1];
          const correctExport = `module.exports = ${className};`;
          const newData = data.replace(regex, correctExport);

          fs.writeFile(filePath, newData, 'utf8', (err) => {
            if (err) {
              console.error(`Error writing fix to ${file}:`, err);
            } else {
              console.log(`✅ Fixed constructor error in: ${file}`);
            }
          });
        }
      });
    }
  });
});
