import Topbar from '@/components/layout/Topbar'
import Header from '@/components/layout/Header'
import Hero from '@/components/home/Hero'
import CareerFinder from '@/components/home/CareerFinder'
import TrustedBy from '@/components/home/TrustedBy'
import CourseCategories from '@/components/home/CourseCategories'
import TrendingCourses from '@/components/home/TrendingCourses'
import ProfessionalCertificates from '@/components/home/ProfessionalCertificates'
import InstructorSpotlight from '@/components/home/InstructorSpotlight'
import Testimonials from '@/components/home/Testimonials'
import SkillTracker from '@/components/home/SkillTracker'
import ResumeBuilder from '@/components/home/ResumeBuilder'
import MobileAppPromo from '@/components/home/MobileAppPromo'
import BlogSection from '@/components/home/BlogSection'
import NewsletterSignup from '@/components/home/NewsletterSignup'
import PricingPlans from '@/components/home/PricingPlans'
import SupportCenter from '@/components/home/SupportCenter'
import Footer from '@/components/layout/Footer'
import ChatBot from '@/components/common/ChatBot'

export default function HomePage() {
  return (
    <>
      <Topbar />
      <Header />
      <Hero />
      <CareerFinder />
      <TrustedBy />
      <CourseCategories />
      <TrendingCourses />
      <ProfessionalCertificates />
      <InstructorSpotlight />
      <Testimonials />
      <SkillTracker />
      <ResumeBuilder />
      <MobileAppPromo />
      <BlogSection />
      <NewsletterSignup />
      <PricingPlans />
      <SupportCenter />
      <Footer />
      <ChatBot />
    </>
  )
}