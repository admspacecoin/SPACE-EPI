export function exportToCsv(filename: string, rows: Record<string, string | number>[]) {
  if (rows.length === 0) return

  const headers = Object.keys(rows[0])
  const escape = (value: unknown) => {
    const str = String(value ?? '')
    return /[",\n;]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
  }

  // ponto e vírgula como separador + BOM: abre corretamente acentuado no Excel PT-BR
  const lines = [
    headers.join(';'),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(';')),
  ]
  const csvContent = '\uFEFF' + lines.join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
