import user1 from '@/assets/images/users/user-1.jpg'
import user2 from '@/assets/images/users/user-2.jpg'
import user3 from '@/assets/images/users/user-3.jpg'
import user4 from '@/assets/images/users/user-4.jpg'
import user5 from '@/assets/images/users/user-5.jpg'
import user6 from '@/assets/images/users/user-6.jpg'
import user8 from '@/assets/images/users/user-8.jpg'


type SearchResultType = {
  title: string
  description: string
  url: string
  image: string
  author: string
  publishedDate: string
  sales: number
  comments: number
  likes: number
}

export const searchResults: SearchResultType[] = [
  {
    title: 'NovaMind - AI Content Generator',
    description:
      'NovaMind helps you generate high-quality blog posts, emails, and landing copy using cutting-edge large language models. Ideal for content teams and marketing agencies.',
    url: 'https://aiplatform.tools/novamind',
    image: user4,
    author: 'NeuralNest Labs',
    publishedDate: 'Feb 1, 2025',
    sales: 1238,
    comments: 54,
    likes: 892,
  },
  {
    title: 'NovaMind - AI Content Generator',
    description:
      'NovaMind helps you generate high-quality blog posts, emails, and landing copy using cutting-edge large language models. Ideal for content teams and marketing agencies.',
    url: 'https://aiplatform.tools/novamind',
    image: user1,
    author: 'NeuralNest Labs',
    publishedDate: 'Feb 1, 2025',
    sales: 1238,
    comments: 54,
    likes: 892,
  },

  {
    title: 'VisionIQ - AI Image Analyzer',
    description:
      'VisionIQ scans, labels, and categorizes your image data using advanced computer vision APIs. Ideal for medical, security, and retail apps.',
    url: 'https://aiplatform.tools/visioniq',
    image: user6,
    author: 'PixelSense AI',
    publishedDate: 'Dec 12, 2024',
    sales: 846,
    comments: 42,
    likes: 683,
  },
  {
    title: 'Synthora - Voice & Speech AI',
    description:
      'Synthora offers ultra-realistic AI voice generation and speech recognition tailored for podcasting, IVRs, and accessibility tools.',
    url: 'https://aiplatform.tools/synthora',
    image: user5,
    author: 'VocalForge Systems',
    publishedDate: 'Jan 20, 2025',
    sales: 978,
    comments: 37,
    likes: 765,
  },
  {
    title: 'CodePilot - AI Developer Assistant',
    description:
      'CodePilot enhances developer workflows by offering code suggestions, real-time bug detection, and multi-language support via AI models.',
    url: 'https://aiplatform.tools/codepilot',
    image: user4,
    author: 'DevAI Systems',
    publishedDate: 'Jan 20, 2025',
    sales: 978,
    comments: 37,
    likes: 765,
  },
  {
    title: 'Brainix - AI for Education',
    description:
      'Brainix personalizes eLearning journeys using adaptive AI, real-time analytics, and student behavior insights across multiple platforms.',
    url: 'https://aiplatform.tools/brainix',
    image: user5,
    author: 'Edvanta Labs',
    publishedDate: 'Jan 20, 2025',
    sales: 978,
    comments: 37,
    likes: 765,
  },
]

export const users = [user4, user5, user3, user8, user2]
