import { DOCS_HELP_MAP, type DocsHelpContextKey } from '@/domains/docs/docsHelpMap'
import { useState } from 'react'
import { Button } from 'react-bootstrap'
import { TbBook } from 'react-icons/tb'
import { DocHelpModal } from './DocHelpModal'

type DocHelpButtonProps = {
  contextKey: DocsHelpContextKey
  label?: string
  className?: string
}

export function DocHelpButton({ contextKey, label = 'Help articles for this page', className }: DocHelpButtonProps) {
  const [open, setOpen] = useState(false)
  const slugs = DOCS_HELP_MAP[contextKey] ?? []

  return (
    <>
      <Button
        type="button"
        variant="light"
        size="sm"
        className={`d-inline-flex align-items-center justify-content-center rounded-circle p-2 border ${className ?? ''}`}
        aria-label={label}
        title={label}
        onClick={() => setOpen(true)}
      >
        <TbBook className="fs-18" />
      </Button>
      <DocHelpModal show={open} onHide={() => setOpen(false)} articleSlugs={slugs} />
    </>
  )
}
