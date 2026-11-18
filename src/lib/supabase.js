
export async function checkSupabaseConnection() {
  if (!supabaseConfigReady) {
    return {
      ok: false,
      backend: 'supabase-rest',
      message: 'Supabase environment variables are missing.',
    }
  }

  try {
    // Check the actual operational tables, not just project reachability.
    const checks = await Promise.all([
      request('/rest/v1/shipments?select=id&limit=1'),
      request('/rest/v1/vehicles?select=id&limit=1'),
    ])

    return {
      ok: true,
      backend: 'supabase-rest',
      dataAvailable: checks.some(
        result => Array.isArray(result.data) && result.data.length > 0
      ),
      message: 'Supabase database is reachable.',
      checkedAt: new Date().toISOString(),
    }
  } catch (error) {
    return {
      ok: false,
      backend: 'supabase-rest',
      message: error.message || 'Database connection failed.',
      checkedAt: new Date().toISOString(),
    }
  }
}
