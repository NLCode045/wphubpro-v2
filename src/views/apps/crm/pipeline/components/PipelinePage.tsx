
import { Card } from 'react-bootstrap'

import { KanbanProvider } from '@/context/useKanbanContext'
import { kanbanSectionsData, KanbanTaskData } from '@/views/apps/crm/pipeline/data'
import PipelineHeader from '@/views/apps/crm/pipeline/components/PipelineHeader'
import Board from '@/views/apps/crm/pipeline/components/Board'
import Modals from '@/views/apps/crm/pipeline/components/Modals'

const PipelinePage = () => {
  return (
    <KanbanProvider sectionsData={kanbanSectionsData} tasksData={KanbanTaskData}>
      <div className="outlook-box kanban-app">
        <Card className="h-100 mb-0 flex-grow-1">
          <PipelineHeader />
          <Board />
          <Modals />
        </Card>
      </div>
    </KanbanProvider>
  )
}

export default PipelinePage
