// app/admin/newsletter/campaigns/new/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  Users,
  Mail,
  Sparkles,
  Brain,
  CheckCircle,
  X
} from 'lucide-react';

interface Template {
  id: number;
  name: string;
  subject: string;
  content: string;
  type: string;
  category: string;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedSubscribers, setSelectedSubscribers] = useState<string[]>([]);
  const [personalization, setPersonalization] = useState(true);
  const [preview, setPreview] = useState<{ subject: string; content: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [templatesRes, subscribersRes] = await Promise.all([
        fetch('/api/admin/newsletter/templates'),
        fetch('/api/admin/newsletter/subscribers')
      ]);
      
      const templatesData = await templatesRes.json();
      const subscribersData = await subscribersRes.json();
      
      if (templatesData.success) setTemplates(templatesData.templates);
      if (subscribersData.success) setSubscribers(subscribersData.subscribers || []);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || selectedSubscribers.length === 0) {
      alert('Veuillez sélectionner un template et des abonnés');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate,
          subscriberIds: selectedSubscribers.map(Number),
          personalization
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(`✅ ${data.sent} messages envoyés avec succès !`);
        router.push('/admin/newsletter/campaigns');
      } else {
        alert('❌ ' + (data.error || 'Erreur lors de l\'envoi'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const previewTemplate = async () => {
    if (!selectedTemplate) return;
    const template = templates.find(t => t.id === Number(selectedTemplate));
    if (template) {
      setPreview({
        subject: template.subject,
        content: template.content
      });
    }
  };

  const toggleSelectAll = () => {
    if (selectedSubscribers.length === subscribers.length) {
      setSelectedSubscribers([]);
    } else {
      setSelectedSubscribers(subscribers.map(s => String(s.id)));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 admin-panel">
      <div className="max-w-5xl mx-auto">
        {/* En-tête */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/admin/newsletter/campaigns"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Send className="w-6 h-6 text-blue-600" />
              Nouvelle campagne
            </h1>
            <p className="text-gray-600 text-sm">Envoyez une campagne personnalisée à vos abonnés</p>
          </div>
        </div>

        {/* Formulaire */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulaire principal */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Template */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Sélectionner un template...</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.type})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={previewTemplate}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    >
                      Aperçu
                    </button>
                  </div>
                </div>

                {/* Personnalisation IA */}
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <input
                    type="checkbox"
                    id="personalization"
                    checked={personalization}
                    onChange={(e) => setPersonalization(e.target.checked)}
                    className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="personalization" className="text-sm text-gray-700 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-600" />
                    Personnalisation IA
                    <span className="text-xs text-purple-600">(adapté à chaque abonné)</span>
                  </label>
                </div>

                {/* Abonnés */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Destinataires <span className="text-red-500">*</span>
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-60 overflow-y-auto">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                      <input
                        type="checkbox"
                        checked={selectedSubscribers.length === subscribers.length}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-600">
                        Tout sélectionner ({subscribers.length})
                      </span>
                    </div>
                    {subscribers.map((sub) => (
                      <div key={sub.id} className="flex items-center gap-2 py-1.5 hover:bg-gray-50 rounded px-2">
                        <input
                          type="checkbox"
                          checked={selectedSubscribers.includes(String(sub.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSubscribers([...selectedSubscribers, String(sub.id)]);
                            } else {
                              setSelectedSubscribers(selectedSubscribers.filter(id => id !== String(sub.id)));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{sub.email}</span>
                        {sub.name && <span className="text-xs text-gray-400">({sub.name})</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {sub.status}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedSubscribers.length} abonnés sélectionnés sur {subscribers.length}
                  </p>
                </div>

                {/* Boutons */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Envoyer la campagne
                  </button>
                  <Link
                    href="/admin/newsletter/campaigns"
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Annuler
                  </Link>
                </div>
              </form>
            </div>
          </div>

          {/* Aperçu / Commandes rapides */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                Commandes rapides
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    // Sélectionner tous les actifs
                    const activeIds = subscribers.filter(s => s.status === 'active').map(s => String(s.id));
                    setSelectedSubscribers(activeIds);
                  }}
                  className="w-full text-left text-sm text-green-600 hover:bg-green-50 p-2 rounded-lg transition"
                >
                  ✅ Sélectionner les actifs
                </button>
                <button
                  onClick={() => {
                    // Sélectionner les abonnés avec engagement > 50%
                    const highEngagement = subscribers.filter(s => (s.engagement_score || 0) > 50).map(s => String(s.id));
                    setSelectedSubscribers(highEngagement);
                  }}
                  className="w-full text-left text-sm text-purple-600 hover:bg-purple-50 p-2 rounded-lg transition"
                >
                  🎯 Engagement élevé
                </button>
                <button
                  onClick={() => setSelectedSubscribers([])}
                  className="w-full text-left text-sm text-gray-500 hover:bg-gray-50 p-2 rounded-lg transition"
                >
                  ❌ Désélectionner tout
                </button>
              </div>
            </div>

            {/* Aperçu du template */}
            {preview && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mt-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-500" />
                  Aperçu
                </h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Sujet</p>
                  <p className="text-sm font-medium text-gray-800">{preview.subject}</p>
                  <p className="text-xs text-gray-400 mt-2">Contenu</p>
                  <p className="text-sm text-gray-600 line-clamp-3">{preview.content}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}