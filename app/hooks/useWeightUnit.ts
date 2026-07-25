'use client'

import { useEffect, useState } from 'react'
import { detectLocaleUnit, WEIGHT_STEP, type WeightUnit } from '../lib/units'

// Resolves the athlete's weight unit: read the persisted preference, and if
// it's still sitting at the untouched default, reconcile it once against the
// browser's locale so it doesn't require an explicit settings screen for v1.
export function useWeightUnit() {
  const [unit, setUnit] = useState<WeightUnit>('lb')

  useEffect(() => {
    let cancelled = false

    fetch('/api/athlete')
      .then(res => res.json())
      .then(async (data: { weight_unit: WeightUnit }) => {
        if (cancelled) return

        const detected = detectLocaleUnit()
        if (data.weight_unit === 'lb' && detected === 'kg') {
          const res = await fetch('/api/athlete', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weightUnit: 'kg' }),
          })
          const updated = await res.json()
          if (!cancelled) setUnit(updated.weight_unit)
          return
        }

        setUnit(data.weight_unit)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { unit, step: WEIGHT_STEP[unit] }
}
