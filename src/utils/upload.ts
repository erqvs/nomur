// 图片上传工具函数
import { uploadApi } from '@/api'

/**
 * 上传单张图片
 * @param filePath 临时文件路径（来自 uni.chooseImage）
 * @returns 服务器图片URL
 */
export async function uploadImage(filePath: string): Promise<string> {
  try {
    uni.showLoading({ title: '上传中...' })
    const result = await uploadApi.uploadSingle(filePath)
    uni.hideLoading()
    return result.url
  } catch (error) {
    uni.hideLoading()
    throw error
  }
}

/**
 * 上传多张图片
 * @param filePaths 临时文件路径数组
 * @returns 服务器图片URL数组
 */
export async function uploadImages(filePaths: string[]): Promise<string[]> {
  try {
    uni.showLoading({ title: `上传中 0/${filePaths.length}` })
    const results: string[] = []
    
    for (let i = 0; i < filePaths.length; i++) {
      uni.showLoading({ title: `上传中 ${i + 1}/${filePaths.length}` })
      const result = await uploadApi.uploadSingle(filePaths[i])
      results.push(result.url)
    }
    
    uni.hideLoading()
    return results
  } catch (error) {
    uni.hideLoading()
    throw error
  }
}

