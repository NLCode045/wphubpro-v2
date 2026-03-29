import user1 from '@/assets/images/users/user-1.jpg'
import user10 from '@/assets/images/users/user-10.jpg'
import user2 from '@/assets/images/users/user-2.jpg'
import user3 from '@/assets/images/users/user-3.jpg'
import user4 from '@/assets/images/users/user-4.jpg'
import user5 from '@/assets/images/users/user-5.jpg'
import user6 from '@/assets/images/users/user-6.jpg'
import user7 from '@/assets/images/users/user-7.jpg'
import user8 from '@/assets/images/users/user-8.jpg'
import user9 from '@/assets/images/users/user-9.jpg'

import flagBR from '@/assets/images/flags/br.svg'
import flagCA from '@/assets/images/flags/ca.svg'
import flagDE from '@/assets/images/flags/de.svg'
import flagEG from '@/assets/images/flags/eg.svg'
import flagFR from '@/assets/images/flags/fr.svg'
import flagUK from '@/assets/images/flags/gb.svg'
import flagIN from '@/assets/images/flags/in.svg'
import flagJP from '@/assets/images/flags/jp.svg'
import flagUS from '@/assets/images/flags/us.svg'


export type CustomerType = {
  id: string
  name: string
  email: string
  avatar: any
  phone: string
  country: string
  countryLabel: string
  countryFlag: any
  joined: string
  type: string
  company: string
  status: 'Active' | 'Verification Pending' | 'Inactive' | 'Blocked'
}


export const customers: CustomerType[] = [
  {
    id: '1',
    name: 'Michael Thompson',
    email: 'michael@breezetech.com',
    avatar: user2,
    phone: '+44 7911 123456',
    country: 'UK',
    countryLabel: 'UK',
    countryFlag: flagUK,
    joined: 'Jan 15, 2024',
    type: 'Lead',
    company: 'BreezeTech Ltd.',
    status: 'Verification Pending',
  },
  {
    id: '2',
    name: 'Sara Mitchell',
    email: 'sara@novasoft.io',
    avatar: user3,
    phone: '+1 (646) 555-7788',
    country: 'US',
    countryLabel: 'US',
    countryFlag: flagUS,
    joined: 'Feb 1, 2024',
    type: 'Prospect',
    company: 'NovaSoft',
    status: 'Active',
  },
  {
    id: '3',
    name: 'Ravi Deshmukh',
    email: 'ravi@infraview.in',
    avatar: user4,
    phone: '+91 98765 43210',
    country: 'IN',
    countryLabel: 'IN',
    countryFlag: flagIN,
    joined: 'Mar 10, 2024',
    type: 'Client',
    company: 'InfraView Pvt. Ltd.',
    status: 'Inactive',
  },
  {
    id: '4',
    name: 'Laura Kim',
    email: 'laura.kim@pixelhive.co',
    avatar: user5,
    phone: '+82 10-1234-5678',
    country: 'KR',
    countryLabel: 'KR',
    countryFlag: flagJP,
    joined: 'Dec 20, 2023',
    type: 'Client',
    company: 'PixelHive Co.',
    status: 'Blocked',
  },
  {
    id: '5',
    name: 'Jean Dupont',
    email: 'jean@parispro.fr',
    avatar: user6,
    phone: '+33 6 12 34 56 78',
    country: 'FR',
    countryLabel: 'FR',
    countryFlag: flagFR,
    joined: 'Apr 5, 2024',
    type: 'Prospect',
    company: 'ParisPro SARL',
    status: 'Verification Pending',
  },
  {
    id: '6',
    name: 'Amanda Rivera',
    email: 'amanda@brightlabs.io',
    avatar: user7,
    phone: '+1 (213) 555-0192',
    country: 'US',
    countryLabel: 'US',
    countryFlag: flagUS,
    joined: 'Mar 25, 2024',
    type: 'Client',
    company: 'BrightLabs Inc.',
    status: 'Active',
  },
  {
    id: '7',
    name: 'Carlos Mendes',
    email: 'carlos@globalreach.br',
    avatar: user8,
    phone: '+55 11 91234-5678',
    country: 'BR',
    countryLabel: 'BR',
    countryFlag: flagBR,
    joined: 'Feb 18, 2024',
    type: 'Prospect',
    company: 'GlobalReach Ltd.',
    status: 'Verification Pending',
  },
  {
    id: '8',
    name: 'Lena Hoffmann',
    email: 'lena@webnord.de',
    avatar: user9,
    phone: '+49 176 12345678',
    country: 'DE',
    countryLabel: 'DE',
    countryFlag: flagDE,
    joined: 'Apr 3, 2024',
    type: 'Lead',
    company: 'WebNord GmbH',
    status: 'Inactive',
  },
  {
    id: '9',
    name: 'Akira Sato',
    email: 'akira@nippontech.jp',
    avatar: user10,
    phone: '+81 90-1234-5678',
    country: 'JP',
    countryLabel: 'JP',
    countryFlag: flagJP,
    joined: 'Feb 12, 2024',
    type: 'Client',
    company: 'NipponTech',
    status: 'Blocked',
  },
  {
    id: '10',
    name: 'Sophie Dubois',
    email: 'sophie@créatis.fr',
    avatar: user5,
    phone: '+33 7 89 01 23 45',
    country: 'FR',
    countryLabel: 'FR',
    countryFlag: flagFR,
    joined: 'Feb 9, 2024',
    type: 'Client',
    company: 'Créatis SARL',
    status: 'Active',
  },
  {
    id: '11',
    name: 'Omar Farouk',
    email: 'omar@cairoconnect.eg',
    avatar: user1,
    phone: '+20 100 123 4567',
    country: 'EG',
    countryLabel: 'EG',
    countryFlag: flagEG,
    joined: 'Apr 12, 2024',
    type: 'Prospect',
    company: 'CairoConnect',
    status: 'Verification Pending',
  },
  {
    id: '12',
    name: 'John Smith',
    email: 'john@futuredevs.com',
    avatar: user2,
    phone: '+1 (416) 555-3210',
    country: 'CA',
    countryLabel: 'CA',
    countryFlag: flagCA,
    joined: 'Feb 5, 2024',
    type: 'Lead',
    company: 'FutureDevs',
    status: 'Active',
  },
]
