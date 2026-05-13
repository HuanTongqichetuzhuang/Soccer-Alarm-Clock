// Deep runtime check: simulate WebView execution order
// Find ALL potential ReferenceError / crashes that would prevent init() from running

const fs = require('fs');
const html = fs.readFileSync('E:/项目/SoccerAlarmPro/SoccerAlarmAPK/app/src/main/assets/index.html', 'utf8');

const badgeMap = fs.readFileSync('E:/项目/SoccerAlarmPro/SoccerAlarmAPK/app/src/main/assets/badge_map.js', 'utf8');
const ringtoneSelector = fs.readFileSync('E:/项目/SoccerAlarmPro/SoccerAlarmAPK/app/src/main/assets/ringtone_selector.js', 'utf8');
const mainScript = html.match(/<script>([\s\S]*?)<\/script>/)[1];

// Parse each script to find top-level executable statements
// (not inside function bodies) that reference variables defined elsewhere

function findTopLevelCode(js) {
  const lines = js.split('\n');
  const topLevelLines = [];
  let braceDepth = 0;
  let inFunction = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Track brace depth
    for (const c of line) {
      if (c === '{') braceDepth++;
      if (c === '}') braceDepth--;
    }
    
    // Top-level = braceDepth 0
    if (braceDepth === 0 || (braceDepth === 1 && line.startsWith('function'))) {
      // Skip empty lines, comments, const/let/var declarations
      if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue;
      if (line.startsWith('function ') || line.startsWith('const ') || line.startsWith('let ') || line.startsWith('var ')) continue;
      if (line === '}' || line === '{') continue;
      
      // This is a top-level executable statement
      if (line.length > 0 && !line.startsWith('//')) {
        topLevelLines.push({ lineNum: i + 1, code: line });
      }
    }
  }
  return topLevelLines;
}

console.log('=== Top-level executable code in badge_map.js ===');
const bmTop = findTopLevelCode(badgeMap);
bmTop.forEach(l => console.log(`  L${l.lineNum}: ${l.code.substring(0, 80)}`));

console.log('\n=== Top-level executable code in ringtone_selector.js ===');
const rsTop = findTopLevelCode(ringtoneSelector);
rsTop.forEach(l => console.log(`  L${l.lineNum}: ${l.code.substring(0, 80)}`));

console.log('\n=== Top-level executable code in main script (first 30) ===');
const mainTop = findTopLevelCode(mainScript);
mainTop.slice(0, 30).forEach(l => console.log(`  L${l.lineNum}: ${l.code.substring(0, 80)}`));

// Now check for the REAL issue: does the main script have top-level code 
// that references things before they're defined?
console.log('\n=== Checking main script for early references ===');
const mainLines = mainScript.split('\n');
let braceDepth = 0;
const definedHere = new Set();
const referencedBefore = [];

for (let i = 0; i < mainLines.length; i++) {
  const line = mainLines[i];
  for (const c of line) {
    if (c === '{') braceDepth++;
    if (c === '}') braceDepth--;
  }
  
  // Track definitions at top level
  if (braceDepth === 0) {
    const funcMatch = line.match(/^function\s+(\w+)/);
    if (funcMatch) definedHere.add(funcMatch[1]);
    const constMatch = line.match(/^(?:const|let|var)\s+(\w+)/);
    if (constMatch) definedHere.add(constMatch[1]);
  }
  
  // Check init() invocation at the end
  if (line.includes('init()') && braceDepth === 0) {
    console.log(`  init() called at line ${i+1}, defined: ${definedHere.has('init')}`);
  }
}

// MOST IMPORTANT: Check if there's a crash in the init() call chain
console.log('\n=== Simulating init() call chain ===');
const initFunc = mainScript.substring(
  mainScript.indexOf('function init()'),
  mainScript.indexOf('}', mainScript.indexOf('function init()') + 20) + 1
);
console.log('init() body:', initFunc);

// Check what init() calls
const initCalls = initFunc.match(/\b\w+\(/g);
if (initCalls) {
  console.log('Functions called by init():', initCalls);
  
  // Check if loadSchedule exists and what it needs
  const loadScheduleMatch = mainScript.match(/async function loadSchedule\([\s\S]*?^}/m);
  if (loadScheduleMatch) {
    console.log('\nloadSchedule() found, length:', loadScheduleMatch[0].length);
  }
}

// Check for common WebView crash: accessing AndroidAlarm before it's ready
console.log('\n=== AndroidAlarm references at top level ===');
let androidAlarmRefCount = 0;
mainLines.forEach((line, i) => {
  if (line.includes('AndroidAlarm') || line.includes('AndroidInterface')) {
    // Only flag if it's in a function call that might be executed early
    if (braceDepth === 0 || line.includes('init()') || line.includes('DOMContentLoaded')) {
      // Skip
    }
  }
});

// FINAL CHECK: is there any try/catch wrapping init() that might silently swallow errors?
const last30 = mainLines.slice(-30);
console.log('\n=== Last 30 lines of main script ===');
last30.forEach((l, i) => console.log(`${mainLines.length - 30 + i + 1}: ${l}`));
