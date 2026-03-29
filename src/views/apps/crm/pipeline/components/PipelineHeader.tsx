
import { useKanbanContext } from '@/context/useKanbanContext'
import { CardHeader } from 'react-bootstrap'
import { LuCalendarCheck, LuSearch, LuShuffle } from 'react-icons/lu'
import { TbPlus } from 'react-icons/tb'

const PipelineHeader = () => {
  const { sectionModal } = useKanbanContext()
  return (
    <CardHeader className=" d-none d-lg-flex border-light align-items-center gap-2">
      <div className="app-search">
        <input type="search" className="form-control" placeholder="Search tasks..." />
        <LuSearch className="app-search-icon text-muted" />
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2">
        <div className="app-search">
          <select className="form-select form-control">
            <option>Stage</option>
            <option value="Qualification">Qualification</option>
            <option value="Proposal Sent">Proposal Sent</option>
            <option value="Negotiation">Negotiation</option>
            <option value="Won">Won</option>
            <option value="Lost">Lost</option>
          </select>
          <LuShuffle className="app-search-icon text-muted" />
        </div>

        <div className="app-search">
          <select className="form-select form-control">
            <option>Closing Date</option>
            <option value="Today">Today</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
          </select>
          <LuCalendarCheck className="app-search-icon text-muted" />
        </div>
      </div>

      <button type="submit" className="btn btn-secondary ms-lg-auto" onClick={() => sectionModal.toggle()}>
        <TbPlus className="me-1" /> Add New Deal
      </button>
    </CardHeader>
  )
}

export default PipelineHeader
