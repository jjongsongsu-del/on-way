const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

loadDotEnv(path.resolve(__dirname, '../../../.env'));
loadDotEnv(path.resolve(__dirname, '../.env'));

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT pid, granted
    FROM pg_locks
    WHERE locktype = 'advisory'
      AND classid = 0
      AND objid = 72707369
  `);

  console.log(`Found ${rows.length} Prisma migrate advisory lock row(s).`);
  for (const row of rows) {
    console.log(`pid=${row.pid}, granted=${row.granted}`);
  }

  const activeRows = rows.filter((row) => row.granted);
  for (const row of activeRows) {
    const terminated = await prisma.$queryRawUnsafe('SELECT pg_terminate_backend($1::integer) AS terminated', row.pid);
    console.log(`terminated pid=${row.pid}: ${terminated[0]?.terminated}`);
  }
}

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

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
