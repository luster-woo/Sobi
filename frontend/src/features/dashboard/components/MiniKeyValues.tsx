import { cn } from '@/shared/utils/cn'

export interface KeyValueItem {
  label: string
  value: string
  /** 값 뒤에 작게 붙는 단위. '만 원' · '%' */
  unit?: string
  /** 증감처럼 좋은 방향을 색으로도 알릴 때. 색만으로 구분되지 않게 부호를 값에 넣는다 */
  tone?: 'default' | 'primary'
}

interface MiniKeyValuesProps {
  items: KeyValueItem[]
}

/**
 * 요약 카드 안의 숫자 묶음 (시안의 .kv).
 *
 * 시안은 한 줄로 늘어놓지만 여기서는 줄바꿈을 허용한다. 오른쪽 열이 292px 인데
 * '3,240만 원' 같은 값이 네 개 들어가면 한 줄에 들어가지 않고, 줄바꿈을 막으면
 * 숫자가 잘리거나 카드가 옆으로 밀린다.
 */
export default function MiniKeyValues({ items }: MiniKeyValuesProps) {
  return (
    <dl className="flex flex-wrap gap-x-4 gap-y-2.5">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-0.5">
          <dt className="text-text-muted text-caption">{item.label}</dt>
          <dd
            className={cn(
              'text-h4 font-medium tabular-nums',
              item.tone === 'primary' ? 'text-primary' : 'text-text',
            )}
          >
            {item.value}
            {item.unit && (
              <span
                className={cn(
                  'text-caption font-normal',
                  item.tone === 'primary' ? 'text-primary' : 'text-text-secondary',
                )}
              >
                {item.unit}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}
