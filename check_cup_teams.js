const fs = require('fs');

// Extract cup_data team names
const cupCode = fs.readFileSync('E:/项目/SoccerAlarmPro/SoccerAlarmAPK/app/src/main/assets/cup_data.js', 'utf8');
const teamRegex = /team[12]:['"]([^'"]+)['"]/g;
const allTeams = new Set();
let m;
while ((m = teamRegex.exec(cupCode)) !== null) {
  allTeams.add(m[1]);
}

// Extract TEAM_CN existing keys
const htmlCode = fs.readFileSync('E:/项目/SoccerAlarmPro/SoccerAlarmAPK/app/src/main/assets/index.html', 'utf8');
const teamCnMatch = htmlCode.match(/const TEAM_CN = \{([^}]+)\}/s);
const existingCn = new Set();
if (teamCnMatch) {
  const cnRegex = /'([^']+)':\s*'/g;
  let cn;
  while ((cn = cnRegex.exec(teamCnMatch[1])) !== null) {
    existingCn.add(cn[1]);
  }
}

// Compare
const missing = [];
allTeams.forEach(t => {
  if (!existingCn.has(t)) {
    missing.push(t);
  }
});

console.log('Cup teams total:', allTeams.size);
console.log('Existing CN names:', existingCn.size);
console.log('Missing CN names:', missing.length);
missing.sort().forEach(t => console.log('  -', JSON.stringify(t)));
