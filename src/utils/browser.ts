/**
 * 浏览器环境检测工具函数
 */

/**
 * 检测是否在微信浏览器中
 */
export function isWeChatBrowser(): boolean {
  // #ifdef H5
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent.toLowerCase()
  return /micromessenger/i.test(ua)
  // #endif
  
  // #ifdef MP-WEIXIN
  return true
  // #endif
  
  return false
}

/**
 * 检测是否在移动端
 */
export function isMobile(): boolean {
  // #ifdef H5
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    window.navigator.userAgent
  )
  // #endif
  
  // #ifdef MP-WEIXIN
  return true
  // #endif
  
  return false
}
