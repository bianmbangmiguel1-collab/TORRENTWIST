// app/admin/campaigns/CampaignEditor.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createCampaign, updateCampaign, getCampaign, createSlide, updateSlide, deleteSlide, reorderSlides } from '@/lib/admin-actions';
import SlideList from './SlideList';
import SlideEditor from './SlideEditor';
import BannerPreview from './BannerPreview';
import AnimationPanel from './AnimationPanel';
import SchedulePanel from './SchedulePanel';
import TargetingPanel from './TargetingPanel';
import { ArrowLeft, Save, Send, X } from 'lucide-react';

interface Campaign {
  id?: number;
  name: string;
  status: 'draft' | 'scheduled' | 'active' | 'ended';
  type: 'image' | 'video' | 'audio' | 'carousel' | 'story' | 'collection' | 'product' | 'promotion';
  start_date?: string;
  end_date?: string;
  timezone?: string;
  target_audience?: string;
  devices?: string; // JSON array
  countries?: string; // JSON array
  languages?: string; // JSON array
  seo_alt?: string;
  seo_title?: string;
  contrast_check?: number;
  created_at?: string;
  updated_at?: string;
  slides?: Slide[];
}

interface Slide {
  id?: number;
  campaign_id: number;
  position: number;
  type: string;
  title?: string;
  subtitle?: string;
  description?: string;
  cta_text?: string;
  cta_action?: string;
  cta_value?: string;
  media_type?: string;
  media_url?: string;
  media_desktop?: string;
  media_tablet?: string;
  media_mobile?: string;
  video_source?: string;
  video_autoplay?: number;
  video_muted?: number;
  video_loop?: number;
  video_controls?: number;
  video_max_duration?: number;
  video_fallback_image?: string;
  audio_url?: string;
  audio_autoplay?: number;
  audio_controls?: number;
  content_position?: string;
  content_alignment?: string;
  overlay_opacity?: number;
  text_color?: string;
  button_color?: string;
  background_color?: string;
  animation_entrance?: string;
  animation_text?: string;
  animation_transition?: string;
  autoplay_interval?: number;
  autoplay_pause_on_hover?: number;
  promotion_id?: number;
  product_ids?: string; // JSON array
  collection_id?: number;
  category_id?: number;
  destination_type?: string;
  destination_value?: string;
  created_at?: string;
  updated_at?: string;
}

interface CampaignEditorProps {
  campaignId?: number; // si présent, édition ; sinon création
  isNew?: boolean;
}

