type UnknownRecord = Record<string, unknown>;

export function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

export function extractItems(response: unknown): UnknownRecord[] {
  const root = asRecord(response);
  if (!root) {
    return [];
  }

  const itemNode = findItemNode(root);
  if (itemNode) {
    return normalizeItems(itemNode);
  }

  const candidates = [
    root.item,
    root.items,
    asRecord(root.items)?.item,
    asRecord(root.body)?.item,
    asRecord(asRecord(root.body)?.items)?.item,
    asRecord(asRecord(root.response)?.body)?.item,
    asRecord(asRecord(asRecord(root.response)?.body)?.items)?.item
  ];

  for (const candidate of candidates) {
    const items = normalizeItems(candidate);
    if (items.length > 0) {
      return items;
    }
  }

  return [];
}

function findItemNode(value: unknown): unknown {
  const record = asRecord(value);
  if (!record) {
    return Array.isArray(value) ? value : null;
  }

  const itemsRecord = asRecord(record.items);
  if (itemsRecord?.item) {
    return itemsRecord.item;
  }

  if (record.item) {
    return record.item;
  }

  if (record.items) {
    return record.items;
  }

  for (const key of ['response', 'body', 'data']) {
    const nested = findItemNode(record[key]);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function normalizeItems(value: unknown): UnknownRecord[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const record = asRecord(item);
      return record ? [record] : [];
    });
  }

  const record = asRecord(value);
  return record ? [record] : [];
}

export function pickString(record: UnknownRecord, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number') {
      return String(value);
    }
  }

  return null;
}

export function pickNumber(record: UnknownRecord, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = Number(value.replace(/,/g, '').trim());
      if (Number.isFinite(normalized)) {
        return normalized;
      }
    }
  }

  return null;
}

export function makeStableId(prefix: string, parts: Array<string | number | null | undefined>) {
  const value = parts
    .filter((part): part is string | number => part !== null && part !== undefined && String(part).trim() !== '')
    .map((part) => String(part).trim().replace(/\s+/g, '-'))
    .join('__');

  return `${prefix}-${value || 'unknown'}`.toLowerCase();
}
