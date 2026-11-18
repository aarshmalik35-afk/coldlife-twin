
export async function tick() {
  const { data, error } = await supabase.rpc('run_live_demo_tick')

  if (error) {
    console.error('[ColdLife] Simulation tick failed:', error.message)
    throw new Error(error.message || 'Simulation tick failed')
  }

  if (!data) {
    throw new Error('Simulation returned no result.')
  }

  return data
}

export const runSimulationTick = tick
