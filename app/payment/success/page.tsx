// app/payment/success/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Loader2, Download, AlertCircle } from 'lucide-react';

interface PaymentStatus {
  success: boolean;
  orderId?: number;
  orderNumber?: string;
  productTitle?: string;
  downloadToken?: string;
  downloadUrl?: string;
  status?: string;
  message?: string;
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const transactionId = searchParams.get('id');
  const statusParam = searchParams.get('status');

  useEffect(() => {
    if (!transactionId) {
      setError('Aucune information de paiement reçue.');
      setLoading(false);
      return;
    }

    const fetchTransaction = async () => {
      try {
        const response = await fetch(`/api/payments/transaction?transactionId=${transactionId}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erreur lors de la récupération du paiement');
        }

        const data = await response.json();
        setStatus(data);
        setLoading(false);
      } catch (err: any) {
        console.error('Erreur:', err);
        setError(err.message || 'Erreur lors de la vérification du paiement');
        setLoading(false);
      }
    };

    fetchTransaction();
  }, [transactionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Vérification de votre paiement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-800 mt-4">Erreur</h2>
          <p className="text-gray-600 mt-2">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  if (!status || status.status !== 'approved') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-800 mt-4">Paiement en attente</h2>
          <p className="text-gray-600 mt-2">
            Votre paiement est en cours de traitement. Vous recevrez un email de confirmation.
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
        <h1 className="text-2xl font-bold text-gray-800 mt-4">Paiement réussi !</h1>
        <p className="text-gray-600 mt-2">
          Merci pour votre achat. Vous pouvez maintenant télécharger votre produit.
        </p>

        <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
          <p className="text-sm text-gray-500">Commande</p>
          <p className="font-medium text-gray-800">{status.orderNumber}</p>
          <p className="text-sm text-gray-500 mt-2">Produit</p>
          <p className="font-medium text-gray-800">{status.productTitle || 'Téléchargement'}</p>
        </div>

        {status.downloadUrl ? (
          <a
            href={status.downloadUrl}
            className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/30 transition"
          >
            <Download className="w-5 h-5" />
            Télécharger maintenant
          </a>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            Le lien de téléchargement vous sera envoyé par email.
          </p>
        )}

        <button
          onClick={() => router.push('/dashboard')}
          className="mt-4 text-sm text-blue-600 hover:text-blue-700 transition"
        >
          Aller à mon tableau de bord
        </button>
      </div>
    </div>
  );
}