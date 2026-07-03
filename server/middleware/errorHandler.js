export function errorHandler(err, req, res, _next) {
  const status = err.status || 500
  console.error('[api:error]', {
    status,
    path: req?.path,
    message: err?.message || 'Error interno del servidor',
  })
  res.status(status).json({
    error: status >= 500 ? 'Error interno del servidor' : err.message,
  })
}

export function formatEdgeError(err) {
  const status = err.status || 500
  console.error('[edge:error]', {
    status,
    message: err?.message || 'Error interno del servidor',
  })
  return new Response(
    JSON.stringify({
      error: status >= 500 ? 'Error interno del servidor' : err.message,
    }),
    { status, headers: { 'Content-Type': 'application/json' } },
  )
}
