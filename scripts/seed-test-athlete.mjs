// Creates one stub auth user + athlete + athlete_identity row for local dev,
// so the logger can be built and tested before real sign-in exists.
// Safe to re-run: skips creation if the test user already exists.

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: new URL('../.env.local', import.meta.url) })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const TEST_EMAIL = 'dev-test-athlete@pramana.local'

async function main() {
  const { data: existing } = await supabase
    .from('athlete_identity')
    .select('athlete_id, auth_user_id')

  if (existing && existing.length > 0) {
    console.log('Test athlete already exists:', existing[0])
    return
  }

  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    email_confirm: true,
  })
  if (userError) throw userError

  const { data: athlete, error: athleteError } = await supabase
    .from('athletes')
    .insert({})
    .select()
    .single()
  if (athleteError) throw athleteError

  const { error: identityError } = await supabase
    .from('athlete_identity')
    .insert({ athlete_id: athlete.id, auth_user_id: userData.user.id })
  if (identityError) throw identityError

  console.log('Created test athlete:', { athlete_id: athlete.id, auth_user_id: userData.user.id })
}

main().catch(err => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
