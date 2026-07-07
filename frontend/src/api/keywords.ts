import { postJson } from './client'
import type { Keywords } from '../types/keywords'

export async function extractKeywords(jdText: string): Promise<Keywords> {
  return postJson<Keywords>('/api/keywords/extract', { jd_text: jdText })
}
