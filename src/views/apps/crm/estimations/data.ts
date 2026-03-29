import user1 from '@/assets/images/users/user-1.jpg'
import user2 from '@/assets/images/users/user-2.jpg'
import user3 from '@/assets/images/users/user-3.jpg'
import user4 from '@/assets/images/users/user-4.jpg'
import user5 from '@/assets/images/users/user-5.jpg'
import user6 from '@/assets/images/users/user-6.jpg'
import user7 from '@/assets/images/users/user-7.jpg'
import user8 from '@/assets/images/users/user-8.jpg'
import user9 from '@/assets/images/users/user-9.jpg'
import user10 from '@/assets/images/users/user-10.jpg'

import logoAirbnb from '@/assets/images/logos/airbnb.svg'
import logoAmazon from '@/assets/images/logos/amazon.svg'
import logoApple from '@/assets/images/logos/apple.svg'
import logoAsana from '@/assets/images/logos/asana.svg'
import logoDropbox from '@/assets/images/logos/dropbox.svg'
import logoFigma from '@/assets/images/logos/figma.svg'
import logoMeta from '@/assets/images/logos/meta.svg'
import logoSlack from '@/assets/images/logos/slack.svg'
import logoMicrosoft from '@/assets/images/logos/microsoft.svg'
import logoOpenai from '@/assets/images/logos/openai.svg'
import logoShell from '@/assets/images/logos/shell.svg'


export type EstimateStatus = 'In Review' | 'Approved' | 'Pending' | 'Declined' | 'Sent'

export type EstimateType = {
    id: string
    project: string
    client: {
        name: string
        logo: string
    }
    value: string
        estimatedBy: {
        name: string
        avatar: string
    }
    created: string
    createdTime: string
    expectedClose: string
    expectedCloseTime: string
    status: EstimateStatus
}

export const estimates: EstimateType[] = [
    {
        id: '#EST00042',
        project: 'CRM System Redesign',
        client: { name: 'Airbnb', logo: logoAirbnb },
        value: '$25,000',
        estimatedBy: { name: 'Jason Miller', avatar: user5 },
        created: '15 Jul, 2025',
        createdTime: '09:30 AM',
        expectedClose: '05 Aug, 2025',
        expectedCloseTime: '06:00 PM',
        status: 'In Review',
    },
    {
        id: '#EST00043',
        project: 'Lead Tracking Module',
        client: { name: 'Amazon', logo: logoAmazon },
        value: '$14,200',
        estimatedBy: { name: 'Ava Green', avatar: user4 },
        created: '17 Jul, 2025',
        createdTime: '10:15 AM',
        expectedClose: '02 Aug, 2025',
        expectedCloseTime: '04:30 PM',
        status: 'Approved',
    },
    {
        id: '#EST00044',
        project: 'Marketing Automation',
        client: { name: 'Apple Inc.', logo: logoApple },
        value: '$32,000',
        estimatedBy: { name: 'Liam Scott', avatar: user2 },
        created: '18 Jul, 2025',
        createdTime: '01:40 PM',
        expectedClose: '10 Aug, 2025',
        expectedCloseTime: '01:00 PM',
        status: 'Pending',
    },
    {
        id: '#EST00045',
        project: 'Sales Pipeline Setup',
        client: { name: 'Asana Studio', logo: logoAsana },
        value: '$21,800',
        estimatedBy: { name: 'Noah Carter', avatar: user3 },
        created: '19 Jul, 2025',
        createdTime: '03:00 PM',
        expectedClose: '08 Aug, 2025',
        expectedCloseTime: '05:45 PM',
        status: 'Declined',
    },
    {
        id: '#EST00046',
        project: 'Support Portal Development',
        client: { name: 'Dropbox Inc.', logo: logoDropbox },
        value: '$27,500',
        estimatedBy: { name: 'Emily Stone', avatar: user1 },
        created: '20 Jul, 2025',
        createdTime: '11:20 AM',
        expectedClose: '15 Aug, 2025',
        expectedCloseTime: '09:00 AM',
        status: 'In Review',
    },
    {
        id: '#EST00047',
        project: 'Client Onboarding System',
        client: { name: 'Figma Design', logo: logoFigma },
        value: '$16,600',
        estimatedBy: { name: 'Sophia White', avatar: user6 },
        created: '21 Jul, 2025',
        createdTime: '02:00 PM',
        expectedClose: '06 Aug, 2025',
        expectedCloseTime: '12:00 PM',
        status: 'Sent',
    },
    {
        id: '#EST00048',
        project: 'Customer Insights Dashboard',
        client: { name: 'Meta', logo: logoMeta },
        value: '$29,900',
        estimatedBy: { name: 'Mason Lee', avatar: user7 },
        created: '22 Jul, 2025',
        createdTime: '11:00 AM',
        expectedClose: '10 Aug, 2025',
        expectedCloseTime: '04:00 PM',
        status: 'In Review',
    },
    {
        id: '#EST00049',
        project: 'Workflow Automation Engine',
        client: { name: 'Slack', logo: logoSlack },
        value: '$33,750',
        estimatedBy: { name: 'Olivia James', avatar: user8 },
        created: '23 Jul, 2025',
        createdTime: '09:30 AM',
        expectedClose: '14 Aug, 2025',
        expectedCloseTime: '11:30 AM',
        status: 'Approved',
    },
    {
        id: '#EST00050',
        project: 'Partner API Integration',
        client: { name: 'Microsoft', logo: logoMicrosoft },
        value: '$17,600',
        estimatedBy: { name: 'Ella Kim', avatar: user9 },
        created: '24 Jul, 2025',
        createdTime: '10:45 AM',
        expectedClose: '12 Aug, 2025',
        expectedCloseTime: '03:15 PM',
        status: 'Pending',
    },
    {
        id: '#EST00051',
        project: 'Mobile CRM App Build',
        client: { name: 'ChatGPT', logo: logoOpenai },
        value: '$40,000',
        estimatedBy: { name: 'Daniel Park', avatar: user10 },
        created: '25 Jul, 2025',
        createdTime: '02:30 PM',
        expectedClose: '20 Aug, 2025',
        expectedCloseTime: '05:00 PM',
        status: 'Sent',
    },
    {
        id: '#EST00052',
        project: 'Smart Contact Syncing',
        client: { name: 'Shell Petro.', logo: logoShell },
        value: '$13,250',
        estimatedBy: { name: 'Chloe Nguyen', avatar: user4 },
        created: '26 Jul, 2025',
        createdTime: '01:10 PM',
        expectedClose: '16 Aug, 2025',
        expectedCloseTime: '11:00 AM',
        status: 'Declined',
    },
]