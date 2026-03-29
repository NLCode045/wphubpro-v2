
import { LuPalette } from 'react-icons/lu'
import { useLayoutContext } from '@/context/useLayoutContext'

const MonochromeThemeModeToggler = () => {
  const { toggleMonochromeMode } = useLayoutContext()
  return (
    <div className="topbar-item d-none d-sm-flex">
      <button className="topbar-link" type="button" onClick={()=>toggleMonochromeMode()}>
        <LuPalette className="fs-xxl" />
      </button>
    </div>
  )
}

export default MonochromeThemeModeToggler
