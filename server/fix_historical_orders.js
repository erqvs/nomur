import mysql from 'mysql2/promise'

// 数据库配置
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'nomur',
  charset: 'utf8mb4'
})

// 组合信息
const GROUP_ID = '5f3ef7b1-1d71-43a1-9f18-a8af5f3c02cf'
const GROUP_NAME = '茶类'
const GROUP_PRODUCT_IDS = [
  'b3984acf-377c-4446-b2f3-f2217e0dc758', // 有机茉莉茶Yesmangul
  '968d211c-d9b3-45fe-ba58-98925b269d36', // 有机龙井Longjing
  '96400767-06a8-462d-b11b-fe1d20382bf8'  // 金桂龙眼Darqin
]

// 检查订单项是否属于组合
function isGroupOrder(items) {
  if (!Array.isArray(items) || items.length === 0) return false
  
  // 检查是否包含组合中的所有商品
  const itemProductIds = items.map(item => item.productId).filter(Boolean)
  const hasAllGroupProducts = GROUP_PRODUCT_IDS.every(id => itemProductIds.includes(id))
  
  if (!hasAllGroupProducts) return false
  
  // 检查是否所有商品都属于这个组合（没有其他商品）
  const hasOtherProducts = itemProductIds.some(id => !GROUP_PRODUCT_IDS.includes(id))
  if (hasOtherProducts) return false
  
  // 检查是否所有商品都没有groupId（说明是历史数据）
  const hasGroupId = items.some(item => item.groupId)
  if (hasGroupId) return false
  
  return true
}

// 计算组合数量（取所有商品数量的总和，因为组合数量是组合内所有商品的总数）
function calculateGroupQuantity(items) {
  return items.reduce((sum, item) => {
    if (GROUP_PRODUCT_IDS.includes(item.productId)) {
      return sum + (item.quantity || 0)
    }
    return sum
  }, 0)
}

// 更新订单项，添加组合信息
function updateOrderItems(items) {
  const groupQuantity = calculateGroupQuantity(items)
  return items.map(item => {
    if (GROUP_PRODUCT_IDS.includes(item.productId)) {
      return {
        ...item,
        groupId: GROUP_ID,
        groupName: GROUP_NAME,
        groupQuantity: groupQuantity
      }
    }
    return item
  })
}

async function fixHistoricalOrders() {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    
    // 获取所有订单
    const [orders] = await conn.query('SELECT id, items FROM orders ORDER BY created_at DESC')
    
    let updatedCount = 0
    
    for (const order of orders) {
      let items
      try {
        items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
      } catch (e) {
        console.error(`订单 ${order.id} 解析items失败:`, e)
        continue
      }
      
      if (!Array.isArray(items)) continue
      
      // 检查是否是组合订单
      if (isGroupOrder(items)) {
        // 更新订单项
        const updatedItems = updateOrderItems(items)
        const updatedItemsJson = JSON.stringify(updatedItems)
        
        // 更新数据库
        await conn.query('UPDATE orders SET items = ? WHERE id = ?', [updatedItemsJson, order.id])
        
        console.log(`✓ 更新订单 ${order.id}: 添加组合信息 (${GROUP_NAME})`)
        updatedCount++
      }
    }
    
    await conn.commit()
    console.log(`\n完成！共更新 ${updatedCount} 个订单`)
  } catch (error) {
    await conn.rollback()
    console.error('更新失败:', error)
    throw error
  } finally {
    conn.release()
    await pool.end()
  }
}

// 运行脚本
fixHistoricalOrders().catch(console.error)
