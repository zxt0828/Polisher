// 从邮箱推导展示信息。后端没有单独的 username 字段，导航栏显示名和头像缩写
// 都从邮箱现算（以后要可编辑用户名再给 users 表加列）。

// 取 @ 前的本地部分作为显示用户名：janedoe0828@example.com → janedoe0828。
export function usernameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? ''
  return local || email
}

// 头像缩写（两个字母，大写）。规则要同时兼顾两种邮箱写法：
//   - 驼峰/带分隔符：按分隔符（. _ - +）和驼峰边界（小写→大写）切词，
//     取前两个词的首字母。JaneDoe → JD，jane.doe → JD。
//   - 没有任何边界：兜底取本地部分前两个字母。janedoe0828 → JA。
export function initialsFromEmail(email: string): string {
  const local = usernameFromEmail(email)
  // 先在驼峰边界处插空格，再统一按分隔符切，过滤掉空片段。
  const tokens = local
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[\s._+-]+/)
    .filter(Boolean)

  if (tokens.length >= 2) {
    return (tokens[0][0] + tokens[1][0]).toUpperCase()
  }

  // 单个词：取前两个字母；只有一个字符就返回那一个；实在没有就退回 '?'。
  const letters = local.replace(/[^A-Za-z]/g, '') || local
  return (letters.slice(0, 2) || '?').toUpperCase()
}
