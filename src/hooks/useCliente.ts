import { useContext } from 'react'
import { ClienteContext } from '../context/ClienteContext'

export function useCliente() {
  return useContext(ClienteContext)
}
