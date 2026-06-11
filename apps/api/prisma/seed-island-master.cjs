const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const defaultCsvPath = path.resolve(__dirname, '../../../ref_data/AL_D159_00_20260509.csv');
const csvPath = path.resolve(process.argv[2] || defaultCsvPath);

function parseCsv(text) {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value.trim())) rows.push(row);
      field = '';
      row = [];
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function toRecord(headers, row) {
  return Object.fromEntries(headers.map((header, index) => [header, row[index]?.trim() ?? '']));
}

function toInt(value) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDate(value) {
  if (!value) return new Date();
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

async function main() {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file was not found: ${csvPath}`);
  }

  const buffer = fs.readFileSync(csvPath);
  const text = decodeCsv(buffer).replace(/^\uFEFF/, '');
  const rows = parseCsv(text);
  const headers = rows.shift();

  if (!headers?.includes('도서명')) {
    throw new Error('CSV headers do not include 도서명. Check file encoding or source format.');
  }

  const records = rows
    .map((row) => toRecord(headers, row))
    .filter((record) => record['법정동코드'] && record['도서명'])
    .map((record) => {
      const legalDongCode = record['법정동코드'];
      const islandUniqueNo = record['도서고유번호'] || '0000';
      const islandName = record['도서명'];

      return {
        islandKey: `${legalDongCode}-${islandUniqueNo}-${islandName}`,
        legalDongCode,
        legalDongName: record['법정동명'] || '',
        islandUniqueNo,
        islandName,
        islandTypeCode: record['도서구분코드'] || null,
        islandTypeName: record['도서구분명'] || null,
        connectionTypeCode: record['연결유형코드'] || null,
        connectionTypeName: record['연결유형'] || null,
        bridgeCount: toInt(record['제방다리수']),
        bridgeNames: record['제방다리명'] || null,
        referenceDate: toDate(record['데이터기준일자']),
        sourceRegionCode: record['원천시도시군구코드'] || null
      };
    });

  const batchSize = 500;
  for (let index = 0; index < records.length; index += batchSize) {
    const batch = records.slice(index, index + batchSize);
    await prisma.islandMaster.createMany({
      data: batch,
      skipDuplicates: true
    });
  }

  for (const record of records) {
    await prisma.islandMaster.update({
      where: { islandKey: record.islandKey },
      data: record
    });
  }

  console.log(`Imported ${records.length} island master rows from ${csvPath}`);
}

function decodeCsv(buffer) {
  const encodings = ['utf-8', 'euc-kr', 'windows-949'];

  for (const encoding of encodings) {
    try {
      const text = new TextDecoder(encoding).decode(buffer);
      if (text.includes('도서명')) return text;
    } catch {
      // Try the next encoding.
    }
  }

  return buffer.toString('utf8');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
