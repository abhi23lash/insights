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

export async function getMatchingEntries(goal: string, limit = 6): Promise<KnowledgeEntry[]> {
  const domains = matchDomains(goal)
  const tagWords = extractTagWords(goal)

  const orParts: string[] = []
  if (domains.length > 0) orParts.push(`domain.in.(${domains.join(',')})`)
  if (tagWords.length > 0) orParts.push(`tags.ov.{${tagWords.join(',')}}`)

  if (orParts.length === 0) return []

  const { data, error } = await supabaseServer
    .from('knowledge_entries')
    .select('id, domain, subdomain, claim, grade, source_type, eqs, applies_to, what_would_change_this, tags')
    .eq('active', true)
    .or(orParts.join(','))
    .order('eqs', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error) {
    console.error('Knowledge base query failed:', error.message)
    return []
  }

  return data ?? []
}
