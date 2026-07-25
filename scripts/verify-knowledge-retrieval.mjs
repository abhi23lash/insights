// Verifies every knowledge_entries row is actually reachable through the
// app's real retrieval logic (app/lib/knowledge.ts), not just present in the
// table. For each entry, builds a query from its own most distinctive tag
// and confirms the entry comes back in the results -- mirrors the exact
// domain-keyword + tag-overlap query the chat API uses, rather than testing
// through the LLM (slower, and adds a layer of noise this doesn't need).

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: new URL('../.env.local', import.meta.url) })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Mirrors app/lib/knowledge.ts exactly.
const DOMAIN_KEYWORDS = {
  hypertrophy: ['hypertrophy', 'muscle', 'size', 'mass', 'bodybuilding'],
  nutrition: ['nutrition', 'protein', 'diet', 'fat loss', 'weight loss', 'cutting', 'bulking', 'calorie'],
  biomechanics: ['biomechanics', 'mechanics', 'injury', 'pain', 'mobility', 'joint', 'shoulder', 'knee', 'hip', 'ankle', 'elbow', 'wrist', 'spine'],
  training: ['training', 'strength', 'periodization', 'program', 'programming', 'progression', 'fatigue', 'deload', 'recovery', 'powerlifting'],
}
const STOPWORDS = new Set(['and', 'for', 'the', 'to', 'of', 'a', 'with', 'in', 'on'])

function matchDomains(goal) {
  const lower = goal.toLowerCase()
  return Object.entries(DOMAIN_KEYWORDS)
    .filter(([, keywords]) => keywords.some(k => lower.includes(k)))
    .map(([domain]) => domain)
}

function extractTagWords(goal) {
  return goal.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 2 && !STOPWORDS.has(w))
}

function tagsMatch(tags, tagWords) {
  return tags.some(tag => tagWords.some(word => tag.includes(word) || word.includes(tag)))
}

async function getMatchingEntries(goal, limit = 6) {
  const domains = matchDomains(goal)
  const tagWords = extractTagWords(goal)
  if (domains.length === 0 && tagWords.length === 0) return []

  const { data, error } = await supabase
    .from('knowledge_entries')
    .select('id, domain, subdomain, claim, tags, eqs')
    .eq('active', true)
  if (error) throw error

  const matched = (data ?? []).filter(e => domains.includes(e.domain) || tagsMatch(e.tags, tagWords))
  return matched.sort((a, b) => (b.eqs ?? -1) - (a.eqs ?? -1)).slice(0, limit)
}

async function main() {
  const { data: entries, error } = await supabase
    .from('knowledge_entries')
    .select('id, domain, subdomain, claim, tags')
    .eq('active', true)
  if (error) throw error

  console.log(`Testing retrieval for ${entries.length} entries...\n`)

  const unreachable = []

  for (const entry of entries) {
    // Use the entry's most distinctive tag (the one least likely to be
    // shared broadly) as the test query, falling back to the first tag.
    const testTag = entry.tags[0]
    const results = await getMatchingEntries(testTag)
    const found = results.some(r => r.id === entry.id)

    const label = `[${entry.domain}/${entry.subdomain}] "${testTag}" -> ${entry.claim.slice(0, 60)}...`
    if (found) {
      console.log(`OK    ${label}`)
    } else {
      console.log(`MISS  ${label}`)
      unreachable.push({ ...entry, testTag })
    }
  }

  console.log(`\n${entries.length - unreachable.length}/${entries.length} reachable via their own primary tag.`)

  if (unreachable.length > 0) {
    console.log('\nUnreachable entries (tried other tags):')
    for (const entry of unreachable) {
      let foundWithAnyTag = false
      for (const tag of entry.tags) {
        const results = await getMatchingEntries(tag)
        if (results.some(r => r.id === entry.id)) {
          console.log(`  ${entry.claim.slice(0, 60)}... -> reachable via tag "${tag}"`)
          foundWithAnyTag = true
          break
        }
      }
      if (!foundWithAnyTag) {
        console.log(`  ${entry.claim.slice(0, 60)}... -> NOT reachable via ANY of its own tags: [${entry.tags.join(', ')}]`)
      }
    }
  }
}

main().catch(err => {
  console.error('Verification failed:', err.message)
  process.exit(1)
})
