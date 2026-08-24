export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold text-steel-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-steel-600">{subtitle}</p>}
    </div>
  )
}
