

import { useState } from 'react'
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap'

import flagDE from '@/assets/images/flags/de.svg'
import flagES from '@/assets/images/flags/es.svg'
import flagIN from '@/assets/images/flags/in.svg'
import flagIT from '@/assets/images/flags/it.svg'
import flagRU from '@/assets/images/flags/ru.svg'
import flagUS from '@/assets/images/flags/us.svg'

export type LanguageOptionType = {
  code: string
  name: string
  nativeName: string
  flag: string
}

const availableLanguages: LanguageOptionType[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: flagUS },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: flagDE },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: flagIT },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: flagES },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: flagRU },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: flagIN },
]

const LanguageDropdown = () => {
  const [language, setLanguage] = useState<LanguageOptionType>(availableLanguages[0])

  return (
    <div className="topbar-item">
      <Dropdown align="end">
        <DropdownToggle as={'button'} className="topbar-link fw-bold drop-arrow-none d-inline-flex align-items-center justify-content-center p-1">
          <img
            src={language.flag}
            alt=""
            width={20}
            height={20}
            className="rounded flex-shrink-0 object-fit-cover"
          />
        </DropdownToggle>
        <DropdownMenu className="dropdown-menu-end">
          {availableLanguages.map((lang) => (
            <DropdownItem key={lang.code} title={lang.name} onClick={() => setLanguage(lang)}>
              <img
                src={lang.flag}
                alt=""
                width={20}
                height={20}
                className="me-2 rounded flex-shrink-0 object-fit-cover align-middle"
              />
              <span className="align-middle">{lang.nativeName}</span>
            </DropdownItem>
          ))}
        </DropdownMenu>
      </Dropdown>
    </div>
  )
}

export default LanguageDropdown
