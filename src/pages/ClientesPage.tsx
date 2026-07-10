import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import {
  getAllClientes,
  addCliente,
  updateCliente,
  deleteCliente,
} from '../db/repositories/clienteRepository'
import type { Cliente } from '../types/comprobante'
import { useCliente } from '../hooks/useCliente'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import Button from '../components/ui/Button'
import PageHeader from '../components/ui/PageHeader'
import SearchInput from '../components/ui/SearchInput'
import ConfirmDialog from '../components/ui/ConfirmDialog'

const CONDICIONES_IVA = [
  { value: 'RI', label: 'Responsable Inscripto' },
  { value: 'MONOTRIBUTO', label: 'Monotributista' },
  { value: 'EXENTO', label: 'Exento' },
  { value: 'CONSUMIDOR FINAL', label: 'Consumidor Final' },
  { value: 'IVA NO RESPONSABLE', label: 'IVA No Responsable' },
]

type FormData = {
  razonSocial: string
  cuit: string
  condicionIVA: string
  email: string
  telefono: string
  contacto: string
  activo: boolean
  observaciones: string
}

const emptyForm: FormData = {
  razonSocial: '',
  cuit: '',
  condicionIVA: 'MONOTRIBUTO',
  email: '',
  telefono: '',
  contacto: '',
  activo: true,
  observaciones: '',
}

