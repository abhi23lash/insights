// Seeds the full v1 exercise catalog: one flat list, no tier system.
// Idempotent -- matches existing rows by canonical name or a known legacy
// name (the 9 exercises seeded earlier under simpler names), updates them
// in place with the richer metadata, and inserts everything else fresh.

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: new URL('../.env.local', import.meta.url) })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// legacyName lets this reconcile with the original 9-exercise starter seed
// (e.g. "Back Squat" becomes "High-Bar Squat" with "Back Squat" as an alias)
// instead of creating duplicate rows.
const CATALOG = [
  { name: 'High-Bar Squat', legacyName: 'Back Squat', aliases: ['back squat'], movement_pattern: 'squat', resistance_profile: 'free_weight', loading_type: 'external_weight', primary_muscle_group: 'quads', secondary_muscles: ['glutes'], is_unilateral: false },
  { name: 'Front Squat', aliases: [], movement_pattern: 'squat', resistance_profile: 'free_weight', loading_type: 'external_weight', primary_muscle_group: 'quads', secondary_muscles: ['glutes', 'upper_back'], is_unilateral: false },
  { name: 'Hack Squat', aliases: [], movement_pattern: 'squat', resistance_profile: 'plate_loaded', loading_type: 'external_weight', primary_muscle_group: 'quads', secondary_muscles: ['glutes'], is_unilateral: false },
  { name: 'Leg Press', legacyName: 'Leg Press', aliases: [], movement_pattern: 'squat', resistance_profile: 'plate_loaded', loading_type: 'external_weight', primary_muscle_group: 'quads', secondary_muscles: ['glutes', 'hamstrings'], is_unilateral: false },
  { name: 'Bulgarian Split Squat', aliases: ['rear foot elevated split squat', 'RFESS'], movement_pattern: 'squat', resistance_profile: 'free_weight', loading_type: 'external_weight', primary_muscle_group: 'quads', secondary_muscles: ['glutes'], is_unilateral: true },
  { name: 'Romanian Deadlift', aliases: ['RDL'], movement_pattern: 'hinge', resistance_profile: 'free_weight', loading_type: 'external_weight', primary_muscle_group: 'hamstrings', secondary_muscles: ['glutes', 'erectors'], is_unilateral: false },
  { name: 'Conventional Deadlift', legacyName: 'Deadlift', aliases: ['deadlift'], movement_pattern: 'hinge', resistance_profile: 'free_weight', loading_type: 'external_weight', primary_muscle_group: 'posterior_chain', secondary_muscles: ['lats', 'traps'], is_unilateral: false },
  { name: 'Hip Thrust', aliases: ['barbell hip thrust'], movement_pattern: 'hinge', resistance_profile: 'free_weight', loading_type: 'external_weight', primary_muscle_group: 'glutes', secondary_muscles: ['hamstrings'], is_unilateral: false },
  { name: 'Incline Dumbbell Press', aliases: ['incline DB press'], movement_pattern: 'horizontal_push', resistance_profile: 'free_weight', loading_type: 'external_weight', primary_muscle_group: 'chest', secondary_muscles: ['shoulders', 'triceps'], is_unilateral: false },
  { name: 'Flat Dumbbell Press', aliases: ['flat DB press'], movement_pattern: 'horizontal_push', resistance_profile: 'free_weight', loading_type: 'external_weight', primary_muscle_group: 'chest', secondary_muscles: ['shoulders', 'triceps'], is_unilateral: false },
  { name: 'Machine Chest Press', aliases: [], movement_pattern: 'horizontal_push', resistance_profile: 'selectorized', loading_type: 'external_weight', primary_muscle_group: 'chest', secondary_muscles: ['shoulders', 'triceps'], is_unilateral: false },
  { name: 'Cable Fly', aliases: ['cable crossover'], movement_pattern: 'isolation', resistance_profile: 'cable', loading_type: 'external_weight', primary_muscle_group: 'chest', secondary_muscles: [], is_unilateral: false },
  { name: 'Overhead Press', legacyName: 'Overhead Press', aliases: ['OHP', 'standing press'], movement_pattern: 'vertical_push', resistance_profile: 'free_weight', loading_type: 'external_weight', primary_muscle_group: 'shoulders', secondary_muscles: ['triceps'], is_unilateral: false },
  { name: 'Lateral Raise', aliases: ['side raise', 'DB lateral raise'], movement_pattern: 'isolation', resistance_profile: 'free_weight', loading_type: 'external_weight', primary_muscle_group: 'side_delts', secondary_muscles: [], is_unilateral: false },
  { name: 'Cable Lateral Raise', aliases: ['cable laterals'], movement_pattern: 'isolation', resistance_profile: 'cable', loading_type: 'external_weight', primary_muscle_group: 'side_delts', secondary_muscles: [], is_unilateral: false },
  { name: 'Chest-Supported Row', aliases: [], movement_pattern: 'horizontal_pull', resistance_profile: 'free_weight', loading_type: 'external_weight', primary_muscle_group: 'back', secondary_muscles: ['biceps', 'rear_delts'], is_unilateral: false },
  { name: 'Seated Cable Row', legacyName: 'Cable Row', aliases: ['cable row'], movement_pattern: 'horizontal_pull', resistance_profile: 'cable', loading_type: 'external_weight', primary_muscle_group: 'back', secondary_muscles: ['biceps'], is_unilateral: false },
  { name: 'Lat Pulldown', legacyName: 'Lat Pulldown', aliases: [], movement_pattern: 'vertical_pull', resistance_profile: 'cable', loading_type: 'external_weight', primary_muscle_group: 'lats', secondary_muscles: ['biceps'], is_unilateral: false },
  { name: 'Pull-up', legacyName: 'Pull-up', aliases: ['pullup'], movement_pattern: 'vertical_pull', resistance_profile: 'bodyweight', loading_type: 'bodyweight_plus', primary_muscle_group: 'lats', secondary_muscles: ['biceps'], is_unilateral: false },
  { name: 'Chin-up', aliases: ['chinup'], movement_pattern: 'vertical_pull', resistance_profile: 'bodyweight', loading_type: 'bodyweight_plus', primary_muscle_group: 'lats', secondary_muscles: ['biceps'], is_unilateral: false },
  { name: 'Cable Curl', aliases: [], movement_pattern: 'isolation', resistance_profile: 'cable', loading_type: 'external_weight', primary_muscle_group: 'biceps', secondary_muscles: [], is_unilateral: false },
  { name: 'Incline Curl', aliases: [], movement_pattern: 'isolation', resistance_profile: 'free_weight', loading_type: 'external_weight', primary_muscle_group: 'biceps', secondary_muscles: [], is_unilateral: false },
  { name: 'Overhead Tricep Extension', aliases: ['overhead tricep ext'], movement_pattern: 'isolation', resistance_profile: 'cable', loading_type: 'external_weight', primary_muscle_group: 'triceps', secondary_muscles: [], is_unilateral: false },
  { name: 'Tricep Pushdown', aliases: ['cable pushdown'], movement_pattern: 'isolation', resistance_profile: 'cable', loading_type: 'external_weight', primary_muscle_group: 'triceps', secondary_muscles: [], is_unilateral: false },
  { name: 'Standing Calf Raise', aliases: [], movement_pattern: 'isolation', resistance_profile: 'plate_loaded', loading_type: 'external_weight', primary_muscle_group: 'calves', secondary_muscles: [], is_unilateral: false },
  { name: 'Seated Calf Raise', aliases: [], movement_pattern: 'isolation', resistance_profile: 'plate_loaded', loading_type: 'external_weight', primary_muscle_group: 'calves', secondary_muscles: [], is_unilateral: false },
  { name: 'Rear Delt Fly', aliases: ['reverse fly', 'rear delt raise'], movement_pattern: 'isolation', resistance_profile: 'free_weight', loading_type: 'external_weight', primary_muscle_group: 'rear_delts', secondary_muscles: [], is_unilateral: false },

  { name: 'Low-Bar Squat', aliases: ['low bar squat'], movement_pattern: 'squat', resistance_profile: 'free_weight', loading_type: 'external_weight', primary_muscle_group: 'quads', secondary_muscles: ['glutes', 'hamstrings'], is_unilateral: false },
  { name: 'Goblet Squat', aliases: [], movement_pattern: 'squat', resistance_profile: 'free_weight', loading_type: 'external_weight', primary_muscle_group: 'quads', secondary_muscles: [], is_unilateral: false },
  { name: 'Smith Machine Squat', aliases: ['smith squat'], movement_pattern: 'squat', resistance_profile: 'plate_loaded', loading_type: 'external_weight', primary_muscle_group: 'quads', secondary_muscles: ['glutes'], is_unilateral: false },
  { name: 'Stiff-Leg Deadlift', aliases: ['stiff leg deadlift', 'SLDL'], movement_pattern: 'hinge', resistance_profile: 'free_weight', loading_type: 'external_weight', primary_muscle_group: 'hamstrings', secondary_muscles: [], is_unilateral: false },
  { name: 'Good Morning', aliases: [], movement_pattern: 'hinge', resistance_profile: 'free_weight', loading_type: 'external_weight', primary_muscle_group: 'hamstrings', secondary_muscles: ['erectors'], is_unilateral: false },
  { name: 'Back Extension', aliases: ['hyperextension'], movement_pattern: 'hinge', resistance_profile: 'plate_loaded', loading_type: 'bodyweight_plus', primary_muscle_group: 'erectors', secondary_muscles: ['glutes'], is_unilateral: false },
  { name: 'Barbell Bench Press', legacyName: 'Bench Press', aliases: ['bench press', 'flat bench'], movement_pattern: 'horizontal_push', resistance_profile: 'free_weight', loading_type: 'external_weight', primary_muscle_group: 'chest', secondary_muscles: ['triceps', 'shoulders'], is_unilateral: false },
  { name: 'Barbell Row', legacyName: 'Barbell Row', aliases: [], movement_pattern: 'horizontal_pull', resistance_profile: 'free_weight', loading_type: 'external_weight', primary_muscle_group: 'back', secondary_muscles: ['biceps'], is_unilateral: false },
  { name: 'Dumbbell Row', aliases: ['DB row', 'one-arm row'], movement_pattern: 'horizontal_pull', resistance_profile: 'free_weight', loading_type: 'external_weight', primary_muscle_group: 'back', secondary_muscles: ['biceps'], is_unilateral: true },
  { name: 'Upright Row', aliases: [], movement_pattern: 'vertical_pull', resistance_profile: 'free_weight', loading_type: 'external_weight', primary_muscle_group: 'traps', secondary_muscles: ['side_delts'], is_unilateral: false },
  { name: 'Concentration Curl', aliases: [], movement_pattern: 'isolation', resistance_profile: 'free_weight', loading_type: 'external_weight', primary_muscle_group: 'biceps', secondary_muscles: [], is_unilateral: true },
  { name: 'Skullcrusher', aliases: ['lying tricep extension'], movement_pattern: 'isolation', resistance_profile: 'free_weight', loading_type: 'external_weight', primary_muscle_group: 'triceps', secondary_muscles: [], is_unilateral: false },
  { name: 'Tricep Kickback', aliases: [], movement_pattern: 'isolation', resistance_profile: 'free_weight', loading_type: 'external_weight', primary_muscle_group: 'triceps', secondary_muscles: [], is_unilateral: true },
  { name: 'Pec Deck', aliases: ['machine fly'], movement_pattern: 'isolation', resistance_profile: 'selectorized', loading_type: 'external_weight', primary_muscle_group: 'chest', secondary_muscles: [], is_unilateral: false },
]

async function main() {
  const { data: existing, error: fetchError } = await supabase.from('exercises').select('id, name')
  if (fetchError) throw fetchError

  const byName = new Map(existing.map(e => [e.name, e.id]))

  let inserted = 0
  let updated = 0

  for (const entry of CATALOG) {
    const { legacyName, ...row } = entry
    const existingId = byName.get(row.name) ?? (legacyName ? byName.get(legacyName) : undefined)

    if (existingId) {
      const { error } = await supabase.from('exercises').update(row).eq('id', existingId)
      if (error) throw error
      updated++
      console.log(`Updated ${row.name}${legacyName ? ` (was "${legacyName}")` : ''}`)
    } else {
      const { error } = await supabase.from('exercises').insert(row)
      if (error) throw error
      inserted++
      console.log(`Inserted ${row.name}`)
    }
  }

  console.log(`\nDone: ${inserted} inserted, ${updated} updated.`)
}

main().catch(err => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
