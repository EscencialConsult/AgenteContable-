import axios from 'axios'

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL

export async function validateDNI(dni) {
  if (!APPS_SCRIPT_URL) {
    throw new Error(
      'APPS_SCRIPT_URL no configurada en .env. ' +
      'Deployá el Web App de Google Apps Script y pegá la URL.',
    )
  }

  const res = await axios.post(
    APPS_SCRIPT_URL,
    { dni: dni.trim() },
    {
      headers: { 'Content-Type': 'application/json' },
      maxRedirects: 5,
    },
  )

  return res.data.valido === true
}