export default function ClientesPage() {
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [guardando, setGuardando] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Cliente | null>(null)

  const clientes = useLiveQuery(() => getAllClientes()) ?? []
  const { setClienteActivo, clienteActivo } = useCliente()
  const { addToast } = useToast()

  const filtrados = useMemo(() => {
    if (!search.trim()) return clientes
    const q = search.toLowerCase()
    return clientes.filter(
      (c) =>
        c.razonSocial.toLowerCase().includes(q) ||
        c.cuit.includes(q),
    )
  }, [clientes, search])

  const abrirNuevo = () => {
    setEditando(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const abrirEditar = (cliente: Cliente) => {
    setEditando(cliente)
    setForm({
      razonSocial: cliente.razonSocial,
      cuit: cliente.cuit,
      condicionIVA: cliente.condicionIVA,
      email: cliente.email || '',
      telefono: cliente.telefono || '',
      contacto: cliente.contacto || '',
      activo: cliente.activo,
      observaciones: cliente.observaciones || '',
    })
    setModalOpen(true)
  }

  const handleGuardar = async () => {
    if (!form.razonSocial.trim() || !form.cuit.trim()) {
      addToast('error', 'Razón Social y CUIT son obligatorios')
      return
    }
    setGuardando(true)
    try {
      if (editando?.id) {
        await updateCliente(editando.id, form)
        addToast('success', 'Cliente actualizado')
      } else {
        await addCliente(form)
        addToast('success', 'Cliente creado')
      }
      setModalOpen(false)
    } catch {
      addToast('error', 'Error al guardar el cliente')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async () => {
    if (!confirmDelete?.id) return
    try {
      await deleteCliente(confirmDelete.id)
      if (clienteActivo?.id === confirmDelete.id) {
        setClienteActivo(null)
      }
      addToast('success', 'Cliente eliminado')
      setConfirmDelete(null)
    } catch {
      addToast('error', 'Error al eliminar el cliente')
    }
  }

  const condicionLabel = (value: string) =>
    CONDICIONES_IVA.find((c) => c.value === value)?.label || value

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden animate-fadeInUp">
      <PageHeader title="Clientes" subtitle="Administrá tus clientes">
        <Button onClick={abrirNuevo} size="sm">
          <Plus size={16} />
          Nuevo Cliente
        </Button>
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por razón social o CUIT..."
              className="flex-1 max-w-xs"
            />
            <p className="text-text-muted text-sm">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''}</p>
          </div>

          {filtrados.length === 0 ? (
            <div className="bg-glass border border-glass-border rounded-2xl p-12 text-center">
              <Users size={48} className="mx-auto mb-3 text-text-muted opacity-50" />
              <p className="text-text-muted text-sm">
                {search ? 'No hay clientes que coincidan con la búsqueda' : 'No hay clientes todavía'}
              </p>
              {!search && (
                <Button onClick={abrirNuevo} size="sm" className="mt-4">
                  <Plus size={16} />
                  Agregar primer cliente
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-glass border border-glass-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-glass-border text-text-muted text-xs uppercase tracking-wide">
                      <th className="text-left px-4 py-3 font-medium">Razón Social</th>
                      <th className="text-left px-4 py-3 font-medium">CUIT</th>
                      <th className="text-left px-4 py-3 font-medium">Condición IVA</th>
                      <th className="text-left px-4 py-3 font-medium">Contacto</th>
                      <th className="text-center px-4 py-3 font-medium">Activo</th>
                      <th className="text-right px-4 py-3 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((cliente) => (
                      <tr
                        key={cliente.id}
                        className={`border-b border-glass-border/50 transition-colors hover:bg-glass-hover ${
                          clienteActivo?.id === cliente.id ? 'bg-teal/5 border-teal/30' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-text-primary font-medium">{cliente.razonSocial}</span>
                            {clienteActivo?.id === cliente.id && (
                              <span className="px-2 py-0.5 rounded-md bg-teal/20 text-teal text-[10px] font-semibold">
                                Activo
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{cliente.cuit}</td>
                        <td className="px-4 py-3 text-text-secondary">{condicionLabel(cliente.condicionIVA)}</td>
                        <td className="px-4 py-3 text-text-secondary text-xs">
                          {cliente.email || cliente.telefono || '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${
                              cliente.activo ? 'bg-teal' : 'bg-text-muted'
                            }`}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setClienteActivo(cliente)
                                addToast('success', `Cliente activo: ${cliente.razonSocial}`)
                              }}
                              className="p-2 rounded-lg text-text-muted hover:text-teal hover:bg-teal/10 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal/40 focus:ring-offset-1 focus:ring-offset-navy-900"
                              aria-label="Seleccionar como cliente activo"
                            >
                              <Users size={16} />
                            </button>
                            <button
                              onClick={() => abrirEditar(cliente)}
                              className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-glass-hover transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal/40 focus:ring-offset-1 focus:ring-offset-navy-900"
                              aria-label="Editar cliente"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(cliente)}
                              className="p-2 rounded-lg text-text-muted hover:text-error hover:bg-error-bg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal/40 focus:ring-offset-1 focus:ring-offset-navy-900"
                              aria-label="Eliminar cliente"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar Cliente' : 'Nuevo Cliente'} wide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-text-muted text-xs uppercase tracking-wide mb-1.5">Razón Social *</label>
              <input
                type="text"
                value={form.razonSocial}
                onChange={(e) => setForm({ ...form, razonSocial: e.target.value })}
                className="w-full bg-navy-800 border border-glass-border text-text-primary rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/30"
              />
            </div>
            <div>
              <label className="block text-text-muted text-xs uppercase tracking-wide mb-1.5">CUIT *</label>
              <input
                type="text"
                value={form.cuit}
                onChange={(e) => setForm({ ...form, cuit: e.target.value })}
                className="w-full bg-navy-800 border border-glass-border text-text-primary rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/30"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-text-muted text-xs uppercase tracking-wide mb-1.5">Condición IVA</label>
              <select
                value={form.condicionIVA}
                onChange={(e) => setForm({ ...form, condicionIVA: e.target.value })}
                className="w-full bg-navy-800 border border-glass-border text-text-primary rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-300 cursor-pointer hover:bg-glass-hover focus:border-teal focus:shadow-ring-teal-subtle-4 focus:-translate-y-0.5"
              >
                {CONDICIONES_IVA.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-text-muted text-xs uppercase tracking-wide mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-navy-800 border border-glass-border text-text-primary rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/30"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-text-muted text-xs uppercase tracking-wide mb-1.5">Teléfono</label>
              <input
                type="text"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="w-full bg-navy-800 border border-glass-border text-text-primary rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/30"
              />
            </div>
            <div>
              <label className="block text-text-muted text-xs uppercase tracking-wide mb-1.5">Contacto</label>
              <input
                type="text"
                value={form.contacto}
                onChange={(e) => setForm({ ...form, contacto: e.target.value })}
                className="w-full bg-navy-800 border border-glass-border text-text-primary rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/30"
              />
            </div>
          </div>
          <div>
            <label className="block text-text-muted text-xs uppercase tracking-wide mb-1.5">Observaciones</label>
            <textarea
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              rows={3}
              className="w-full bg-navy-800 border border-glass-border text-text-primary rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/30 resize-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="activo"
              checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
              className="w-4 h-4 rounded border-glass-border bg-navy-800 text-teal focus:ring-teal/30"
            />
            <label htmlFor="activo" className="text-text-primary text-sm">Cliente activo</label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-glass-border">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleGuardar} loading={guardando}>
              {editando ? 'Guardar Cambios' : 'Crear Cliente'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleEliminar}
        title="Eliminar Cliente"
        message={
          <>
            ¿Estás seguro de eliminar a <strong className="text-text-primary">{confirmDelete?.razonSocial}</strong>?
            <br />
            Esta acción no se puede deshacer. Los comprobantes asociados no se eliminarán.
          </>
        }
        confirmLabel="Eliminar"
      />
    </div>
  )
}
