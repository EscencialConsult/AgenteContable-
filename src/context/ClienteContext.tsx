import { createContext, useState, useEffect, useMemo, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getAllClientes } from '../db/repositories/clienteRepository'
import type { Cliente } from '../types/comprobante'

interface ClienteContextValue {
  clienteActivo: Cliente | null
  setClienteActivo: (cliente: Cliente | null) => void
  clientes: Cliente[]
}

export const ClienteContext = createContext<ClienteContextValue>({
  clienteActivo: null,
  setClienteActivo: () => {},
  clientes: [],
})

export function ClienteProvider({ children }: { children: ReactNode }) {
  const clientes = useLiveQuery(() => getAllClientes()) ?? []
  const [clienteActivoId, setClienteActivoId] = useState<number | null>(() => {
    const stored = localStorage.getItem('clienteActivoId')
    return stored ? Number(stored) : null
  })

  useEffect(() => {
    if (clienteActivoId && !clientes.some((c) => c.id === clienteActivoId)) {
      setClienteActivoId(null)
      localStorage.removeItem('clienteActivoId')
    }
  }, [clienteActivoId, clientes])

  const clienteActivo = useMemo(
    () => clientes.find((c) => c.id === clienteActivoId) ?? clientes[0] ?? null,
    [clientes, clienteActivoId],
  )

  useEffect(() => {
    if (!clienteActivoId && clientes.length > 0) {
      const id = clientes[0].id
      if (id) {
        setClienteActivoId(id)
        localStorage.setItem('clienteActivoId', String(id))
      }
    }
  }, [clienteActivoId, clientes])

  const setClienteActivo = (cliente: Cliente | null) => {
    if (cliente?.id) {
      setClienteActivoId(cliente.id)
      localStorage.setItem('clienteActivoId', String(cliente.id))
    } else {
      setClienteActivoId(null)
      localStorage.removeItem('clienteActivoId')
    }
  }

  const value = useMemo(
    () => ({ clienteActivo, setClienteActivo, clientes }),
    [clienteActivo, setClienteActivo, clientes],
  )

  return (
    <ClienteContext.Provider value={value}>
      {children}
    </ClienteContext.Provider>
  )
}
