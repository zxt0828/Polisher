import { postForm, postJsonForFile } from './client'
import type { TailoredResume } from '../types/resume'

export async function tailorResume(
  resumeFile: File,
  keywords: string[],
): Promise<TailoredResume> {
  const formData = new FormData()
  formData.append('resume', resumeFile)
  // 后端只接收逗号分隔的字符串，不关心前端删过哪些词。
  formData.append('keywords', keywords.join(','))
  return postForm<TailoredResume>('/api/resume/tailor', formData)
}

// 只负责拿到 PDF 的二进制数据和后端建议的文件名；触发浏览器下载动作
// （createObjectURL、挂隐藏 <a> 标签、revokeObjectURL）属于 UI 行为，
// 留给调用它的组件处理。
export async function exportResume(
  resume: TailoredResume,
): Promise<{ blob: Blob; filename: string | null }> {
  return postJsonForFile('/api/resume/export', resume)
}
