/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'database');
const destDir = path.join(__dirname, 'dist', 'database');

function copySqlFiles(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  entries.forEach((entry) => {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath);
      }
      copySqlFiles(srcPath, destPath);
    } else if (entry.isFile() && path.extname(entry.name) === '.sql') {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}
