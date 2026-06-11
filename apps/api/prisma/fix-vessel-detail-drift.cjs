const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

loadDotEnv(path.resolve(__dirname, '../../../.env'));
loadDotEnv(path.resolve(__dirname, '../.env'));

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE vessel_detail
      ALTER COLUMN collected_at TYPE TIMESTAMP(3) USING collected_at::timestamp(3),
      ALTER COLUMN created_at TYPE TIMESTAMP(3) USING created_at::timestamp(3),
      ALTER COLUMN updated_at DROP DEFAULT,
      ALTER COLUMN updated_at TYPE TIMESTAMP(3) USING updated_at::timestamp(3)
  `);
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
  .then(() => {
    console.log('vessel_detail drift columns were aligned.');
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
