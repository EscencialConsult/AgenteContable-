export function errorHandler(err, req, res, next) {
  console.error(err)
  const status = err.status || 500
  res.status(status).json({ error: err.message || 'Error interno del servidor' })
}

export function formatEdgeError(err) {
  console.error(err)
  const status = err.status || 500
  return new Response(
    JSON.stringify({ error: err.message || 'Error interno del servidor' }),
    { status, headers: { 'Content-Type': 'application/json' } },
  )
}
