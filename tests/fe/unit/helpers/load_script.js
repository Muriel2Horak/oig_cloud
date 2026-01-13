import fs from 'fs';
import vm from 'vm';
import path from 'path';

export function loadScript(relativePath) {
  const filePath = path.resolve(process.cwd(), relativePath);
  const code = fs.readFileSync(filePath, 'utf8');
  vm.runInThisContext(code, { filename: filePath });
}
