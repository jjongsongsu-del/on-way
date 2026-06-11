const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

loadDotEnv(path.resolve(__dirname, '../../../.env'));
loadDotEnv(path.resolve(__dirname, '../.env'));

const prismaBin = path.resolve(
  __dirname,
  '../node_modules/.bin',
  process.platform === 'win32' ? 'prisma.CMD' : 'prisma'
);

const command = process.platform === 'win32' ? 'cmd.exe' : prismaBin;
const args = process.platform === 'win32' ? ['/d', '/s', '/c', prismaBin, ...process.argv.slice(2)] : process.argv.slice(2);

const result = spawnSync(command, args, {
  cwd: path.resolve(__dirname, '..'),
  env: process.env,
  stdio: 'inherit',
  shell: false
});

if (result.error) {
  console.error(result.error);
}

process.exitCode = result.status ?? 1;

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^"|"$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}
