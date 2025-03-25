'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'

// FAQ Item component
interface FAQItemProps {
  question: string
  answer: string
  isOpen: boolean
  toggleOpen: () => void
}

const FAQItem = ({ question, answer, isOpen, toggleOpen }: FAQItemProps) => {
  return (
    <div className="border-b border-gray-200 py-4">
      <button
        className="flex w-full justify-between items-center text-left focus:outline-none"
        onClick={toggleOpen}
      >
        <h3 className="text-lg font-medium text-gray-900">{question}</h3>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-[#57068B]" />
        ) : (
          <ChevronDown className="h-5 w-5 text-[#57068B]" />
        )}
      </button>
      <div
        className={`mt-2 pr-12 transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <p className="text-gray-600">{answer}</p>
      </div>
    </div>
  )
}

export default function AboutPage() {
  const [activeTab, setActiveTab] = useState('faq')
  const [openFAQs, setOpenFAQs] = useState<Record<number, boolean>>({})

  const toggleFAQ = (index: number) => {
    setOpenFAQs((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  const faqs = [
    {
      question: 'What is Lost&Found?',
      answer: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
    },
    {
      question: 'How to verify a claimer?',
      answer: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
    },
    {
      question: 'How to use',
      answer: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
    },
    {
      question: 'About the creator',
      answer: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
    },
    {
      question: 'Legal',
      answer: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Logo Only Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-2xl font-bold text-[#57068B]">
                  Lost&Found
                </Link>
              </div>
            </div>
            {/* Navigation Menu */}
            <div className="flex items-center">
              <nav className="flex space-x-8">
                <Link 
                  href="/" 
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
                >
                  Home
                </Link>
                <Link 
                  href="/about" 
                  className="border-b-2 border-[#57068B] text-[#57068B] px-3 py-2 text-sm font-medium"
                >
                  About
                </Link>
                <Link 
                  href="/auth" 
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
                >
                  Sign Up
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
        <div className="lg:text-center mb-12">
          <h2 className="text-base text-[#57068B] font-semibold tracking-wide uppercase">About Us</h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Learn more about Lost&Found
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
            Helping people reconnect with their lost items since 2023.
          </p>
        </div>

        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                className={`${
                  activeTab === 'faq'
                    ? 'border-[#57068B] text-[#57068B]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                onClick={() => setActiveTab('faq')}
              >
                Frequently Asked Questions
              </button>
              <button
                className={`${
                  activeTab === 'about'
                    ? 'border-[#57068B] text-[#57068B]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                onClick={() => setActiveTab('about')}
              >
                About the Project
              </button>
              <button
                className={`${
                  activeTab === 'contact'
                    ? 'border-[#57068B] text-[#57068B]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                onClick={() => setActiveTab('contact')}
              >
                Contact Us
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'faq' && (
          <div className="max-w-3xl mx-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h3>
            <div className="space-y-2">
              {faqs.map((faq, index) => (
                <FAQItem
                  key={index}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={!!openFAQs[index]}
                  toggleOpen={() => toggleFAQ(index)}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="max-w-3xl mx-auto prose prose-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-6">About the Project</h3>
            <p>
              Lost&Found was created to help people reconnect with their lost items. We understand how frustrating and upsetting it can be to lose something important, which is why we've built this platform to make the process of finding lost items easier.
            </p>
            <p>
              Our mission is to create a community where people can help each other by posting found items and searching for lost ones. We believe in the power of community and the goodness of people.
            </p>
            <p>
              The platform is designed to be simple and intuitive, making it easy for anyone to use regardless of their technical expertise.
            </p>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="max-w-3xl mx-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Contact Us</h3>
            <p className="mb-4">
              If you have any questions, suggestions, or feedback, please don't hesitate to reach out to us. We're always looking to improve our service.
            </p>
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">support@lostandfound.com</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900">+1 (555) 123-4567</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Address</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      123 Main Street<br />
                      New York, NY 10001<br />
                      United States
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
          <div className="mt-8 border-t border-gray-200 pt-8">
            <p className="text-base text-gray-400 text-center">
              &copy; 2023 Lost&Found. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
