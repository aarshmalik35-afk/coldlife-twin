const SUPABASE_URL = (
  import.meta.env.VITE_SUPABASE_URL || ''
).replace(/\/$/, '')

const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ''

const REQUEST_TIMEOUT_MS = 10000

export const supabaseConfigReady = Boolean(
  SUPABASE_URL && SUPABASE_KEY
)

function makeError(message, status = 0, details = null) {
  const error = new Error(message)
  error.status = status
  error.details = details
  return error
}

// --------------------------------------------------
// Core REST request handler
// --------------------------------------------------

async function request(path, options = {}) {
  if (!supabaseConfigReady) {
    throw makeError(
      'Supabase URL or public key is missing. Check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY variables.'
    )
  }

  const controller = new AbortController()

  const timer = setTimeout(
    () => controller.abort(),
    options.timeout || REQUEST_TIMEOUT_MS
  )

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    Accept: 'application/json',
    ...(options.headers || {}),
  }

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  try {
    const response = await fetch(`${SUPABASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })

    const raw =
      response.status === 204
        ? ''
        : await response.text()

    let data = null

    if (raw) {
      try {
        data = JSON.parse(raw)
      } catch {
        data = raw
      }
    }

    if (!response.ok) {
      const message =
        data?.message ||
        data?.error_description ||
        data?.hint ||
        data?.error ||
        `Supabase request failed (${response.status})`

      throw makeError(message, response.status, data)
    }

    return { data, response }

  } catch (error) {
    if (error.name === 'AbortError') {
      throw makeError(
        'Supabase request timed out. Check your network or Supabase status.'
      )
    }

    throw error

  } finally {
    clearTimeout(timer)
  }
}

class RestQuery {
  constructor(table) {
    this.table = table
    this.params = new URLSearchParams()
    this.method = 'GET'
    this.body = undefined
    this.head = false
    this.wantCount = false
  }

  select(columns = '*', options = {}) {
    this.params.set('select', columns)

    if (options.count) {
      this.wantCount = true
    }

    if (options.head) {
      this.head = true
    }

    return this
  }

  order(column, { ascending = true } = {}) {
    this.params.set(
      'order',
      `${column}.${ascending ? 'asc' : 'desc'}`
    )

    return this
  }

  limit(value) {
    this.params.set('limit', String(value))
    return this
  }

  eq(column, value) {
    this.params.set(column, `eq.${value}`)
    return this
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject)
  }

  async execute() {
    const query = this.params.toString()

    const path =
      `/rest/v1/${encodeURIComponent(this.table)}` +
      (query ? `?${query}` : '')

    const headers = {}

    if (this.wantCount) {
      headers.Prefer = 'count=exact'
    }

    try {
      const { data, response } = await request(path, {
        method: this.head ? 'HEAD' : this.method,
        body:
          this.body === undefined
            ? undefined
            : JSON.stringify(this.body),
        headers,
      })

      const range =
        response.headers.get('content-range') || ''

      const count = this.wantCount
        ? Number(range.split('/')[1])
        : null

      return {
        data: this.head ? null : data,
        error: null,
        count: Number.isFinite(count) ? count : null,
      }

    } catch (error) {
      return {
        data: null,
        error,
        count: null,
      }
    }
  }
}

export const supabase = {

  from(table) {
    return new RestQuery(table)
  },

  // PostgreSQL RPC functions
  async rpc(functionName, args = {}) {
    try {
      const { data } = await request(
        `/rest/v1/rpc/${encodeURIComponent(functionName)}`,
        {
          method: 'POST',
          body: JSON.stringify(args),
        }
      )

      return { data, error: null }

    } catch (error) {
      return { data: null, error }
    }
  },

  // Supabase Edge Functions
  functions: {
    async invoke(functionName, { body } = {}) {
      try {
        const { data } = await request(
          `/functions/v1/${encodeURIComponent(functionName)}`,
          {
            method: 'POST',
            body: JSON.stringify(body ?? {}),
          }
        )

        return { data, error: null }

      } catch (error) {
        return { data: null, error }
      }
    },
  },

  // Compatibility interface.
  // Actual dashboard updates use REST polling,
  // not a WebSocket Realtime connection.
  channel() {
    const chain = {
      on() {
        return chain
      },
      subscribe() {
        return chain
      },
    }

    return chain
  },

  removeChannel() {},
}

// --------------------------------------------------
// Backend health check
// --------------------------------------------------

export async function checkSupabaseConnection() {
  if (!supabaseConfigReady) {
    return {
      ok: false,
      backend: 'supabase-rest',
      message: 'Supabase environment variables are missing.',
    }
  }

  try {
    const checks = await Promise.all([
      request('/rest/v1/shipments?select=id&limit=1'),
      request('/rest/v1/vehicles?select=id&limit=1'),
    ])

    return {
      ok: true,
      backend: 'supabase-rest',

      dataAvailable: checks.some(
        result =>
          Array.isArray(result.data) &&
          result.data.length > 0
      ),

      message: 'Supabase database is reachable.',
      checkedAt: new Date().toISOString(),
    }

  } catch (error) {
    return {
      ok: false,
      backend: 'supabase-rest',
      message:
        error.message || 'Database connection failed.',
      checkedAt: new Date().toISOString(),
    }
  }
}



export async function supabaseRestFetch(path, options = {}) {
  return request(path, options)
}
