import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Crumb {
  label: string
  to?: string
}

interface PageTitleProps {
  title: ReactNode
  description?: ReactNode
  crumbs?: Crumb[]
  right?: ReactNode
}

export default function PageTitle({ title, description, crumbs, right }: PageTitleProps) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="space-y-1">
        {crumbs && (
          <p className="typo-caption text-text-muted">
            {crumbs.map((c, i) => (
              <span key={c.label}>
                {i > 0 && ' > '}
                {c.to ? (
                  <Link to={c.to} className="hover:text-text">
                    {c.label}
                  </Link>
                ) : (
                  c.label
                )}
              </span>
            ))}
          </p>
        )}
        <h1 className="typo-h2">{title}</h1>
        {description && <p className="typo-body2 text-text-muted">{description}</p>}
      </div>
      {right}
    </div>
  )
}
