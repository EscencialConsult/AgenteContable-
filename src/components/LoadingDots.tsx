interface Props {
  count?: number
}

export default function LoadingDots({ count = 3 }: Props) {
  return (
    <div className="flex gap-2 p-4" role="status" aria-label="Cargando">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="w-2.5 h-2.5 rounded-full bg-teal animate-pulse-dot"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  )
}
