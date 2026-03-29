import FileUploader from '@/components/FileUploader'
import type {FileType} from '@/types'
import {useState} from 'react'
import {Card, CardBody, CardHeader, CardTitle} from 'react-bootstrap'

const Dropzone = () => {
  const [files, setFiles] = useState<FileType[]>([])

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h4">React Dropzone</CardTitle>
      </CardHeader>

      <CardBody className="pt-0">
        <FileUploader
          files={files}
          setFiles={(newFiles) => setFiles(newFiles as FileType[])}
          accept={{
            'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
          }}
          maxSize={1024 * 1024 * 10}
          maxFileCount={10}
          multiple
        />
      </CardBody>
    </Card>
  )
}

export default Dropzone
