interface Props {
  value: number;
  max?: number;
  size?: number;
}

export function Stars({ value, max = 3, size = 16 }: Props) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value}/${max} 星`}>
      {Array.from({ length: max }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24"
          fill={i < value ? '#E8930C' : 'none'} stroke={i < value ? '#E8930C' : '#D8D1C4'}
          strokeWidth="1.5" strokeLinejoin="round">
          <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" />
        </svg>
      ))}
    </span>
  );
}
