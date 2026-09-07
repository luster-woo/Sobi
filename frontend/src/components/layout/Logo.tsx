import { Link } from 'react-router-dom'

export default function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2.5">
      <span className="bg-primary font-heading inline-flex size-7 items-center justify-center rounded-md text-[12px] font-bold text-white">
        돕
      </span>
      <span className="typo-label text-text">SOBI</span>
    </Link>
  )
}
