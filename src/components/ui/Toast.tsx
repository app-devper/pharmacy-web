import { useApp } from '../../context/AppContext'

const colors = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-blue-600',
}

export default function Toast() {
  const { toast } = useApp()
  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg text-white text-sm shadow-lg pointer-events-none transition-[opacity,transform] duration-200 ${colors[toast.type]} ${toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
    >
      {toast.visible ? toast.message : ''}
    </div>
  )
}
