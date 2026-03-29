import {useKanbanContext} from '@/context/useKanbanContext'
import type {KanbanTaskType} from '@/types/kanban'

import {Link} from "react-router";
import {Card, CardBody, Dropdown, DropdownItem, DropdownMenu, DropdownToggle} from 'react-bootstrap'
import {
    TbBan,
    TbCalendarTime,
    TbChecklist,
    TbDotsVertical,
    TbEdit,
    TbMessageDots,
    TbShare,
    TbTrash
} from 'react-icons/tb'
import {currency} from '@/helpers'

const TaskItem = ({ item }: { item: KanbanTaskType }) => {
  const { newTaskModal, taskForm } = useKanbanContext()
  return (
    <>
      <Card className="shadow mb-2">
        <CardBody>
          <div className="d-flex align-items-center mb-2">
            <div>
              <h5 className="mb-0 fw-semibold">
                <Link to="" className="link-reset">
                  {item.title}
                </Link>
              </h5>
              <small className="text-muted">{item.company}</small>
            </div>
            <Dropdown className="ms-auto">
              <DropdownToggle className="btn btn-icon btn-sm drop-arrow-none btn-ghost-light text-muted" type="button">
                <TbDotsVertical className="fs-xl" />
              </DropdownToggle>
              <DropdownMenu className="dropdown-menu-end">
                <DropdownItem href="#">
                  <TbShare className="me-2" />
                  Share
                </DropdownItem>
                <DropdownItem onClick={() => newTaskModal.toggle(item.sectionId, item.id)}>
                  <TbEdit className="me-2" />
                  Edit
                </DropdownItem>
                <DropdownItem href="#">
                  <TbBan className="me-2" />
                  Block
                </DropdownItem>
                <DropdownItem className="text-danger" onClick={() => taskForm.deleteRecord(item.id)}>
                  <TbTrash className="me-2" />
                  Delete
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-1">
              <img src={item.user} className="rounded-circle avatar-xs" alt="Mark Allen" />
              <span className="fw-medium text-muted fs-sm">{item.userName}</span>
            </div>
            <div className="d-flex align-items-center gap-1">
              <TbCalendarTime className="text-muted fs-lg" />
              <h5 className="fs-base mb-0 fw-medium">{item.date}</h5>
            </div>
          </div>
          <div className="mt-2">
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2 fs-sm">
                <span className="d-flex align-items-center gap-1">
                  <TbMessageDots className="text-muted fs-lg" /> {item.messages}
                </span>
                <span className="d-flex align-items-center gap-1">
                  <TbChecklist className="text-muted fs-lg" /> {item.tasks}
                </span>
              </div>
              <span className="fw-semibold">
                {currency}
                {item.amount}
              </span>
            </div>
          </div>
        </CardBody>
      </Card>
    </>
  )
}

export default TaskItem
