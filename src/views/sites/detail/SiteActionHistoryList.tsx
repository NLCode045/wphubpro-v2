import type { ActionAuditLine } from '@/domains/sites';

type SiteActionHistoryListProps = {
  lines: ActionAuditLine[];
  emptyText: string;
  variant: 'sidebar-dark' | 'panel-light';
  /** Omit to show all */
  maxItems?: number;
};

const SiteActionHistoryList = ({ lines, emptyText, variant, maxItems }: SiteActionHistoryListProps) => {
  const isDark = variant === 'sidebar-dark';
  const show = maxItems != null && maxItems > 0 ? lines.slice(0, maxItems) : lines;

  if (show.length === 0) {
    return (
      <p className={`mb-0 ${isDark ? 'text-white-50' : 'text-muted'} fs-xs`}>{emptyText}</p>
    );
  }

  const borderClass = isDark ? 'border-white border-opacity-10' : 'border-light';
  const dateClass = isDark ? 'text-white-50' : 'text-muted';
  const nameClass = isDark ? 'text-white' : 'text-body';
  const kindClass = isDark ? 'text-white-50' : 'text-muted';

  return (
    <ul className={`list-unstyled mb-0 ${isDark ? '' : 'small'}`}>
      {show.map((line, i) => (
        <li
          key={line.id}
          className={`pb-2 ${i < show.length - 1 ? `mb-2 border-bottom ${borderClass}` : ''}`}
        >
          <div className="d-flex flex-wrap align-items-baseline column-gap-2 row-gap-1 fs-xs">
            <span className={`${dateClass} font-monospace text-nowrap`}>{line.dateTime}</span>
            <span className={`fw-semibold ${nameClass}`}>{line.extensionName}</span>
            <span className={kindClass}>({line.kind})</span>
            <span className={`badge ${isDark ? 'badge-soft-light text-dark' : 'badge-soft-secondary'}`}>
              {line.actionLabel}
              {line.failed ? ' (failed)' : ''}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default SiteActionHistoryList;
