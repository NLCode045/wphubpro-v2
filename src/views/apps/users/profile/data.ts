import user7 from '@/assets/images/users/user-7.jpg'
import user8 from '@/assets/images/users/user-8.jpg'
import user9 from '@/assets/images/users/user-9.jpg'
import user10 from '@/assets/images/users/user-10.jpg'
import user2 from '@/assets/images/users/user-2.jpg'


type TaskType = {
  id: number
  title: string
  due: string
  status: {
    label: string
    color: string
  }
  assignedBy: {
    name: string
    email: string
    avatar: string
  }
  startDate: string
  priority: {
    label: string
    color: string
  }
  progress: string
  timeSpent: string
}


export const taskData: TaskType[] = [
    {
        id: 1,
        title: "Blazor Admin Theme – Final QA",
        due: "Due in 3 days",
        status: { label: "In-progress", color: "soft-warning" },
        assignedBy: {
            name: "Jordan Walsh",
            email: "jordan@uxlabs.io",
            avatar: user7
        },
        startDate: "Jul 20, 2025",
        priority: { label: "High", color: "soft-danger" },
        progress: "60%",
        timeSpent: "9h 10min"
    },
    {
        id: 2,
        title: "Vue 3 UI Kit Refactor",
        due: "Due in 8 days",
        status: { label: "Completed", color: "soft-success" },
        assignedBy: {
            name: "Emily Foster",
            email: "emily@devspark.pro",
            avatar: user8
        },
        startDate: "Jul 10, 2025",
        priority: { label: "Low", color: "soft-success" },
        progress: "100%",
        timeSpent: "27h 20min"
    },
    {
        id: 3,
        title: "HTML Email Templates Pack",
        due: "Due in 1 day",
        status: { label: "In-progress", color: "soft-warning" },
        assignedBy: {
            name: "Ella Newman",
            email: "ella@mailgenius.app",
            avatar: user9
        },
        startDate: "Jul 18, 2025",
        priority: { label: "Medium", color: "soft-primary" },
        progress: "55%",
        timeSpent: "5h 40min"
    },
    {
        id: 4,
        title: "Bootstrap 5 Theme Migration",
        due: "Due in 6 days",
        status: { label: "On Hold", color: "soft-dark" },
        assignedBy: {
            name: "Daniel Rhodes",
            email: "daniel@uideck.net",
            avatar: user10
        },
        startDate: "Jul 16, 2025",
        priority: { label: "Low", color: "soft-secondary" },
        progress: "25%",
        timeSpent: "4h 15min"
    },
    {
        id: 5,
        title: "SaaS Dashboard: UX Testing",
        due: "Due in 9 days",
        status: { label: "Outdated", color: "soft-danger" },
        assignedBy: {
            name: "Leo Patterson",
            email: "leo@uxcore.studio",
            avatar: user2
        },
        startDate: "Jul 05, 2025",
        priority: { label: "High", color: "soft-danger" },
        progress: "20%",
        timeSpent: "12h 30min"
    }
]
