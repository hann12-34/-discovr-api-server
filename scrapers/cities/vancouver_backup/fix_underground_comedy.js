const fs = require('fs');

const filePath = __dirname + '/undergroundComedyClubEvents.js';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the duplicate dateSelectors declaration
content = content.replace(/const dateSelectors = \[[\s\S]*?'\]/g, (match, offset) => {
  // The first occurrence stays as dateSelectors
  if (offset < 400) return match;
  // The second occurrence becomes dateSelectors2
  return match.replace('const dateSelectors =', 'const dateSelectors2 =');
});

// Fix the corresponding for loop
content = content.replace(/for \(const selector of dateSelectors\) {/g, (match, offset) => {
  // The first occurrence stays as dateSelectors
  if (offset < 400) return match;
  // The second occurrence becomes dateSelectors2
  return match.replace('dateSelectors', 'dateSelectors2');
});

// Fix the duplicate dateText declaration
content = content.replace(/let dateText = '';/g, (match, offset) => {
  // The first occurrence stays as dateText
  if (offset < 400) return match;
  // The second occurrence becomes dateText2
  return match.replace('let dateText =', 'let dateText2 =');
});

// Fix all dateText references after the second declaration
const lines = content.split('\n');
let inSecondSection = false;
let fixedLines = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  // Mark when we've reached the second dateText declaration (now dateText2)
  if (line.includes('let dateText2 =')) {
    inSecondSection = true;
  }
  
  // If we're in the second section, replace all dateText with dateText2
  if (inSecondSection && line.includes('dateText')) {
    line = line.replace(/dateText(?!\d)/g, 'dateText2');
  }
  
  fixedLines.push(line);
}

// Write the fixed content back to the file
fs.writeFileSync(filePath, fixedLines.join('\n'));

console.log('Fixed duplicate variable declarations in undergroundComedyClubEvents.js');
