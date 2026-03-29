import user1 from '@/assets/images/users/user-1.jpg'
import user2 from '@/assets/images/users/user-2.jpg'
import user3 from '@/assets/images/users/user-3.jpg'
import user4 from '@/assets/images/users/user-4.jpg'
import user7 from '@/assets/images/users/user-7.jpg'
import user8 from '@/assets/images/users/user-8.jpg'
import user9 from '@/assets/images/users/user-9.jpg'

import caFlag from '@/assets/images/flags/ca.svg'
import cnFlag from '@/assets/images/flags/cn.svg'
import esFlag from '@/assets/images/flags/es.svg'
import gbFlag from '@/assets/images/flags/gb.svg'
import itFlag from '@/assets/images/flags/it.svg'
import jpFlag from '@/assets/images/flags/jp.svg'
import egFlag from '@/assets/images/flags/eg.svg'
import usFlag from '@/assets/images/flags/us.svg'

export type ContactType = {
 id: number
    name: string
    avatar: string
    flag: string
    role: string
    badge: { label: string, color: string },
    username: string
    website: string,
    stats: { posts: number, followers: string, followings: number },
    lastUpdated: string
}

export const contacts: ContactType[] = [
  {
    id: 1,
    name: "Sophia Carter",
    avatar: user1,
    flag: gbFlag,
    role: "Lead UI/UX Designer",
    badge: { label: "Admin", color: "secondary" },
    username: "@Founder",
    website: "sophiacarter.com",
    stats: { posts: 134, followers: "29.8k", followings: 1125 },
    lastUpdated: "1 hour ago"
  },
  {
    id: 2,
    name: "Daniel Lee",
    avatar: user2,
    flag: usFlag,
    role: "Product Manager",
    badge: { label: "Verified", color: "success" },
    username: "@danielpm",
    website: "daniellee.com",
    stats: { posts: 98, followers: "12.5k", followings: 860 },
    lastUpdated: "2 hours ago"
  },
  {
    id: 3,
    name: "Maria Rodriguez",
    avatar: user3,
    flag: esFlag,
    role: "Marketing Head",
    badge: { label: "Team Lead", color: "info" },
    username: "@maria",
    website: "mariaworks.es",
    stats: { posts: 205, followers: "18.4k", followings: 1432 },
    lastUpdated: "3 hours ago"
  },
  {
    id: 4,
    name: "Liam Zhang",
    avatar: user4,
    flag: cnFlag,
    role: "Frontend Developer",
    badge: { label: "Contributor", color: "warning" },
    username: "@liamdev",
    website: "liamzhang.cn",
    stats: { posts: 67, followers: "9.3k", followings: 540 },
    lastUpdated: "10 mins ago"
  },
  {
    id: 5,
    name: "Ethan Wright",
    avatar: user7,
    flag: caFlag,
    role: "Senior Backend Engineer",
    badge: { label: "Moderator", color: "primary" },
    username: "@DevOps",
    website: "ethanwright.dev",
    stats: { posts: 89, followers: "16.4k", followings: 734 },
    lastUpdated: "45 mins ago"
  },
  {
    id: 6,
    name: "Isabella Moretti",
    avatar: user8,
    flag: itFlag,
    role: "Content Strategist",
    badge: { label: "Top Creator", color: "danger" },
    username: "@isamoretti",
    website: "moretti.io",
    stats: { posts: 162, followers: "24.7k", followings: 921 },
    lastUpdated: "2 hours ago"
  },
  {
    id: 7,
    name: "Kenji Tanaka",
    avatar: user9,
    flag: jpFlag,
    role: "Full Stack Developer",
    badge: { label: "Contributor", color: "info" },
    username: "@kenjicode",
    website: "kenjitanaka.dev",
    stats: { posts: 113, followers: "13.9k", followings: 678 },
    lastUpdated: "30 mins ago"
  },
  {
    id: 8,
    name: "Amira El-Sayed",
    avatar: user1,
    flag: egFlag,
    role: "Data Scientist",
    badge: { label: "Analyst", color: "warning" },
    username: "@amira.codes",
    website: "amira-ai.tech",
    stats: { posts: 176, followers: "21.1k", followings: 998 },
    lastUpdated: "20 mins ago"
  }
]
