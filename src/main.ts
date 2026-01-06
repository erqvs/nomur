import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

// 在应用启动前抑制 passive event listener 警告
if (typeof window !== 'undefined') {
  // 这些警告来自 Vue/uni-app 框架内部，不影响功能
  // 通过拦截 console 输出来隐藏这些性能建议警告
  const originalWarn = console.warn
  const originalError = console.error
  
  console.warn = function(...args: any[]) {
    const message = args[0]
    if (typeof message === 'string') {
      const lowerMessage = message.toLowerCase()
      if (lowerMessage.includes('non-passive event listener') ||
          lowerMessage.includes('passive event listener') ||
          lowerMessage.includes('scroll-blocking') ||
          lowerMessage.includes('[violation]')) {
        return // 忽略这些警告
      }
    }
    originalWarn.apply(console, args)
  }
  
  console.error = function(...args: any[]) {
    const message = args[0]
    if (typeof message === 'string') {
      const lowerMessage = message.toLowerCase()
      if (lowerMessage.includes('non-passive event listener') ||
          lowerMessage.includes('passive event listener') ||
          lowerMessage.includes('scroll-blocking') ||
          lowerMessage.includes('[violation]')) {
        return // 忽略这些警告
      }
    }
    originalError.apply(console, args)
  }
}

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  
  app.use(pinia)
  
  return {
    app
  }
}

