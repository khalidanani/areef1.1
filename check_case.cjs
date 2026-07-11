const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) results = results.concat(walk(filePath));
    else results.push(filePath);
  });
  return results;
}
const allFiles = walk('./src');
let hasError = false;
allFiles.forEach(file => {
  if (!file.endsWith('.jsx') && !file.endsWith('.js')) return;
  const content = fs.readFileSync(file, 'utf8');
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith('.')) {
      const dir = path.dirname(file);
      const targetPath = path.resolve(dir, importPath);
      // Try to find matching file
      const baseName = path.basename(targetPath);
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) continue;
      const actualFiles = fs.readdirSync(targetDir);
      
      let found = false;
      for (const f of actualFiles) {
         if (f === baseName || f === baseName + '.js' || f === baseName + '.jsx' || f === baseName + '/index.js' || f === baseName + '/index.jsx') {
            found = true; break;
         }
      }
      if (!found) {
        console.error(`ERROR in ${file}: imports ${importPath} -> looking for ${baseName} in ${targetDir}`);
        hasError = true;
      }
    }
  }
});
if (!hasError) console.log("All imports are case-correct.");
