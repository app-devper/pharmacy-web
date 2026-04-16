import Button from '../ui/Button'

interface Props {
  month: string
  onMonthChange: (m: string) => void
  onAdd?: () => void
  onExportPdf?: () => void
  onExportXlsx?: () => void
  addLabel?: string
}

export default function KyToolbar({ month, onMonthChange, onAdd, onExportPdf, onExportXlsx, addLabel = 'เพิ่มรายการ' }: Props) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div>
        <label className="text-xs font-medium text-gray-500 mr-2">เดือน</label>
        <input
          type="month"
          value={month}
          onChange={e => onMonthChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>
      <div className="flex-1" />
      {onExportXlsx && (
        <Button variant="secondary" onClick={onExportXlsx}
          className="border-green-300 text-green-700 hover:bg-green-50">
          Excel
        </Button>
      )}
      {onExportPdf && (
        <Button variant="secondary" onClick={onExportPdf}>PDF</Button>
      )}
      {onAdd && (
        <Button onClick={onAdd}>{addLabel}</Button>
      )}
    </div>
  )
}
