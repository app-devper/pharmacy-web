import { useApp } from '../context/AppContext'

export function useToast() {
  return useApp().showToast
}
