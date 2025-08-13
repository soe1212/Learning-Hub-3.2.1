'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { CartItem, Course } from '@/types'
import toast from 'react-hot-toast'

interface CartContextType {
  items: CartItem[]
  addToCart: (course: Course) => void
  removeFromCart: (courseId: string) => void
  clearCart: () => void
  total: number
  itemCount: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export const useCart = () => {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

interface CartProviderProps {
  children: ReactNode
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    const savedCart = localStorage.getItem('learnhub-cart')
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart))
      } catch (error) {
        console.error('Error loading cart from localStorage:', error)
        localStorage.removeItem('learnhub-cart')
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('learnhub-cart', JSON.stringify(items))
  }, [items])

  const addToCart = (course: Course) => {
    setItems((prev) => {
      const exists = prev.find((item) => item.courseId === course.id)
      if (exists) {
        toast.error('Course already in cart')
        return prev
      }

      toast.success('Course added to cart')
      return [
        ...prev,
        {
          courseId: course.id,
          course,
          addedAt: new Date(),
        },
      ]
    })
  }

  const removeFromCart = (courseId: string) => {
    setItems((prev) => {
      const filtered = prev.filter((item) => item.courseId !== courseId)
      toast.success('Course removed from cart')
      return filtered
    })
  }

  const clearCart = () => {
    setItems([])
    toast.success('Cart cleared')
  }

  const total = items.reduce((sum, item) => sum + item.course.price, 0)
  const itemCount = items.length

  const value = {
    items,
    addToCart,
    removeFromCart,
    clearCart,
    total,
    itemCount,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}