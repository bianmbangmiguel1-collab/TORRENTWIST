// components/payment/StripePayment.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

interface StripePaymentProps {
  productId: string
  quantity?: number
  onSuccess?: (data: any) => void
}

export default function StripePayment({ productId, quantity = 1, onSuccess }: StripePaymentProps) {
  const [clientSecret, setClientSecret] = useState('')
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState('FCFA')
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Détecter la devise du pays de l'utilisateur
    detectCurrency()
  }, [])

  const detectCurrency = async () => {
    try {
      // Récupérer la localisation
      const res = await fetch('https://ipapi.co/json/')
      const data = await res.json()
      const country = data.country_code
      
      // Obtenir la devise correspondante
      const currencyRes = await fetch(`/api/currency/detect?country=${country}`)
      const currencyData = await currencyRes.json()
      setCurrency(currencyData.currency || 'FCFA')
    } catch (error) {
      setCurrency('FCFA')
    }
  }

  useEffect(() => {
    if (currency) {
      createPaymentIntent()
    }
  }, [currency])

  const createPaymentIntent = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const user = JSON.parse(localStorage.getItem('user') || '{}')

      const res = await fetch('/api/payment/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId,
          userId: user.id,
          quantity,
          currency
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erreur de paiement')
      }

      const data = await res.json()
      setClientSecret(data.clientSecret)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Chargement du paiement...</div>
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg text-red-700">
        <p>{error}</p>
        <button
          onClick={createPaymentIntent}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-lg">
      {clientSecret && (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: '#2563eb',
                colorBackground: '#ffffff',
                colorText: '#1e293b'
              }
            }
          }}
        >
          <PaymentForm 
            onSuccess={onSuccess}
            currency={currency}
            onError={setError}
          />
        </Elements>
      )}
    </div>
  )
}

function PaymentForm({ onSuccess, currency, onError }: any) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError('')

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment/success`,
        payment_method_data: {
          billing_details: {
            name: localStorage.getItem('userName') || 'Client'
          }
        }
      },
      redirect: 'if_required'
    })

    setLoading(false)

    if (submitError) {
      setError(submitError.message || 'Erreur de paiement')
      onError?.(submitError.message)
    } else {
      onSuccess?.({ success: true })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-4">
        <div className="text-sm text-gray-500">Paiement en {currency}</div>
      </div>

      <PaymentElement />

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
      >
        {loading ? 'Traitement en cours...' : 'Payer maintenant'}
      </button>
    </form>
  )
}