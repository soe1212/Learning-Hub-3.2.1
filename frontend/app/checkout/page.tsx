'use client'

import { useRouter } from 'next/navigation'
import CheckoutPage from '@/components/checkout/CheckoutPage'

export default function Checkout() {
  const router = useRouter()

  return (
    <CheckoutPage
      onBack={() => router.back()}
      onComplete={() => router.push('/dashboard')}
    />
  )
}