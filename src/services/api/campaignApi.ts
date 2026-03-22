import { apiGet, apiPost, apiDelete } from './apiClient'
import type { CampaignState, CampaignSummary } from '@/models/Campaign'

interface ApiCampaign {
  id: string
  name: string
  created_at: string
  last_played_at: string
  data: string
  updated_at: string | null
}

interface ApiCampaignSummary {
  id: string
  name: string
  created_at: string
  last_played_at: string
  updated_at: string | null
}

export async function listCampaigns() {
  const result = await apiGet<ApiCampaignSummary[]>('/campaigns/')
  if (result.error || !result.data) return { data: null, error: result.error }
  const summaries: CampaignSummary[] = result.data.map((c) => ({
    id: c.id,
    name: c.name,
    createdAt: c.created_at,
    lastPlayedAt: c.last_played_at,
  }))
  return { data: summaries, error: null }
}

export async function getCampaign(id: string) {
  const result = await apiGet<ApiCampaign>(`/campaigns/${id}`)
  if (result.error || !result.data) return { data: null, error: result.error }
  const { id: cId, name, created_at, last_played_at, data: dataStr } = result.data
  const rest = JSON.parse(dataStr)
  const campaign: CampaignState = {
    id: cId,
    name,
    createdAt: created_at,
    lastPlayedAt: last_played_at,
    ...rest,
  }
  return { data: campaign, error: null }
}

export function upsertCampaign(campaign: CampaignState) {
  const { id, name, createdAt, lastPlayedAt, ...rest } = campaign
  return apiPost<CampaignState>('/campaigns/', {
    id,
    name,
    created_at: createdAt,
    last_played_at: lastPlayedAt,
    data: JSON.stringify(rest),
  })
}

export function deleteCampaign(id: string) {
  return apiDelete(`/campaigns/${id}`)
}
