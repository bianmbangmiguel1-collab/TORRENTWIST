// lib/campaign-service.ts
'use server';

import { getDB } from './db';

export interface CampaignSlide {
  id: number;
  campaign_id: number;
  position: number;
  type: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  cta_text: string | null;
  cta_action: string | null;
  cta_value: string | null;
  media_type: string;
  media_url: string | null;
  media_desktop: string | null;
  media_tablet: string | null;
  media_mobile: string | null;
  content_position: string;
  content_alignment: string;
  overlay_opacity: number;
  text_color: string;
  button_color: string;
  animation_entrance: string;
  animation_text: string;
  animation_transition: string;
  autoplay_interval: number;
  autoplay_pause_on_hover: number;
  promotion_id: number | null;
  product_ids: string | null;
  collection_id: number | null;
  category_id: number | null;
}

export interface Campaign {
  id: number;
  name: string;
  status: string;
  type: string;
  start_date: string | null;
  end_date: string | null;
  target_audience: string;
  devices: string; // JSON array
  slides: CampaignSlide[];
}

export async function getActiveCampaigns(device?: 'desktop' | 'tablet' | 'mobile'): Promise<Campaign[]> {
  const db = await getDB();
  const now = new Date().toISOString();

  const campaigns = await db.all(
    `SELECT * FROM campaigns 
     WHERE status = 'active' 
       AND (start_date IS NULL OR start_date <= ?)
       AND (end_date IS NULL OR end_date >= ?)
     ORDER BY created_at DESC`,
    [now, now]
  );

  if (campaigns.length === 0) return [];

  const result: Campaign[] = [];
  for (const campaign of campaigns) {
    let devices = [];
    try {
      devices = JSON.parse(campaign.devices || '["desktop","tablet","mobile"]');
    } catch {
      devices = ['desktop', 'tablet', 'mobile'];
    }
    if (device && !devices.includes(device)) continue;

    const slides = await db.all(
      `SELECT * FROM slides WHERE campaign_id = ? ORDER BY position ASC`,
      [campaign.id]
    );

    result.push({
      ...campaign,
      slides: slides || [],
    });
  }

  return result;
}