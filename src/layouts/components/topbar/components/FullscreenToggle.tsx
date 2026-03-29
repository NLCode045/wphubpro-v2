
import { LuMaximize, LuMinimize } from 'react-icons/lu'
import { useState } from 'react'

const FullscreenToggle = () => {
  const [fullScreenOn, setFullScreenOn] = useState(false)

  const toggleFullScreen = () => {
    const document: any = window.document
    if (!document.fullscreenElement && /* alternative standard method */ !document.mozFullScreenElement && !document.webkitFullscreenElement) {
      // current working methods
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen()
      } else if (document.documentElement.mozRequestFullScreen) {
        document.documentElement.mozRequestFullScreen()
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen()
      }
      setFullScreenOn(true)
    } else {
      if (document.cancelFullScreen) {
        document.cancelFullScreen()
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen()
      } else if (document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen()
      }
      setFullScreenOn(false)
    }
  }

  return (
    <div className="topbar-item d-none d-sm-flex">
      <button className="topbar-link" type="button" onClick={toggleFullScreen}>
        {fullScreenOn ? <LuMinimize className="fs-xxl" /> : <LuMaximize className="fs-xxl" />}
      </button>
    </div>
  )
}

export default FullscreenToggle
