import { Link } from 'react-router-dom'

export default function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2.5">
      <span className="inline-flex size-7 items-center justify-center rounded-md bg-primary font-heading text-[12px] font-bold text-white">
        돕
      </span>
      <span className="typo-label text-text">SOBI</span>
    </Link>
  )
}
