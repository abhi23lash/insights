import { supabaseServer } from './supabase-server'

export type KnowledgeEntry = {
  id: string
  domain: string
  subdomain: string
  claim: string
  grade: string
  source_type: string
  eqs: number | null
  applies_to: Record<string, string>
  what_would_change_this: string
  tags: string[]
  sources: { citation: string; pmid: string | null; doi: string | null }[]
}

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  hypertrophy: ['hypertrophy', 'muscle', 'size', 'mass', 'bodybuilding'],
  nutrition: ['nutrition', 'protein', 'diet', 'fat loss', 'weight loss', 'cutting', 'bulking', 'calorie'],
  biomechanics: ['biomechanics', 'mechanics', 'injury', 'pain', 'mobility', 'joint', 'shoulder', 'knee', 'hip', 'ankle', 'elbow', 'wrist', 'spine'],
  training: ['training', 'strength', 'periodization', 'program', 'programming', 'progression', 'fatigue', 'deload', 'recovery', 'powerlifting'],
}

const STOPWORDS = new Set(['and', 'for', 'the', 'to', 'of', 'a', 'with', 'in', 'on'])

function matchDomains(goal: string): string[] {
  const lower = goal.toLowerCase()
  return Object.entries(DOMAIN_KEYWORDS)
    .filter(([, keywords]) => keywords.some(keyword => lower.includes(keyword)))
    .map(([domain]) => domain)
}

function extractTagWords(goal: string): string[] {
  return goal
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(word => word.length > 2 && !STOPWORDS.has(word))
}

// Exact-element overlap (Postgres array `ov`) can't match a hyphenated
// compound tag like "training-frequency" against the word "frequency" --
// the query gets split into single words on non-letters, but the stored tag
// stays one hyphenated string, so it can never equal a fragment of itself.
// Matching in-process against the whole table (small: dozens of rows) lets
// this check substrings both ways instead.
function tagsMatch(tags: string[], tagWords: string[]): boolean {
  return tags.some(tag => tagWords.some(word => tag.includes(word) || word.includes(tag)))
}

export async function getMatchingEntries(goal: string, limit = 6): Promise<KnowledgeEntry[]> {
  const domains = matchDomains(goal)
  const tagWords = extractTagWords(goal)

  if (domains.length === 0 && tagWords.length === 0) return []

  const { data, error } = await supabaseServer
    .from('knowledge_entries')
    .select('id, domain, subdomain, claim, grade, source_type, eqs, applies_to, what_would_change_this, tags, sources')
    .eq('active', true)

  if (error) {
    console.error('Knowledge base query failed:', error.message)
    return []
  }

  const matched = (data ?? []).filter(
    entry => domains.includes(entry.domain) || tagsMatch(entry.tags, tagWords)
  )

  return matched
    .sort((a, b) => (b.eqs ?? -1) - (a.eqs ?? -1))
    .slice(0, limit)
}
