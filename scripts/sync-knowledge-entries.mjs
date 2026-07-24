// Syncs data/knowledge-entries/*.json into Supabase's knowledge_entries table.
// Matches on `claim` text to skip entries already present, so it's safe to re-run
// after adding new reviewed entries to the local knowledge base.

import { readFileSync, readdirSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: new URL('../.env.local', import.meta.url) })

const dir = new URL('../data/knowledge-entries/', import.meta.url)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// knowledge_entries.source_type is constrained to these evidence categories.
// Local files sometimes record a study-design label instead (e.g. narrative_review,
// systematic_review_meta_analysis) -- those all collapse to 'research'; the study
// design itself lives in each entry's sources[].study_design.
const ALLOWED_SOURCE_TYPES = new Set(['research', 'practitioner_consensus', 'platform_outcome', 'mechanistic_theory'])

function toSourceType(sourceType) {
  return ALLOWED_SOURCE_TYPES.has(sourceType) ? sourceType : 'research'
}

function toRow(entry) {
  return {
    claim: entry.claim,
    domain: entry.domain,
    subdomain: entry.subdomain,
    grade: entry.grade,
    source_type: toSourceType(entry.source_type),
    applies_to: entry.applies_to,
    eqs: entry.eqs ?? null,
    conflicting_evidence: entry.conflicting_evidence ?? null,
    what_would_change_this: entry.what_would_change_this,
    practical_translation: entry.practical_summary,
    tags: entry.tags ?? [],
    added_by: entry.added_by,
    date_added: entry.date_added,
    last_reviewed: entry.last_reviewed,
    next_review: entry.next_review ?? null,
    open_question: entry.open_question ?? false,
  }
}

async function main() {
  const files = readdirSync(dir).filter(f => f.endsWith('.json'))

  const { data: existing, error: fetchError } = await supabase
    .from('knowledge_entries')
    .select('claim')

  if (fetchError) throw fetchError

  const existingClaims = new Set(existing.map(row => row.claim.trim()))

  const toInsert = []
  for (const file of files) {
    const entry = JSON.parse(readFileSync(new URL(file, dir), 'utf8'))
    if (existingClaims.has(entry.claim.trim())) continue
    toInsert.push({ file, row: toRow(entry) })
  }

  if (toInsert.length === 0) {
    console.log('Nothing to sync, all local entries already present.')
    return
  }

  const { data: inserted, error: insertError } = await supabase
    .from('knowledge_entries')
    .insert(toInsert.map(item => item.row))
    .select('id, domain, subdomain')

  if (insertError) throw insertError

  toInsert.forEach((item, i) => {
    console.log(`Synced ${item.file} -> ${inserted[i].id} (${inserted[i].domain}/${inserted[i].subdomain})`)
  })
}

main().catch(err => {
  console.error('Sync failed:', err.message)
  process.exit(1)
})