export default function CampaignEditor({ campaignId, isNew = false }: CampaignEditorProps) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign>({
    name: '',
    status: 'draft',
    type: 'carousel',
    timezone: 'Africa/Douala',
    target_audience: 'all',
    devices: '["desktop","tablet","mobile"]',
    contrast_check: 1,
  });
  const [slides, setSlides] = useState<Slide[]>([]);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState<number | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger la campagne existante
  useEffect(() => {
    if (campaignId) {
      const loadCampaign = async () => {
        setLoading(true);
        setError(null);
        try {
          const data = await getCampaign(campaignId);
          if (data) {
            setCampaign(data);
            if (data.slides) {
              setSlides(data.slides);
              // Sélectionner le premier slide si disponible
              if (data.slides.length > 0 && selectedSlideIndex === null) {
                setSelectedSlideIndex(0);
              }
            }
          }
        } catch (err) {
          console.error('Erreur chargement campagne', err);
          setError('Impossible de charger la campagne.');
        } finally {
          setLoading(false);
        }
      };
      loadCampaign();
    }
  }, [campaignId]);

  // Ajouter un slide
  const addSlide = async () => {
    const newSlide: Slide = {
      campaign_id: campaignId || 0,
      position: slides.length,
      type: 'image',
      title: '',
      subtitle: '',
      description: '',
      cta_text: '',
      cta_action: '',
      cta_value: '',
      media_type: 'image',
      media_url: '',
      content_position: 'center',
      content_alignment: 'center',
      overlay_opacity: 65,
      text_color: '#ffffff',
      button_color: '#2563eb',
      background_color: '#000000',
      animation_entrance: 'fade',
      animation_text: 'fade-up',
      animation_transition: 'fade',
      autoplay_interval: 5,
      autoplay_pause_on_hover: 1,
      destination_type: '',
      destination_value: '',
    };
    if (campaignId) {
      try {
        const id = await createSlide({ ...newSlide, campaign_id: campaignId });
        newSlide.id = id;
        setSlides([...slides, newSlide]);
        setSelectedSlideIndex(slides.length);
      } catch (err) {
        console.error('Erreur création slide', err);
        setError('Impossible d\'ajouter le slide.');
      }
    } else {
      // En création, stockage local, on simule un id négatif
      newSlide.id = -Date.now();
      setSlides([...slides, newSlide]);
      setSelectedSlideIndex(slides.length);
    }
  };

  // Mettre à jour un slide
  const updateSlideData = async (index: number, data: Partial<Slide>) => {
    const updated = [...slides];
    const slide = updated[index];
    const newSlide = { ...slide, ...data };
    updated[index] = newSlide;
    setSlides(updated);

    if (newSlide.id && typeof newSlide.id === 'number' && newSlide.id > 0) {
      try {
        await updateSlide(newSlide.id, newSlide);
      } catch (err) {
        console.error('Erreur mise à jour slide', err);
        setError('Impossible de mettre à jour le slide.');
      }
    }
  };

  // Supprimer un slide
  const removeSlide = async (index: number) => {
    const slide = slides[index];
    if (slide.id && slide.id > 0) {
      try {
        await deleteSlide(slide.id);
      } catch (err) {
        console.error('Erreur suppression slide', err);
        setError('Impossible de supprimer le slide.');
        return;
      }
    }
    const newSlides = slides.filter((_, i) => i !== index);
    setSlides(newSlides);
    // Réordonner les positions
    if (campaignId) {
      try {
        await reorderSlides(campaignId, newSlides.map(s => s.id || 0));
      } catch (err) {
        console.error('Erreur réordonnancement', err);
        setError('Impossible de réorganiser les slides.');
      }
    }
    setSelectedSlideIndex(null);
  };

  // Réordonner les slides
  const handleReorder = async (newSlides: Slide[]) => {
    setSlides(newSlides);
    if (campaignId) {
      try {
        await reorderSlides(campaignId, newSlides.map(s => s.id || 0));
      } catch (err) {
        console.error('Erreur réordonnancement', err);
        setError('Impossible de réorganiser les slides.');
      }
    }
  };

  // Sauvegarder la campagne
  const saveCampaign = async (publish: boolean = false) => {
    setSaving(true);
    setError(null);
    try {
      let id = campaignId;
      if (!id) {
        // Création
        const newId = await createCampaign(campaign);
        id = newId;
        setCampaign({ ...campaign, id: newId });
        // Mettre à jour campaignId pour la suite
        campaignId = newId;
      } else {
        // Mise à jour
        await updateCampaign(id, campaign);
      }

      // Sauvegarder les slides (ceux qui n'ont pas d'id)
      for (const slide of slides) {
        if (!slide.id || slide.id < 0) {
          const newSlideId = await createSlide({ ...slide, campaign_id: id });
          slide.id = newSlideId;
        } else {
          await updateSlide(slide.id, slide);
        }
      }

      if (publish) {
        // Changer le statut en 'active' ou 'scheduled' selon date
        await updateCampaign(id, { ...campaign, status: 'active' });
      }

      // Rafraîchir les données et rediriger vers la liste des campagnes
      router.refresh();
      router.push('/admin/campaigns');
    } catch (err) {
      console.error('Erreur sauvegarde', err);
      setError('Impossible de sauvegarder la campagne.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de la campagne...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-gray-50">
      {/* HEADER */}
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/campaigns')}
            className="p-2 hover:bg-gray-100 rounded-full transition"
            aria-label="Retour"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-semibold">
            {isNew ? 'Nouvelle campagne' : 'Modifier la campagne'}
          </h1>
          {campaign.name && <span className="text-gray-500 text-sm">— {campaign.name}</span>}
          {campaign.status && (
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              campaign.status === 'active' ? 'bg-green-100 text-green-700' :
              campaign.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
              campaign.status === 'ended' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {campaign.status === 'active' ? 'Active' :
               campaign.status === 'scheduled' ? 'Programmée' :
               campaign.status === 'ended' ? 'Terminée' : 'Brouillon'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <span className="text-red-600 text-sm">{error}</span>
          )}
          <button
            onClick={() => saveCampaign(false)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            <Save size={18} />
            Enregistrer
          </button>
          <button
            onClick={() => saveCampaign(true)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Send size={18} />
            Publier
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT PANEL: Configuration */}
        <div className="w-1/3 min-h-0 border-r bg-white overflow-y-auto p-4">
          <div className="space-y-4">
            {/* Nom et type */}
            <div>
              <label className="block text-sm font-medium mb-1">Nom de la campagne</label>
              <input
                type="text"
                value={campaign.name || ''}
                onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Promotion été"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type de campagne</label>
              <select
                value={campaign.type || 'carousel'}
                onChange={(e) => setCampaign({ ...campaign, type: e.target.value as any })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="image">Image</option>
                <option value="video">Vidéo</option>
                <option value="audio">Audio</option>
                <option value="carousel">Carousel</option>
                <option value="story">Story</option>
                <option value="collection">Collection</option>
                <option value="product">Produit</option>
                <option value="promotion">Promotion</option>
              </select>
            </div>

            {/* Slides (si carousel) */}
            {campaign.type === 'carousel' && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Slides</h3>
                  <button
                    onClick={addSlide}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Ajouter un slide
                  </button>
                </div>
                <SlideList
                  slides={slides}
                  selectedIndex={selectedSlideIndex}
                  onSelect={setSelectedSlideIndex}
                  onReorder={handleReorder}
                  onDelete={removeSlide}
                />
              </div>
            )}

            {/* Éditeur de slide sélectionné */}
            {selectedSlideIndex !== null && slides[selectedSlideIndex] && (
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">Modifier le slide {selectedSlideIndex + 1}</h4>
                  <button
                    onClick={() => setSelectedSlideIndex(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={18} />
                  </button>
                </div>
                <SlideEditor
                  key={slides[selectedSlideIndex].id || selectedSlideIndex}
                  slide={slides[selectedSlideIndex]}
                  onChange={(data) => updateSlideData(selectedSlideIndex, data)}
                />
                <div className="mt-4 space-y-4">
                  <AnimationPanel
                    slide={slides[selectedSlideIndex]}
                    onChange={(data) => updateSlideData(selectedSlideIndex, data)}
                  />
                  <SchedulePanel
                    slide={slides[selectedSlideIndex]}
                    onChange={(data) => updateSlideData(selectedSlideIndex, data)}
                  />
                </div>
              </div>
            )}

            {/* Panneau de ciblage (campagne) */}
            <div className="border-t pt-4">
              <TargetingPanel
                campaign={campaign}
                onChange={setCampaign}
              />
            </div>
          </div>
        </div>

        {/* CENTER PANEL: Aperçu */}
        <div className="flex-1 min-w-0 min-h-0 overflow-hidden p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Aperçu en temps réel</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setPreviewDevice('desktop')}
                className={`px-3 py-1 rounded-lg text-sm ${previewDevice === 'desktop' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                Desktop
              </button>
              <button
                onClick={() => setPreviewDevice('tablet')}
                className={`px-3 py-1 rounded-lg text-sm ${previewDevice === 'tablet' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                Tablet
              </button>
              <button
                onClick={() => setPreviewDevice('mobile')}
                className={`px-3 py-1 rounded-lg text-sm ${previewDevice === 'mobile' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                Mobile
              </button>
            </div>
          </div>
          <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
            <BannerPreview
              slides={slides}
              currentIndex={selectedSlideIndex !== null ? selectedSlideIndex : 0}
              device={previewDevice}
            />
          </div>
        </div>

        {/* RIGHT PANEL: Analytics (placeholder) */}
        <div className="w-1/4 min-h-0 border-l bg-white p-4 overflow-hidden">
          <h3 className="font-medium mb-4">Statistiques</h3>
          <p className="text-sm text-gray-500">Impressions, clics, conversions...</p>
          <div className="mt-4 space-y-3">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Impressions</div>
              <div className="text-xl font-semibold">0</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Clics</div>
              <div className="text-xl font-semibold">0</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">CTR</div>
              <div className="text-xl font-semibold">0%</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Conversions</div>
              <div className="text-xl font-semibold">0</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Revenu généré</div>
              <div className="text-xl font-semibold">0 FCFA</div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-white border-t px-6 py-3 text-center text-xs text-gray-500 flex-shrink-0">
        © {new Date().getFullYear()} TorrentTwist - Studio de campagnes v1.0
      </footer>
    </div>
  );
}