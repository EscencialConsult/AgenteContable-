import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  formatPeriodo,
  getAllPeriodos,
  getPeriodosByCliente,
  getCurrentPeriodoParts,
  getOrCreatePeriodo,
} from '../db/repositories/periodoRepository'
import { useCliente } from '../hooks/useCliente'
import Select from './ui/Select'

interface Props {
  periodoId?: number
  onPeriodoChange: (periodoId?: number) => void
  allowEmpty?: boolean
  compact?: boolean
}

export default function PeriodoSelector({
  periodoId,
  onPeriodoChange,
  allowEmpty = false,
  compact = false,
}: Props) {
  const { clienteActivo } = useCliente()
  const periodos = useLiveQuery(
    () => clienteActivo?.id ? getPeriodosByCliente(clienteActivo.id) : getAllPeriodos(),
    [clienteActivo?.id],
  )

  useEffect(() => {
    if (allowEmpty || periodos === undefined || periodoId) return

    const ensurePeriodo = async () => {
      const current = getCurrentPeriodoParts()
      const id = await getOrCreatePeriodo(current.mes, current.anio, 'abierto', clienteActivo?.id)
      onPeriodoChange(id)
    }

    ensurePeriodo()
  }, [allowEmpty, onPeriodoChange, periodoId, periodos])

  return (
    <Select
      label={compact ? undefined : 'Periodo'}
      value={periodoId || ''}
      onChange={(e) => {
        onPeriodoChange(e.target.value ? Number(e.target.value) : undefined)
      }}
      className={compact ? 'min-w-[180px]' : 'w-full'}
    >
      {allowEmpty && <option value="">Todos los periodos</option>}
      {!allowEmpty && <option value="">Seleccionar periodo</option>}
      {(periodos || []).map((periodo) => (
        <option key={periodo.id} value={periodo.id}>
          {formatPeriodo(periodo)} - {periodo.estado.replace('_', ' ')}
        </option>
      ))}
    </Select>
  )
}
