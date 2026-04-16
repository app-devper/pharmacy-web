interface Props {
  title: string
  subtitle: string
  color: string
}

export default function KyFormHeader({ title, subtitle, color }: Props) {
  return (
    <div className={`rounded-xl p-4 mb-4 ${color}`}>
      <div className="font-bold text-white text-lg">{title}</div>
      <div className="text-white/80 text-sm mt-0.5">{subtitle}</div>
    </div>
  )
}
