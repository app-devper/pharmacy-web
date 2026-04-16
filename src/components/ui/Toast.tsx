import { useApp } from '../../context/AppContext'

const colors = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-blue-600',
}

export default function Toast() {
  const { toast } = useApp()
  if (!toast.visible) return null
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg text-white text-sm shadow-lg ${colors[toast.type]} transition-all`}>
      {toast.message}
    </div>
  )
}
