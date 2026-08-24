import clsx from 'clsx'

type Status = 'ok' | 'warn' | 'critical' | 'danger' | 'off'

const LABELS: Record<Status, string> = {
  ok: 'Normal',
  warn: 'Atenção',
  critical: 'Crítico',
  danger: 'Problema',
  off: 'Inativo',
}

const DOT: Record<Status, string> = {
  ok: 'bg-status-ok',
  warn: 'bg-status-warn',
  critical: 'bg-status-critical',
  danger: 'bg-status-danger',
  off: 'bg-status-off',
}

export function StatusBadge({ status, label }: { status: Status; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-steel-200 bg-white px-2.5 py-0.5 text-xs font-medium text-steel-700">
      <span className={clsx('h-2 w-2 rounded-full', DOT[status])} />
      {label ?? LABELS[status]}
    </span>
  )
}
