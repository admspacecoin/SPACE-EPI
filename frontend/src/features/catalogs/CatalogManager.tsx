import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

export type CatalogField = {
  key: string
  label: string
  required?: boolean
  placeholder?: string
}

type Row = { id: string; status: 'ativo' | 'inativo'; [key: string]: unknown }

type CatalogManagerProps = {
  table: string
  title: string
  subtitle?: string
  fields: CatalogField[]
  /** Quando true, filtra/insere sempre com obra_id = obraId (empresas e setores). */
  obraScoped?: boolean
  obraId?: string | null
}

const emptyDraft = (fields: CatalogField[]) =>
  Object.fromEntries(fields.map((f) => [f.key, ''])) as Record<string, string>

export function CatalogManager({
  table,
  title,
  subtitle,
  fields,
  obraScoped,
  obraId,
}: CatalogManagerProps) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState(emptyDraft(fields))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Record<string, string>>({})

  async function load() {
    if (obraScoped && !obraId) return
    setLoading(true)
    let query = supabase.from(table).select('*').order(fields[0].key)
    if (obraScoped && obraId) query = query.eq('obra_id', obraId)
    const { data, error: fetchError } = await query
    if (fetchError) setError(fetchError.message)
    else setRows((data ?? []) as Row[])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obraId])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setCreating(true)
    const payload: Record<string, unknown> = { ...draft, status: 'ativo' }
    if (obraScoped) payload.obra_id = obraId

    const { error: insertError } = await supabase.from(table).insert(payload)
    if (insertError) setError(insertError.message)
    else {
      setDraft(emptyDraft(fields))
      await load()
    }
    setCreating(false)
  }

  function startEdit(row: Row) {
    setEditingId(row.id)
    setEditDraft(Object.fromEntries(fields.map((f) => [f.key, String(row[f.key] ?? '')])))
  }

  async function saveEdit(id: string) {
    setError(null)
    const { error: updateError } = await supabase.from(table).update(editDraft).eq('id', id)
    if (updateError) setError(updateError.message)
    else {
      setEditingId(null)
      await load()
    }
  }

  async function toggleStatus(row: Row) {
    const novoStatus = row.status === 'ativo' ? 'inativo' : 'ativo'
    const { error: updateError } = await supabase
      .from(table)
      .update({ status: novoStatus })
      .eq('id', row.id)
    if (updateError) setError(updateError.message)
    else await load()
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-steel-900">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-steel-500">{subtitle}</p>}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-status-danger/30 bg-status-danger/5 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleCreate} className="mb-5 flex flex-wrap items-end gap-3">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-xs font-medium text-steel-600">{f.label}</label>
            <input
              value={draft[f.key]}
              required={f.required}
              placeholder={f.placeholder}
              onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
              className="rounded-md border border-steel-200 px-3 py-2 text-sm"
            />
          </div>
        ))}
        <button
          type="submit"
          disabled={creating || (obraScoped && !obraId)}
          className="rounded-md bg-safety px-4 py-2 text-sm font-semibold text-steel-950 disabled:opacity-50"
        >
          {creating ? 'Adicionando…' : `+ Adicionar`}
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-steel-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-steel-200 text-left text-xs uppercase tracking-wide text-steel-500">
              {fields.map((f) => (
                <th key={f.key} className="px-4 py-3">
                  {f.label}
                </th>
              ))}
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={fields.length + 2} className="px-4 py-6 text-center text-steel-500">
                  Carregando…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={fields.length + 2} className="px-4 py-6 text-center text-steel-500">
                  Nenhum registro cadastrado ainda.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-steel-100 last:border-0">
                {fields.map((f) =>
                  editingId === row.id ? (
                    <td key={f.key} className="px-4 py-2">
                      <input
                        value={editDraft[f.key] ?? ''}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, [f.key]: e.target.value }))
                        }
                        className="w-full rounded-md border border-steel-200 px-2 py-1 text-sm"
                      />
                    </td>
                  ) : (
                    <td key={f.key} className="px-4 py-3 text-steel-800">
                      {String(row[f.key] ?? '—')}
                    </td>
                  )
                )}
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleStatus(row)}
                    className={
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ' +
                      (row.status === 'ativo'
                        ? 'border-status-ok/30 bg-status-ok/10 text-status-ok'
                        : 'border-status-off/30 bg-status-off/10 text-status-off')
                    }
                  >
                    <span
                      className={
                        'h-1.5 w-1.5 rounded-full ' +
                        (row.status === 'ativo' ? 'bg-status-ok' : 'bg-status-off')
                      }
                    />
                    {row.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  {editingId === row.id ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => saveEdit(row.id)}
                        className="text-xs font-semibold text-status-ok"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-steel-500"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(row)}
                      className="text-xs font-semibold text-steel-600 hover:text-steel-900"
                    >
                      Editar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
