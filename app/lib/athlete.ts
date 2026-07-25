// Stand-in for real auth. Every logger API route resolves "who is this
// request for" through this single function, so swapping in real sign-in
// later (reading the session instead of an env var) only touches this file.

export function getCurrentAthleteId(): string {
  const athleteId = process.env.DEV_TEST_ATHLETE_ID
  if (!athleteId) throw new Error('DEV_TEST_ATHLETE_ID is not set')
  return athleteId
}
