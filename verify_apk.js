// Check what's actually inside the built APK
const fs = require('fs');
const { execSync } = require('child_process');

// Use aapt to list assets in the APK
try {
  const output = execSync('E:/Android/Sdk/build-tools/35.0.0/aapt list E:/项目/SoccerAlarmPro/足球闹钟Pro_v30_闹钟修复.apk', { encoding: 'utf8' });
  const assets = output.split('\n').filter(l => l.includes('assets/'));
  console.log('=== Assets in APK ===');
  assets.forEach(a => console.log('  ' + a));
} catch(e) {
  console.log('aapt not found, trying alternative...');
}

// Check if the raw asset directory has the latest files
const assetsDir = 'E:/项目/SoccerAlarmPro/SoccerAlarmAPK/app/src/main/assets';
const files = fs.readdirSync(assetsDir);
console.log('\n=== Source assets directory ===');
files.forEach(f => {
  const stat = fs.statSync(assetsDir + '/' + f);
  console.log(`  ${f} (${(stat.size/1024).toFixed(1)} KB, modified: ${stat.mtime.toISOString()})`);
});

// Check the built (merged) assets
const buildAssetsDir = 'E:/项目/SoccerAlarmPro/SoccerAlarmAPK/app/build/intermediates/assets/debug/mergeDebugAssets';
try {
  const buildFiles = fs.readdirSync(buildAssetsDir);
  console.log('\n=== Build merged assets ===');
  buildFiles.forEach(f => {
    const stat = fs.statSync(buildAssetsDir + '/' + f);
    console.log(`  ${f} (${(stat.size/1024).toFixed(1)} KB, modified: ${stat.mtime.toISOString()})`);
  });
} catch(e) {
  console.log('Build assets dir not found:', e.message);
}

// The critical check: verify the index.html in the APK matches the source
// Extract using unzip
try {
  execSync('python -c "import zipfile; z=zipfile.ZipFile(\'E:/项目/SoccerAlarmPro/足球闹钟Pro_v30_闹钟修复.apk\',\'r\'); z.extract(\'assets/index.html\', \'E:/项目/SoccerAlarmPro/apk_extracted\'); z.close(); print(\'extracted\')"', { encoding: 'utf8' });
  
  const extractedContent = fs.readFileSync('E:/项目/SoccerAlarmPro/apk_extracted/assets/index.html', 'utf8');
  const sourceContent = fs.readFileSync(assetsDir + '/index.html', 'utf8');
  
  console.log('\n=== CRITICAL: Source vs APK content ===');
  console.log('Source size:', sourceContent.length);
  console.log('APK size:', extractedContent.length);
  console.log('Match:', sourceContent === extractedContent);
  
  if (sourceContent !== extractedContent) {
    // Find first difference
    for (let i = 0; i < Math.min(sourceContent.length, extractedContent.length); i++) {
      if (sourceContent[i] !== extractedContent[i]) {
        console.log('First diff at char', i, ': source="' + sourceContent.substring(i, i+50) + '" apk="' + extractedContent.substring(i, i+50) + '"');
        break;
      }
    }
  }
  
  // Check if the fixed ringtone_selector.js line is in the APK
  const rsSource = fs.readFileSync(assetsDir + '/ringtone_selector.js', 'utf8');
  console.log('\n=== ringtone_selector.js in APK ===');
  console.log('Contains "const originalLoadAlarmPage2":', rsSource.includes('const originalLoadAlarmPage2'));
  console.log('Contains monkey-patch comment:', rsSource.includes('铃声列表加载由'));
  
} catch(e) {
  console.log('Extract failed:', e.message);
}
