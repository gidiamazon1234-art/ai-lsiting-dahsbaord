export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="28" height="28" rx="8" className="fill-primary" />
      <path
        d="M17.5 8L11 17.5H15.5L14.5 24L21.5 14H17L17.5 8Z"
        className="fill-primary-foreground"
      />
    </svg>
  )
}
