import { readdirSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, extname } from 'path';

const srcDir = join(__dirname, 'src', 'database');
const destDir = join(__dirname, 'dist', 'database');

function copySqlFiles(src, dest) {
  const entries = readdirSync(src, { withFileTypes: true });

  entries.forEach((entry) => {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      if (!existsSync(destPath)) {
        mkdirSync(destPath);
      }
      copySqlFiles(srcPath, destPath);
    } else if (entry.isFile() && extname(entry.name) === '.sql') {
      copyFileSync(srcPath, destPath);
    }
  });
}

copySqlFiles(srcDir, destDir);
