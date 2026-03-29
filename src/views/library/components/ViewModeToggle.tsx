import clsx from 'clsx'
import { TbLayoutGrid, TbLayoutList } from 'react-icons/tb'

export type LibraryViewMode = 'table' | 'grid'

type ViewModeToggleProps = {
  value: LibraryViewMode
  onChange: (mode: LibraryViewMode) => void
  idPrefix?: string
}

const ViewModeToggle = ({ value, onChange, idPrefix = 'library-view' }: ViewModeToggleProps) => {
  return (
    <div className="btn-group" role="group" aria-label="Table or grid view">
      <button
        type="button"
        id={`${idPrefix}-table`}
        className={clsx('btn btn-sm', value === 'table' ? 'btn-primary' : 'btn-outline-secondary')}
        onClick={() => onChange('table')}
        aria-pressed={value === 'table'}
        title="Table view"
      >
        <TbLayoutList className="align-middle" aria-hidden />{' '}
        <span className="d-none d-sm-inline">Table</span>
      </button>
      <button
        type="button"
        id={`${idPrefix}-grid`}
        className={clsx('btn btn-sm', value === 'grid' ? 'btn-primary' : 'btn-outline-secondary')}
        onClick={() => onChange('grid')}
        aria-pressed={value === 'grid'}
        title="Grid view"
      >
        <TbLayoutGrid className="align-middle" aria-hidden />{' '}
        <span className="d-none d-sm-inline">Grid</span>
      </button>
    </div>
  )
}

export default ViewModeToggle
