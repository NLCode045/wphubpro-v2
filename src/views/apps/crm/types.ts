import type {IconType} from 'react-icons'
import type {VariantType} from '@/types'

export type ContactType = {
    id: number
    name: string
    description: string
    email: string
    phone: string
    avatar?: string
    label: {
        text: string
        variant: string
    }
    categories: {
        name: string
        variant: string
    }[]
    stats: {
        title: string
        count: number
        prefix?: string
        suffix?: string
    }[]
}

export type OpportunitiesType = {
    id: string
    productName: string
    productBy: string
    productLogo: string
    customerName: string
    customerEmail: string
    customerAvatar: string
    stage: string
    amount: string
    closeDate: string
    source: string
    owner: string
    status: "open" | "in-progress" | "closed"
    priority: "low" | "medium" | "high"
}

export type DealWidgetType = {
    count: string
    change: string
    icon: IconType
    title: string
    progress: number
    variant: VariantType
}

export type DealType = {
    id: number;
    name: string;
    company: string;
    logo: string;
    amount: number;
    stage: string;
    probability: number;
    date: string;
};

export type LeadType = {
    id: string;
    customer: string;
    company: string;
    logo: string;
    email: string;
    phone: string;
    amount: number;
    tag: { label: string; color: string };
    assigned: { avatar: string; name: string };
    status: string;
    statusVariant: string;
    created: string;
};

