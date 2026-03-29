
import type { FilePondFile, FilePondInitialFile } from 'filepond'
import { FilePond, registerPlugin } from 'react-filepond'
import { useState } from 'react'
import FilePondPluginImageExifOrientation from 'filepond-plugin-image-exif-orientation'
import FilePondPluginImagePreview from 'filepond-plugin-image-preview'
import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap'
import ReactDOMServer from 'react-dom/server'
import { TbCamera } from 'react-icons/tb'

registerPlugin(FilePondPluginImageExifOrientation, FilePondPluginImagePreview)

const ReactFilePond = () => {
  const [files, setFiles] = useState<(string | FilePondInitialFile | Blob)[]>([])
  const [files2, setFiles2] = useState<(string | FilePondInitialFile | Blob)[]>([])
  const [files3, setFiles3] = useState<(string | FilePondInitialFile | Blob)[]>([])
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h4">React Filepond</CardTitle>
      </CardHeader>
      
      <CardBody>
        <div className="mb-3">
          <h5 className="mb-3">Basic Example</h5>
          <div className="filepond-uploader">
            <FilePond
              className="filepond"
              files={files}
              onupdatefiles={(fileItems: FilePondFile[]) => {
                setFiles(fileItems.map((fileItem) => fileItem.file))
              }}
              allowMultiple={true}
              maxFiles={5}
              allowReorder={true}
              server="/api"
            />
          </div>
        </div>

        <div className="mb-3">
          <h5 className="mb-3">Two Grid Example</h5>
          <div className="filepond-uploader two-grid">
            <FilePond
              className="filepond"
              files={files2}
              onupdatefiles={(fileItems: FilePondFile[]) => {
                setFiles2(fileItems.map((fileItem) => fileItem.file))
              }}
              allowMultiple={true}
              maxFiles={5}
              allowReorder={true}
              server="/api"
            />
          </div>
        </div>

        <div>
          <h5 className="mb-3">Three Grid Example</h5>
          <div className="filepond-uploader three-grid">
            <FilePond
              className="filepond"
              files={files3}
              onupdatefiles={(fileItems: FilePondFile[]) => {
                setFiles3(fileItems.map((fileItem) => fileItem.file))
              }}
              allowMultiple={true}
              maxFiles={5}
              allowReorder={true}
              server="/api"
            />
          </div>
        </div>
      </CardBody>

      <div className="border-top border-dashed"></div>

      <CardBody>
        <CardTitle as="h4" className="mb-2">
          Profile Picture
        </CardTitle>

        <p className="text-muted">FilePond is a JavaScript library with profile picture-shaped file upload variation.</p>

        <Row>
          <Col sm={6}>
            <div className="avatar-xxl">
              <FilePond
                className="filepond filepond-input-circle"
                allowMultiple={false}
                maxFiles={1}
                acceptedFileTypes={['image/png', 'image/jpeg', 'image/gif']}
                stylePanelAspectRatio="1:1"
                labelIdle={ReactDOMServer.renderToStaticMarkup(<TbCamera className="fs-32 text-muted" />)}
              />
            </div>
          </Col>
          <Col sm={6}>
            <div className="avatar-xxl">
              <FilePond
                className="filepond filepond-input-circle rounded"
                allowMultiple={false}
                maxFiles={1}
                acceptedFileTypes={['image/png', 'image/jpeg', 'image/gif']}
                stylePanelAspectRatio="1:1"
                labelIdle={ReactDOMServer.renderToStaticMarkup(<TbCamera className="fs-32 text-muted" />)}
              />
            </div>
          </Col>
        </Row>
      </CardBody>
    </Card>
  )
}

export default ReactFilePond
