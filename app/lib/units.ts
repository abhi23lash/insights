export type WeightUnit = 'lb' | 'kg'

// The one country that measures gym weights in pounds is the US (a couple
// of others use imperial for some things, but not barbell loading). Every
// other locale region defaults to kg.
export function detectLocaleUnit(): WeightUnit {
  if (typeof navigator === 'undefined') return 'lb'
  const region = new Intl.Locale(navigator.language).maximize().region
  return region === 'US' ? 'lb' : 'kg'
}

// Plate-loading increments differ by unit: 5 lb is a standard small jump
// (2.5 lb plates per side), 5 kg is unusually coarse for the equivalent
// jump in kg gyms, where 2.5 kg is the standard small increment.
export const WEIGHT_STEP: Record<WeightUnit, number> = {
  lb: 5,
  kg: 2.5,
}
