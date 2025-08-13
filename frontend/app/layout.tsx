import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LearnHub - Master New Skills, Transform Your Career',
  description: 'Join millions of learners worldwide. Access expert-led courses, earn certificates, and accelerate your professional growth.',
  keywords: 'online learning, courses, education, skills, certificates, career development',
  authors: [{ name: 'LearnHub Team' }],
  openGraph: {
    title: 'LearnHub - Master New Skills, Transform Your Career',
    description: 'Join millions of learners worldwide. Access expert-led courses, earn certificates, and accelerate your professional growth.',
    url: 'https://learnhub.com',
    siteName: 'LearnHub',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LearnHub - Master New Skills, Transform Your Career',
    description: 'Join millions of learners worldwide. Access expert-led courses, earn certificates, and accelerate your professional growth.',
    images: ['/og-image.jpg'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}