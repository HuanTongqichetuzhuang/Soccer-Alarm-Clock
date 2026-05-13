const fs = require('fs');

// Extract cup_data team names
const cupCode = fs.readFileSync('E:/项目/SoccerAlarmPro/SoccerAlarmAPK/app/src/main/assets/cup_data.js', 'utf8');
const teamRegex = /team[12]:['"]([^'"]+)['"]/g;
const allTeams = new Set();
let m;
while ((m = teamRegex.exec(cupCode)) !== null) {
  allTeams.add(m[1]);
}

// Extract badge_map keys
const badgeCode = fs.readFileSync('E:/项目/SoccerAlarmPro/SoccerAlarmAPK/app/src/main/assets/badge_map.js', 'utf8');
const badgeMatch = badgeCode.match(/const TEAM_BADGE_LOCAL = \{([^}]+)\}/s);
const existingBadges = new Set();
if (badgeMatch) {
  const bRegex = /["']([^"']+)["']:\s*["']/g;
  let b;
  while ((b = bRegex.exec(badgeMatch[1])) !== null) {
    existingBadges.add(b[1]);
  }
}

// Check badge files
const path = require('path');
const badgesDir = 'E:/项目/SoccerAlarmPro/SoccerAlarmAPK/app/src/main/assets/badges';
const badgeFiles = fs.existsSync(badgesDir) ? fs.readdirSync(badgesDir) : [];

const missing = [];
allTeams.forEach(t => {
  if (!existingBadges.has(t)) {
    missing.push(t);
  }
});

console.log('Cup teams total:', allTeams.size);
console.log('Existing badge mappings:', existingBadges.size);
console.log('Missing badge mappings:', missing.length);
missing.sort().forEach(t => console.log('  -', JSON.stringify(t)));
