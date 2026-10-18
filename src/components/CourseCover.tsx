export function CourseCover({ scene, className = "", label }: { scene: number; className?: string; label?: string }) {
  return <div role={label ? "img" : undefined} aria-label={label} aria-hidden={!label} className={`course-cover scene-${scene % 4} ${className}`} />;
}
