import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import App from './App.tsx'
import {BrowserRouter} from "react-router";
import AppWrapper from "./components/AppWrapper.tsx";

import 'datatables.net-buttons-bs5/css/buttons.bootstrap5.min.css'
import 'datatables.net-fixedheader-bs5/css/fixedHeader.bootstrap5.min.css'
import 'datatables.net-responsive-bs5/css/responsive.bootstrap5.min.css'
import 'datatables.net-select-bs5/css/select.bootstrap5.min.css'
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css'
import 'filepond/dist/filepond.min.css'
import 'flatpickr/dist/flatpickr.min.css'
import 'jsvectormap/dist/css/jsvectormap.min.css'
import 'ladda/dist/ladda.min.css'
import 'leaflet/dist/leaflet.css'
import 'react-bootstrap-typeahead/css/Typeahead.css'
import 'react-datepicker/dist/react-datepicker.min.css'
import 'react-day-picker/style.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-quill-new/dist/quill.bubble.css'
import 'react-quill-new/dist/quill.core.css'
import 'react-quill-new/dist/quill.snow.css'
import 'simplebar-react/dist/simplebar.min.css'
import 'sweetalert2/dist/sweetalert2.min.css'

import '@/assets/scss/app.scss'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter >
            <AppWrapper>
                <App/>
            </AppWrapper>
        </BrowserRouter>
    </StrictMode>,
)
