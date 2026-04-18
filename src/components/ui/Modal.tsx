import { ReactNode } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
}

export default function Modal({ title, onClose, children }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4 overscroll-contain" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} aria-label="ปิด" className="text-gray-400 hover:text-gray-600 text-xl leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded">&times;</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
