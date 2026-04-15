import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Load .env.local manually — avoids adding dotenv as a dependency
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').replace(/\r/g, '').split('\n') 
   for (const line of lines) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
  }
}




const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seed() {
  const entriesDir = path.join(process.cwd(), 'data', 'knowledge-entries')
  const files = fs.readdirSync(entriesDir).filter(f => f.endsWith('.json'))

  for (const file of files) {
    const raw = fs.readFileSync(path.join(entriesDir, file), 'utf-8')
    const entry = JSON.parse(raw)

    const payload: Record<string, unknown> = {
      claim: entry.claim,
      domain: entry.domain,
      subdomain: entry.subdomain,
      grade: entry.grade,
      source_type: entry.source_type,
      applies_to: entry.applies_to,
      conflicting_evidence: entry.conflicting_evidence,
      what_would_change_this: entry.what_would_change_this,
      practical_translation: entry.practical_summary,
      tags: entry.tags,
      added_by: entry.added_by,
      next_review: entry.next_review,
      open_question: entry.open_question,
      active: true,
    }

    // BAC entries carry eqs: null — only include when present
    if (entry.eqs !== null && entry.eqs !== undefined) {
      payload.eqs = entry.eqs
    }

    const { error } = await supabase
      .from('knowledge_entries')
      .upsert(payload)

    if (error) {
      console.error(`Failed to seed ${file}:`, error)
    } else {
      console.log(`Seeded: ${file}`)
    }
  }

  console.log('Done.')
}

seed()
