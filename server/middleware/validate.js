export function validateBody(schema) {
  return (req, res, next) => {
    const errors = []

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field]

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} es requerido`)
        continue
      }

      if (value === undefined || value === null || value === '') continue

      if (rules.type === 'string' && typeof value !== 'string') {
        errors.push(`${field} debe ser texto`)
      }

      if (rules.type === 'number') {
        const num = typeof value === 'string' ? Number(value) : value
        if (isNaN(num)) errors.push(`${field} debe ser numérico`)
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(rules.message || `${field} tiene formato inválido`)
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} no debe superar ${rules.maxLength} caracteres`)
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('. ') })
    }

    next()
  }
}
