import fs from 'node:fs';
import path from 'node:path';
import { CityRecordSchema } from '../src/lib/schema';

export function auditProvenance(): boolean {
  console.log("=== Auditing City Data Provenance & Schemas (Gate 2) ===");
  const citiesDir = path.resolve(process.cwd(), 'src/data/cities');
  
  if (!fs.existsSync(citiesDir)) {
    console.error(`Error: Directory not found: ${citiesDir}`);
    return false;
  }

  const files = fs.readdirSync(citiesDir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.error(`Error: No JSON city files found in ${citiesDir}`);
    return false;
  }

  let totalRecords = 0;
  let errorCount = 0;

  for (const f of files) {
    const fpath = path.join(citiesDir, f);
    const content = JSON.parse(fs.readFileSync(fpath, 'utf-8'));
    
    if (!Array.isArray(content)) {
      console.error(`File ${f} does not contain an array of city records!`);
      errorCount++;
      continue;
    }

    for (let i = 0; i < content.length; i++) {
      totalRecords++;
      const record = content[i];

      // 1. Zod Schema parse
      const parsed = CityRecordSchema.safeParse(record);
      if (!parsed.success) {
        console.error(`Schema validation failed on ${record.slug ?? `record ${i} in ${f}`}:`, parsed.error.format());
        errorCount++;
        continue;
      }

      // 2. Sentinel Value Check (< -100)
      const d = record.demographics;
      if (d.population < 0 || d.medianHouseholdIncome < 0 || d.medianGrossRent < 0 || d.medianHomeValue < 0) {
        console.error(`Sentinel value found in demographics for ${record.slug}`);
        errorCount++;
      }

      // 3. Provenance Check
      if (!d.provenance?.sourceName || !d.provenance?.sourceUrl || !d.provenance?.verifiedAt) {
        console.error(`Missing complete provenance object in demographics for ${record.slug}`);
        errorCount++;
      }

      for (const ind of record.industries) {
        if (!ind.provenance?.sourceName || !ind.provenance?.sourceUrl) {
          console.error(`Missing complete provenance in industry ${ind.naicsCode} for ${record.slug}`);
          errorCount++;
        }
      }
    }
  }

  console.log(`Audited ${totalRecords} city records across ${files.length} state-sharded files.`);
  if (errorCount === 0) {
    console.log("✓ Gate 2 PASSED: Zero-hallucination provenance verified. All records 100% valid.");
    return true;
  } else {
    console.error(`✗ Gate 2 FAILED: Found ${errorCount} schema/provenance errors.`);
    return false;
  }
}

if (import.meta.url.endsWith(process.argv[1] ?? '')) {
  const ok = auditProvenance();
  process.exit(ok ? 0 : 1);
}
