// Backfills the sources column on knowledge_entries from the local
// data/knowledge-entries/*.json files, matching existing rows by claim text
// (same pattern as sync-knowledge-entries.mjs). Idempotent: safe to re-run.

import { readFileSync, readdirSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: new URL('../.env.local', import.meta.url) })

const dir = new URL('../data/knowledge-entries/', import.meta.url)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  const { data: existing, error: fetchError } = await supabase.from('knowledge_entries').select('id, claim')
  if (fetchError) throw fetchError

  const byClaim = new Map(existing.map(row => [row.claim.trim(), row.id]))

  const files = readdirSync(dir).filter(f => f.endsWith('.json'))
  let updated = 0
  let skipped = 0

  for (const file of files) {
    const entry = JSON.parse(readFileSync(new URL(file, dir), 'utf8'))
    const id = byClaim.get(entry.claim.trim())

    if (!id) {
      console.log(`SKIP  ${file} -- no matching row in DB (claim text mismatch)`)
      skipped++
      continue
    }

    const sources = (entry.sources ?? []).map(s => ({ citation: s.citation, pmid: s.pmid ?? null, doi: s.doi ?? null }))

    const { error } = await supabase.from('knowledge_entries').update({ sources }).eq('id', id)
    if (error) {
      console.error(`FAIL  ${file}: ${error.message}`)
      continue
    }

    console.log(`OK    ${file} -> ${sources.length} source(s)`)
    updated++
  }

  console.log(`\n${updated} updated, ${skipped} skipped.`)
}

main().catch(err => {
  console.error('Backfill failed:', err.message)
  process.exit(1)
})
