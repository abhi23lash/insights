// Removes duplicate rows from Supabase's knowledge_entries table.
// Groups rows by exact `claim` text and keeps only the earliest (by date_added)
// row per group, deleting the rest. Run dedupe-knowledge-entries.mjs --dry-run
// first to preview what would be deleted.

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: new URL('../.env.local', import.meta.url) })

const dryRun = process.argv.includes('--dry-run')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  const { data: rows, error } = await supabase
    .from('knowledge_entries')
    .select('id, claim, date_added')

  if (error) throw error

  const groups = new Map()
  for (const row of rows) {
    const group = groups.get(row.claim) ?? []
    group.push(row)
    groups.set(row.claim, group)
  }

  const idsToDelete = []
  for (const group of groups.values()) {
    if (group.length < 2) continue
    const sorted = [...group].sort((a, b) => new Date(a.date_added) - new Date(b.date_added))
    const [, ...duplicates] = sorted
    idsToDelete.push(...duplicates.map(r => r.id))
  }

  console.log(`${rows.length} total rows, ${groups.size} distinct claims, ${idsToDelete.length} duplicate rows to delete.`)

  if (dryRun) {
    console.log('Dry run, nothing deleted. Re-run without --dry-run to apply.')
    return
  }

  if (idsToDelete.length === 0) {
    console.log('Nothing to delete.')
    return
  }

  const { error: deleteError, count } = await supabase
    .from('knowledge_entries')
    .delete({ count: 'exact' })
    .in('id', idsToDelete)

  if (deleteError) throw deleteError

  console.log(`Deleted ${count} duplicate rows.`)
}

main().catch(err => {
  console.error('Dedupe failed:', err.message)
  process.exit(1)
})
