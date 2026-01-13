import express from 'express'
import cors from 'cors'
import mysql from 'mysql2/promise'
import { v4 as uuidv4 } from 'uuid'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

// 中间件
app.use(cors())
app.use(express.json())

// 创建上传目录
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// 提供上传文件的静态访问（需要在路由之前配置）
app.use('/api/uploads', express.static(uploadsDir))

// 配置 multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名：时间戳-UUID-原文件名
    const ext = path.extname(file.originalname)
    const filename = `${Date.now()}-${uuidv4()}${ext}`
    cb(null, filename)
  }
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // 只允许图片格式
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    
    if (extname && mimetype) {
      cb(null, true)
    } else {
      cb(new Error('只允许上传图片文件（jpeg, jpg, png, gif, webp）'))
    }
  }
})

// 数据库连接池
const pool = mysql.createPool({
  host: 'localhost',  // 使用本机 MySQL
  port: 3306,
  user: 'root',
  password: '',  // 本机 MySQL root 密码为空或需要设置
  database: 'nomur',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

// 测试数据库连接
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 as status')
    res.json({ code: 0, message: 'OK', data: { database: 'connected' } })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 权限检查中间件（检查是否为管理员或超级管理员）
const requireSuperAdmin = async (req, res, next) => {
  try {
    const adminId = req.headers['admin-id'] || req.query.adminId
    const adminRole = req.headers['admin-role'] || req.query.adminRole
    
    if (!adminId || !adminRole) {
      return res.json({ code: 403, message: '缺少管理员信息' })
    }
    
    // 验证管理员信息
    const [admins] = await pool.query('SELECT * FROM admins WHERE id = ? AND is_active = 1', [adminId])
    if (admins.length === 0) {
      return res.json({ code: 403, message: '管理员不存在' })
    }
    
    const admin = admins[0]
    // 允许 admin 和 super_admin 都有权限
    if (admin.role !== 'super_admin' && admin.role !== 'admin') {
      return res.json({ code: 403, message: '权限不足，需要管理员权限' })
    }
    
    // 验证角色是否匹配
    if (admin.role !== adminRole) {
      return res.json({ code: 403, message: '角色信息不匹配' })
    }
    
    req.admin = admin
    next()
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
}

// ==================== 认证 API ====================
// 验证手机号权限
app.post('/api/auth/verify', async (req, res) => {
  try {
    const { phone, role } = req.body
    
    if (!phone) {
      return res.json({ code: 400, message: '手机号不能为空' })
    }
    
    if (role === 'admin') {
      // 验证管理员
      const [admins] = await pool.query(
        'SELECT * FROM admins WHERE phone = ? AND is_active = 1',
        [phone]
      )
      
      if (admins.length > 0) {
        const admin = admins[0]
        return res.json({
          code: 0,
          message: 'OK',
          data: {
            authorized: true,
            userType: 'admin',
            userId: admin.id,
            userName: admin.name,
            role: admin.role
          }
        })
      }
    } else if (role === 'agent') {
      // 验证代理商
      const [agents] = await pool.query(
        'SELECT * FROM agents WHERE phone1 = ? OR phone2 = ?',
        [phone, phone]
      )
      
      if (agents.length > 0) {
        const agent = agents[0]
        return res.json({
          code: 0,
          message: 'OK',
          data: {
            authorized: true,
            userType: 'agent',
            userId: agent.id,
            userName: agent.name,
            balance: Number(agent.balance)
          }
        })
      }
    }
    
    // 未找到匹配的用户
    res.json({
      code: 0,
      message: 'OK',
      data: {
        authorized: false,
        message: '权限不足，您的手机号未在系统中注册'
      }
    })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 获取管理员列表
app.get('/api/admins', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, phone, role, is_active, created_at FROM admins')
    res.json({ code: 0, message: 'OK', data: rows })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 添加管理员
app.post('/api/admins', async (req, res) => {
  try {
    const { name, phone, role = 'admin' } = req.body
    const id = uuidv4()
    await pool.query(
      'INSERT INTO admins (id, name, phone, role) VALUES (?, ?, ?, ?)',
      [id, name, phone, role]
    )
    res.json({ code: 0, message: '添加成功', data: { id } })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.json({ code: 409, message: '该手机号已存在' })
    } else {
      res.status(500).json({ code: 500, message: error.message })
    }
  }
})

// 删除管理员
app.delete('/api/admins/:id', async (req, res) => {
  try {
    const { id } = req.params
    await pool.query('DELETE FROM admins WHERE id = ?', [id])
    res.json({ code: 0, message: '删除成功' })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 微信小程序手机号授权
// 注意：需要配置小程序的 AppID 和 AppSecret
const WX_APPID = process.env.WX_APPID || 'YOUR_APPID'
const WX_SECRET = process.env.WX_SECRET || 'YOUR_SECRET'

app.post('/api/auth/wechat-phone', async (req, res) => {
  try {
    const { code, role } = req.body
    
    if (!code) {
      return res.json({ code: 400, message: '缺少授权码' })
    }
    
    // 1. 使用 code 获取 access_token
    const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WX_APPID}&secret=${WX_SECRET}`
    const tokenRes = await fetch(tokenUrl)
    const tokenData = await tokenRes.json()
    
    if (tokenData.errcode) {
      console.error('获取 access_token 失败:', tokenData)
      return res.json({ code: 500, message: '获取 access_token 失败: ' + tokenData.errmsg })
    }
    
    const accessToken = tokenData.access_token
    
    // 2. 使用 access_token 和 code 获取手机号
    const phoneUrl = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`
    const phoneRes = await fetch(phoneUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    })
    const phoneData = await phoneRes.json()
    
    if (phoneData.errcode !== 0) {
      console.error('获取手机号失败:', phoneData)
      return res.json({ code: 500, message: '获取手机号失败: ' + phoneData.errmsg })
    }
    
    const phone = phoneData.phone_info.purePhoneNumber
    console.log('微信授权手机号:', phone)
    
    // 3. 验证手机号权限
    if (role === 'admin') {
      const [admins] = await pool.query(
        'SELECT * FROM admins WHERE phone = ? AND is_active = 1',
        [phone]
      )
      
      if (admins.length > 0) {
        const admin = admins[0]
        return res.json({
          code: 0,
          message: 'OK',
          data: {
            authorized: true,
            userType: 'admin',
            userId: admin.id,
            userName: admin.name,
            phone: phone,
            role: admin.role
          }
        })
      }
    } else if (role === 'agent') {
      const [agents] = await pool.query(
        'SELECT * FROM agents WHERE phone1 = ? OR phone2 = ?',
        [phone, phone]
      )
      
      if (agents.length > 0) {
        const agent = agents[0]
        return res.json({
          code: 0,
          message: 'OK',
          data: {
            authorized: true,
            userType: 'agent',
            userId: agent.id,
            userName: agent.name,
            phone: phone,
            balance: Number(agent.balance)
          }
        })
      }
    }
    
    // 未找到匹配的用户
    res.json({
      code: 0,
      message: 'OK',
      data: {
        authorized: false,
        phone: phone,
        message: '权限不足，您的手机号未在系统中注册'
      }
    })
  } catch (error) {
    console.error('微信手机号授权错误:', error)
    res.status(500).json({ code: 500, message: error.message })
  }
})

// ==================== 商品 API ====================
// 获取所有商品
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY created_at DESC')
    const products = rows.map(row => ({
      id: row.id,
      name: row.name,
      image: row.image,
      price: Number(row.price),
      weight: Number(row.weight),
      materials: row.materials || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
    res.json({ code: 0, message: 'OK', data: products })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 创建商品
app.post('/api/products', async (req, res) => {
  try {
    const { name, image, price, weight, materials = [] } = req.body
    const id = uuidv4()
    await pool.query(
      'INSERT INTO products (id, name, image, price, weight, materials) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, image, price, weight, JSON.stringify(materials)]
    )
    res.json({ code: 0, message: '创建成功', data: { id } })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 更新商品
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, image, price, weight, materials } = req.body
    await pool.query(
      'UPDATE products SET name=?, image=?, price=?, weight=?, materials=? WHERE id=?',
      [name, image, price, weight, JSON.stringify(materials || []), id]
    )
    res.json({ code: 0, message: '更新成功' })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 删除商品
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params
    await pool.query('DELETE FROM products WHERE id=?', [id])
    res.json({ code: 0, message: '删除成功' })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// ==================== 代理商 API ====================
// 获取所有代理商
app.get('/api/agents', async (req, res) => {
  try {
    // 按 sort_order 排序，如果 sort_order 相同或为 NULL，则按 created_at 倒序
    const [rows] = await pool.query('SELECT * FROM agents ORDER BY sort_order ASC, created_at DESC')
    const agents = rows.map(row => {
      // 兼容旧数据：如果 yearly_targets 为空，从旧字段迁移
      let yearlyTargets = {}
      if (row.yearly_targets) {
        try {
          yearlyTargets = typeof row.yearly_targets === 'string' ? JSON.parse(row.yearly_targets) : row.yearly_targets
        } catch {
          yearlyTargets = {}
        }
      }
      // 如果没有 yearly_targets 但有旧字段，迁移数据
      if (Object.keys(yearlyTargets).length === 0 && row.target_product_a) {
        yearlyTargets = { p1: row.target_product_a }
      }
      
      return {
        id: row.id,
        avatar: row.avatar,
        name: row.name,
        phone1: row.phone1,
        phone2: row.phone2,
        address: row.address,
        yearlyTargets: yearlyTargets,
        balance: Number(row.balance),
        sortOrder: row.sort_order || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    })
    res.json({ code: 0, message: 'OK', data: agents })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 获取代理商促销活动进度
app.get('/api/agents/:id/promotions/progress', async (req, res) => {
  try {
    const { id } = req.params
    
    // 验证代理商存在
    const [[agent]] = await pool.query('SELECT id FROM agents WHERE id = ?', [id])
    if (!agent) {
      return res.status(404).json({ code: 404, message: '代理商不存在' })
    }
    
    // 获取该代理商的所有订单（不限制promotion_id，因为可能订单创建时没有设置）
    const ordersResult = await pool.query(`
      SELECT promotion_id, items FROM orders 
      WHERE agent_id = ?
    `, [id])
    const orders = ordersResult[0]
    
    // 获取所有促销活动信息
    const [promotionsRows] = await pool.query('SELECT id, condition_details, threshold, gifts FROM promotions WHERE is_active = 1')
    const promotionsMap = new Map()
    promotionsRows.forEach(row => {
      promotionsMap.set(row.id, {
        conditionDetails: parseJsonField(row.condition_details),
        threshold: row.threshold,
        gifts: parseJsonField(row.gifts) || []
      })
    })
    
    // 获取所有产品组合信息（用于组合条件检查）
    const [groupsRows] = await pool.query('SELECT id, name, product_ids FROM product_groups')
    const groupsMap = new Map(groupsRows.map(g => [g.id, { name: g.name, productIds: parseJsonField(g.product_ids) || [] }]))
    
    // 计算每个促销活动的进度
    const progressMap = new Map() // promotionId -> { purchased, giftsReceived }
    
    orders.forEach(order => {
      let promotionIds = parseJsonField(order.promotion_id)
      // 如果 promotion_id 是单个字符串（UUID），转换为数组
      if (typeof promotionIds === 'string') {
        promotionIds = [promotionIds]
      }
      const orderItems = parseJsonField(order.items)
      
      // 如果 promotion_id 为空，设置为空数组（后续会检查所有促销活动）
      if (!Array.isArray(promotionIds)) {
        promotionIds = []
      }
      
      if (!Array.isArray(orderItems)) {
        return
      }
      
      // 计算订单中每个产品的数量
      const orderProductQuantities = new Map()
      orderItems.forEach(item => {
        const productId = item.productId
        const quantity = Number(item.quantity) || 0
        if (productId) {
          orderProductQuantities.set(productId, (orderProductQuantities.get(productId) || 0) + quantity)
        }
      })
      
      // 处理每个促销活动（如果订单有promotion_id，只处理匹配的；否则检查所有促销活动）
      const promotionsToCheck = promotionIds.length > 0 
        ? promotionIds.map(id => ({ id, promotion: promotionsMap.get(id) })).filter(item => item.promotion)
        : Array.from(promotionsMap.entries()).map(([id, promotion]) => ({ id, promotion }))
      
      promotionsToCheck.forEach(({ id: promotionId, promotion }) => {
        if (!promotion || !promotionId) {
          return
        }
        
        // 计算满足条件的数量（购买数量）
        // 注意：这里需要累加所有满足条件的数量，而不是只计算满足次数的数量
        if (promotion.conditionDetails && Array.isArray(promotion.conditionDetails) && promotion.conditionDetails.length > 0) {
          // 新格式：使用 conditionDetails
          // 对于每个条件，计算订单中满足该条件的数量
          const conditionQuantities = promotion.conditionDetails.map(condition => {
            if (condition.type === 'product' && condition.productId) {
              return orderProductQuantities.get(condition.productId) || 0
            } else if (condition.type === 'group' && condition.groupId) {
              // 组合模式：计算订单中属于该组合的产品数量
              const group = groupsMap.get(condition.groupId)
              if (!group || !Array.isArray(group.productIds) || group.productIds.length === 0) {
                return 0
              }
              const groupQty = group.productIds.reduce((sum, productId) => {
                return sum + (orderProductQuantities.get(productId) || 0)
              }, 0)
              return groupQty
            }
            return 0
          })
          
          // 如果所有条件数量都是0，跳过这个促销活动
          if (conditionQuantities.every(qty => qty === 0)) {
            return
          }
          
          // 取最小值（满足所有条件的最小值）
          const purchased = Math.min(...conditionQuantities.filter(qty => qty > 0))
          
          // 累加购买数量
          const existing = progressMap.get(promotionId) || { purchased: 0, giftsReceived: 0 }
          existing.purchased += purchased
          progressMap.set(promotionId, existing)
        } else {
          // 旧格式：使用threshold，使用订单总数量
          const totalQty = Array.from(orderProductQuantities.values()).reduce((sum, qty) => sum + qty, 0)
          if (totalQty > 0) {
            const existing = progressMap.get(promotionId) || { purchased: 0, giftsReceived: 0 }
            existing.purchased += totalQty
            progressMap.set(promotionId, existing)
          }
        }
      })
    })
    
    // 计算已获得赠品数量
    progressMap.forEach((progress, promotionId) => {
      const promotion = promotionsMap.get(promotionId)
      if (!promotion) return
      
      // 根据购买数量和阈值计算满足条件的次数
      let times = 0
      if (promotion.conditionDetails && Array.isArray(promotion.conditionDetails) && promotion.conditionDetails.length > 0) {
        // 新格式：使用 conditionDetails 中的 quantity
        const conditionQuantities = promotion.conditionDetails.map(condition => {
          return Math.floor(progress.purchased / condition.quantity)
        })
        times = Math.min(...conditionQuantities)
      } else {
        // 旧格式：使用threshold
        times = Math.floor(progress.purchased / promotion.threshold)
      }
      
      // 计算已获得赠品数量
      const giftsReceived = promotion.gifts.reduce((sum, gift) => {
        return sum + (Number(gift.quantity) || 0) * times
      }, 0)
      
      progress.giftsReceived = giftsReceived
    })
    
    // 转换为数组格式
    const progressList = Array.from(progressMap.entries()).map(([promotionId, progress]) => ({
      promotionId,
      purchased: progress.purchased,
      giftsReceived: progress.giftsReceived
    }))
    
    res.json({ code: 0, message: 'OK', data: progressList })
  } catch (error) {
    console.error('[DEBUG PROMOTIONS] 获取代理商促销活动进度失败:', error)
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 获取单个代理商
app.get('/api/agents/:id', async (req, res) => {
  try {
    const { id } = req.params
    const [rows] = await pool.query('SELECT * FROM agents WHERE id=?', [id])
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '代理商不存在' })
    }
    const row = rows[0]
    // 兼容旧数据：如果 yearly_targets 为空，从旧字段迁移
    let yearlyTargets = {}
    if (row.yearly_targets) {
      try {
        yearlyTargets = typeof row.yearly_targets === 'string' ? JSON.parse(row.yearly_targets) : row.yearly_targets
      } catch {
        yearlyTargets = {}
      }
    }
    // 如果没有 yearly_targets 但有旧字段，迁移数据
    if (Object.keys(yearlyTargets).length === 0 && row.target_product_a) {
      yearlyTargets = { p1: row.target_product_a }
    }
    
    res.json({
      code: 0,
      message: 'OK',
      data: {
        id: row.id,
        avatar: row.avatar,
        name: row.name,
        phone1: row.phone1,
        phone2: row.phone2,
        address: row.address,
        yearlyTargets: yearlyTargets,
        balance: Number(row.balance),
        sortOrder: row.sort_order || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 创建代理商
app.post('/api/agents', async (req, res) => {
  try {
    const { avatar, name, phone1, phone2, address, yearlyTargets } = req.body
    const id = uuidv4()
    const targetsJson = JSON.stringify(yearlyTargets || {})
    
    // 获取当前最大的 sort_order，新代理商的 sort_order = 最大值 + 1
    const [maxSort] = await pool.query('SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM agents')
    const newSortOrder = (maxSort[0]?.max_sort || 0) + 1
    
    await pool.query(
      'INSERT INTO agents (id, avatar, name, phone1, phone2, address, yearly_targets, balance, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)',
      [id, avatar, name, phone1, phone2, address, targetsJson, newSortOrder]
    )
    res.json({ code: 0, message: '创建成功', data: { id } })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 更新代理商
app.put('/api/agents/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { avatar, name, phone1, phone2, address, yearlyTargets, sortOrder } = req.body
    const targetsJson = JSON.stringify(yearlyTargets || {})
    
    // 如果提供了 sortOrder，则更新排序
    if (sortOrder !== undefined) {
      await pool.query(
        'UPDATE agents SET avatar=?, name=?, phone1=?, phone2=?, address=?, yearly_targets=?, sort_order=? WHERE id=?',
        [avatar, name, phone1, phone2, address, targetsJson, sortOrder, id]
      )
    } else {
      await pool.query(
        'UPDATE agents SET avatar=?, name=?, phone1=?, phone2=?, address=?, yearly_targets=? WHERE id=?',
        [avatar, name, phone1, phone2, address, targetsJson, id]
      )
    }
    res.json({ code: 0, message: '更新成功' })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 批量更新代理商排序
app.put('/api/agents/sort', async (req, res) => {
  try {
    const { sortList } = req.body // sortList: [{ id: 'xxx', sortOrder: 1 }, ...]
    
    if (!Array.isArray(sortList) || sortList.length === 0) {
      return res.status(400).json({ code: 400, message: '排序列表不能为空' })
    }
    
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      
      // 批量更新排序
      for (const item of sortList) {
        await conn.query(
          'UPDATE agents SET sort_order = ? WHERE id = ?',
          [item.sortOrder, item.id]
        )
      }
      
      await conn.commit()
      res.json({ code: 0, message: '排序更新成功' })
    } catch (error) {
      await conn.rollback()
      throw error
    } finally {
      conn.release()
    }
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 获取代理商搭赠情况
app.get('/api/agents/:id/gifts', async (req, res) => {
  try {
    const { id } = req.params
    
    // 验证代理商存在
    const [[agent]] = await pool.query('SELECT id FROM agents WHERE id = ?', [id])
    if (!agent) {
      return res.status(404).json({ code: 404, message: '代理商不存在' })
    }
    
    // 获取该代理商的所有订单（包含赠品）
    const [orders] = await pool.query(
      'SELECT gift_items FROM orders WHERE agent_id = ? AND gift_items IS NOT NULL',
      [id]
    )
    
    // 获取所有商品信息（用于获取商品名称）
    const [productsRows] = await pool.query('SELECT id, name FROM products')
    const productsMap = new Map(productsRows.map(p => [p.id, p.name]))
    
    // 获取所有产品组合信息
    const [groupsRows] = await pool.query('SELECT id, name, product_ids FROM product_groups')
    const groupsMap = new Map()
    groupsRows.forEach(g => {
      const productIds = parseJsonField(g.product_ids) || []
      groupsMap.set(g.id, { name: g.name, productIds })
    })
    
    // 统计搭赠情况：按productId分组统计
    const giftStats = new Map() // productId -> {totalQuantity, deliveredQuantity}
    const groupGiftStats = new Map() // groupId -> {totalQuantity, deliveredQuantity}
    
    orders.forEach(order => {
      const giftItems = parseJsonField(order.gift_items) || []
      
      giftItems.forEach(gift => {
        // 处理组合赠品
        if (gift.isGroup && gift.groupId) {
          const groupId = gift.groupId
          const quantity = Number(gift.quantity) || 0
          const deliveredQuantity = Number(gift.deliveredQuantity) || 0
          
          if (!groupGiftStats.has(groupId)) {
            const group = groupsMap.get(groupId)
            groupGiftStats.set(groupId, {
              groupId,
              groupName: group?.name || '组合赠品',
              productIds: group?.productIds || [],
              totalQuantity: 0,
              deliveredQuantity: 0
            })
          }
          
          const stat = groupGiftStats.get(groupId)
          stat.totalQuantity += quantity
          stat.deliveredQuantity += deliveredQuantity
        } else if (gift.productId) {
          // 处理单个产品赠品
          const productId = gift.productId
          const quantity = Number(gift.quantity) || 0
          const deliveredQuantity = Number(gift.deliveredQuantity) || 0
          
          if (!giftStats.has(productId)) {
            giftStats.set(productId, {
              productId,
              productName: productsMap.get(productId) || productId,
              totalQuantity: 0,
              deliveredQuantity: 0
            })
          }
          
          const stat = giftStats.get(productId)
          stat.totalQuantity += quantity
          stat.deliveredQuantity += deliveredQuantity
        }
      })
    })
    
    // 构建返回数据
    const result = []
    
    // 添加组合赠品
    groupGiftStats.forEach((stat, groupId) => {
      result.push({
        groupId,
        groupName: stat.groupName,
        productIds: stat.productIds,
        totalQuantity: stat.totalQuantity,
        deliveredQuantity: stat.deliveredQuantity,
        undeliveredQuantity: stat.totalQuantity - stat.deliveredQuantity,
        isGroup: true
      })
    })
    
    // 添加单个产品赠品
    giftStats.forEach((stat, productId) => {
      result.push({
        productId,
        productName: stat.productName,
        totalQuantity: stat.totalQuantity,
        deliveredQuantity: stat.deliveredQuantity,
        undeliveredQuantity: stat.totalQuantity - stat.deliveredQuantity,
        isGroup: false
      })
    })
    
    res.json({ code: 0, message: 'OK', data: result })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 更新代理商搭赠数量
app.put('/api/agents/:id/gifts', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    
    const { id } = req.params
    const { gifts } = req.body
    
    if (!Array.isArray(gifts)) {
      await conn.rollback()
      return res.json({ code: 400, message: '搭赠信息格式错误' })
    }
    
    // 验证代理商存在
    const [[agent]] = await conn.query('SELECT id FROM agents WHERE id = ?', [id])
    if (!agent) {
      await conn.rollback()
      return res.status(404).json({ code: 404, message: '代理商不存在' })
    }
    
    // 获取该代理商的所有订单（包含赠品）
    const [orders] = await conn.query(
      'SELECT id, gift_items FROM orders WHERE agent_id = ? AND gift_items IS NOT NULL ORDER BY created_at ASC',
      [id]
    )
    
    // 构建更新映射：productId/groupId -> { targetDelivered, totalQuantity }
    const updateMap = new Map()
    gifts.forEach(gift => {
      if (gift.isGroup && gift.groupId) {
        updateMap.set(`group:${gift.groupId}`, { 
          targetDelivered: gift.deliveredQuantity || 0,
          totalQuantity: 0,
          allocatedDelivered: 0
        })
      } else if (gift.productId) {
        updateMap.set(`product:${gift.productId}`, { 
          targetDelivered: gift.deliveredQuantity || 0,
          totalQuantity: 0,
          allocatedDelivered: 0
        })
      }
    })
    
    // 第一遍：统计每个赠品类型的总数量
    orders.forEach(order => {
      const giftItems = parseJsonField(order.gift_items) || []
      giftItems.forEach(gift => {
        let key = null
        if (gift.isGroup && gift.groupId) {
          key = `group:${gift.groupId}`
        } else if (gift.productId) {
          key = `product:${gift.productId}`
        }
        
        if (key && updateMap.has(key)) {
          const stats = updateMap.get(key)
          stats.totalQuantity += Number(gift.quantity) || 0
        }
      })
    })
    
    // 第二遍：按顺序分配送达数量到各订单
    for (const order of orders) {
      const giftItems = parseJsonField(order.gift_items) || []
      let updated = false
      
      giftItems.forEach(gift => {
        let key = null
        if (gift.isGroup && gift.groupId) {
          key = `group:${gift.groupId}`
        } else if (gift.productId) {
          key = `product:${gift.productId}`
        }
        
        if (key && updateMap.has(key)) {
          const stats = updateMap.get(key)
          const giftQuantity = Number(gift.quantity) || 0
          const remainingToAllocate = stats.targetDelivered - stats.allocatedDelivered
          
          // 分配给这个订单的送达数量：最多是这个订单的赠品数量，不超过剩余需分配数量
          const allocateToThis = Math.min(giftQuantity, Math.max(0, remainingToAllocate))
          
          gift.deliveredQuantity = allocateToThis
          stats.allocatedDelivered += allocateToThis
          updated = true
        }
      })
      
      if (updated) {
        await conn.query(
          'UPDATE orders SET gift_items = ? WHERE id = ?',
          [JSON.stringify(giftItems), order.id]
        )
      }
    }
    
    await conn.commit()
    res.json({ code: 0, message: '搭赠数量更新成功' })
  } catch (error) {
    await conn.rollback()
    res.status(500).json({ code: 500, message: error.message })
  } finally {
    conn.release()
  }
})

// 删除代理商
app.delete('/api/agents/:id', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const { id } = req.params

    // 检查是否有订单记录
    const [orders] = await conn.query(
      'SELECT COUNT(*) as count FROM orders WHERE agent_id = ?',
      [id]
    )

    if (orders[0].count > 0) {
      await conn.rollback()
      return res.status(400).json({ code: 400, message: '该代理存在订单记录，无法删除。' })
    }

    // 检查是否有交易记录
    const [transactions] = await conn.query(
      'SELECT COUNT(*) as count FROM transactions WHERE agent_id = ?',
      [id]
    )

    if (transactions[0].count > 0) {
      await conn.rollback()
      return res.status(400).json({ code: 400, message: '该代理存在交易记录，无法删除。' })
    }

    // 删除代理
    await conn.query('DELETE FROM agents WHERE id = ?', [id])
    await conn.commit()
    res.json({ code: 0, message: '删除成功' })
  } catch (error) {
    await conn.rollback()
    res.status(500).json({ code: 500, message: error.message })
  } finally {
    conn.release()
  }
})

// ==================== 司机 API ====================
app.get('/api/drivers', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM drivers')
    res.json({ code: 0, message: 'OK', data: rows })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

app.post('/api/drivers', async (req, res) => {
  try {
    const { name, phone } = req.body
    const id = uuidv4()
    await pool.query('INSERT INTO drivers (id, name, phone) VALUES (?, ?, ?)', [id, name, phone])
    res.json({ code: 0, message: '创建成功', data: { id } })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// ==================== 促销活动 API ====================
app.get('/api/promotions', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM promotions ORDER BY created_at DESC')
    const promotions = rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      threshold: row.threshold,
      conditionProducts: parseJsonField(row.condition_products),
      conditionGroupId: row.condition_group_id || undefined,
      gifts: parseJsonField(row.gifts) || [],
      isActive: Boolean(row.is_active),
      startDate: row.start_date,
      endDate: row.end_date
    }))
    res.json({ code: 0, message: 'OK', data: promotions })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

app.post('/api/promotions', async (req, res) => {
  try {
    const { name, description, threshold, conditionProducts, conditionGroupId, gifts, isActive, startDate, endDate } = req.body
    const id = uuidv4()
    await pool.query(
      'INSERT INTO promotions (id, name, description, threshold, condition_products, condition_group_id, gifts, is_active, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, description, threshold, JSON.stringify(conditionProducts || []), conditionGroupId || null, JSON.stringify(gifts || []), isActive ? 1 : 0, startDate, endDate]
    )
    res.json({ code: 0, message: '创建成功', data: { id } })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 更新促销活动
app.put('/api/promotions/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, threshold, conditionProducts, conditionGroupId, gifts, isActive, startDate, endDate } = req.body
    
    // 如果只更新状态（兼容旧代码）
    if (isActive !== undefined && Object.keys(req.body).length === 1) {
      await pool.query(
        'UPDATE promotions SET is_active = ? WHERE id = ?',
        [isActive ? 1 : 0, id]
      )
    } else {
      // 更新所有字段
      // 如果 isActive 未提供，保持原有值
      const [currentRows] = await pool.query('SELECT is_active FROM promotions WHERE id = ?', [id])
      const current = currentRows[0]
      const finalIsActive = isActive !== undefined ? (isActive ? 1 : 0) : (current?.is_active || 0)
      
      await pool.query(
        'UPDATE promotions SET name=?, description=?, threshold=?, condition_products=?, condition_group_id=?, gifts=?, is_active=?, start_date=?, end_date=? WHERE id=?',
        [name, description, threshold, JSON.stringify(conditionProducts || []), conditionGroupId || null, JSON.stringify(gifts || []), finalIsActive, startDate, endDate, id]
      )
    }
    res.json({ code: 0, message: '更新成功' })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 删除促销活动
app.delete('/api/promotions/:id', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    
    const { id } = req.params
    
    // 获取所有可能引用该促销活动的订单
    // 包括：1. promotion_id 直接等于该ID的订单
    //      2. promotion_id 是JSON数组且包含该ID的订单
    const [allOrders] = await conn.query(
      'SELECT id, promotion_id FROM orders WHERE promotion_id IS NOT NULL'
    )
    
    // 处理每个订单中的促销ID引用
    for (const order of allOrders) {
      try {
        const promotionId = order.promotion_id
        
        // 处理单个ID的情况
        if (promotionId === id) {
          await conn.query('UPDATE orders SET promotion_id = NULL WHERE id = ?', [order.id])
          continue
        }
        
        // 处理JSON数组的情况
        const promotionIds = parseJsonField(promotionId)
        if (Array.isArray(promotionIds) && promotionIds.includes(id)) {
          const newPromotionIds = promotionIds.filter(pid => pid !== id)
          if (newPromotionIds.length === 0) {
            await conn.query('UPDATE orders SET promotion_id = NULL WHERE id = ?', [order.id])
          } else {
            await conn.query('UPDATE orders SET promotion_id = ? WHERE id = ?', [JSON.stringify(newPromotionIds), order.id])
          }
        }
      } catch (e) {
        // 忽略解析错误，继续处理下一个订单
        console.error(`Error processing order ${order.id}:`, e.message)
      }
    }
    
    // 删除促销活动
    await conn.query('DELETE FROM promotions WHERE id = ?', [id])
    
    await conn.commit()
    res.json({ code: 0, message: '删除成功' })
  } catch (error) {
    await conn.rollback()
    res.status(500).json({ code: 500, message: error.message })
  } finally {
    conn.release()
  }
})

// ==================== 订单 API ====================
// 安全解析JSON字段（兼容字符串和对象）
const parseJsonField = (field) => {
  if (!field) return []
  if (typeof field === 'object') return field
  if (typeof field === 'string') {
    try {
      return JSON.parse(field)
    } catch (e) {
      return []
    }
  }
  return []
}

// 获取所有订单
app.get('/api/orders', async (req, res) => {
  try {
    const { agentId } = req.query
    let sql = 'SELECT o.*, a.name as agent_name FROM orders o LEFT JOIN agents a ON o.agent_id = a.id'
    const params = []
    if (agentId) {
      sql += ' WHERE o.agent_id = ?'
      params.push(agentId)
    }
    sql += ' ORDER BY o.created_at DESC'
    const [rows] = await pool.query(sql, params)
    
    // 获取所有促销活动信息（用于匹配促销名称）
    const [promotionRows] = await pool.query('SELECT id, name FROM promotions')
    const promotionsMap = new Map()
    promotionRows.forEach(p => {
      promotionsMap.set(p.id, p.name)
    })
    
    const orders = rows.map(row => {
      const promotionId = parseJsonField(row.promotion_id)
      let promotionNames = []
      
      // 处理促销ID（可能是单个ID或ID数组）
      if (promotionId) {
        if (Array.isArray(promotionId) && promotionId.length > 0) {
          promotionNames = promotionId.map(id => promotionsMap.get(id)).filter(Boolean)
        } else if (typeof promotionId === 'string' && promotionId) {
          const name = promotionsMap.get(promotionId)
          if (name) promotionNames = [name]
        }
      }
      
      return {
        id: row.id,
        agentId: row.agent_id,
        agentName: row.agent_name,
        items: parseJsonField(row.items),
        totalWeight: Number(row.total_weight),
        totalAmount: Number(row.total_amount),
        driverPhone: row.driver_phone,
        promotionId: promotionId,
        promotionNames: promotionNames.length > 0 ? promotionNames : undefined,
        giftItems: parseJsonField(row.gift_items),
        images: parseJsonField(row.images),
        remark: row.remark,
        createdAt: row.created_at
      }
    })
    res.json({ code: 0, message: 'OK', data: orders })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 获取单个订单
app.get('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params
    const [rows] = await pool.query(
      'SELECT o.*, a.name as agent_name FROM orders o LEFT JOIN agents a ON o.agent_id = a.id WHERE o.id = ?',
      [id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '订单不存在' })
    }
    const row = rows[0]
    
    // 获取促销活动名称
    const promotionId = parseJsonField(row.promotion_id)
    let promotionNames = []
    
    if (promotionId) {
      if (Array.isArray(promotionId) && promotionId.length > 0) {
        const placeholders = promotionId.map(() => '?').join(',')
        const [promotionRows] = await pool.query(`SELECT id, name FROM promotions WHERE id IN (${placeholders})`, promotionId)
        promotionNames = promotionRows.map(p => p.name)
      } else if (typeof promotionId === 'string' && promotionId) {
        const [promotionRows] = await pool.query('SELECT name FROM promotions WHERE id = ?', [promotionId])
        if (promotionRows.length > 0) {
          promotionNames = [promotionRows[0].name]
        }
      }
    }
    
    const order = {
      id: row.id,
      agentId: row.agent_id,
      agentName: row.agent_name,
      items: parseJsonField(row.items),
      totalWeight: Number(row.total_weight),
      totalAmount: Number(row.total_amount),
      driverPhone: row.driver_phone,
      promotionId: promotionId,
      promotionNames: promotionNames.length > 0 ? promotionNames : undefined,
      giftItems: parseJsonField(row.gift_items),
      images: parseJsonField(row.images),
      remark: row.remark,
      createdAt: row.created_at
    }
    res.json({ code: 0, message: 'OK', data: order })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 创建订单（含扣款）
app.post('/api/orders', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    
    const { agentId, items, totalWeight, totalAmount, driverPhone, promotionId, giftItems, images, remark } = req.body
    const orderId = uuidv4()
    
    // 处理促销ID：支持单个ID或JSON数组字符串
    let promotionIdValue = promotionId
    if (promotionId && typeof promotionId === 'string') {
      try {
        // 尝试解析JSON数组
        const parsed = JSON.parse(promotionId)
        if (Array.isArray(parsed)) {
          promotionIdValue = JSON.stringify(parsed) // 存储为JSON数组
        }
      } catch (e) {
        // 不是JSON，保持原值（单个ID）
      }
    }
    
    // 创建订单
    await conn.query(
      'INSERT INTO orders (id, agent_id, items, total_weight, total_amount, driver_phone, promotion_id, gift_items, images, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [orderId, agentId, JSON.stringify(items), totalWeight, totalAmount, driverPhone, promotionIdValue, JSON.stringify(giftItems), JSON.stringify(images), remark]
    )
    
    // 扣除代理商余额
    await conn.query('UPDATE agents SET balance = balance - ? WHERE id = ?', [totalAmount, agentId])
    
    // 记录交易流水
    const txId = uuidv4()
    await conn.query(
      'INSERT INTO transactions (id, agent_id, type, reason, amount, related_order_id, remark) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [txId, agentId, 'deduct', 'shipping', -totalAmount, orderId, '发货扣款']
    )
    
    await conn.commit()
    res.json({ code: 0, message: '开单成功', data: { id: orderId } })
  } catch (error) {
    await conn.rollback()
    res.status(500).json({ code: 500, message: error.message })
  } finally {
    conn.release()
  }
})

// 修改订单（仅超级管理员）
app.put('/api/orders/:id', requireSuperAdmin, async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    
    const { id } = req.params
    const { agentId, items, totalWeight, totalAmount, driverPhone, promotionId, giftItems, images, remark } = req.body
    
    // 获取原订单信息
    const [[originalOrder]] = await conn.query('SELECT * FROM orders WHERE id = ?', [id])
    if (!originalOrder) {
      await conn.rollback()
      return res.status(404).json({ code: 404, message: '订单不存在' })
    }
    
    // 计算金额差异
    const amountDiff = totalAmount - originalOrder.total_amount
    
    // 处理促销ID
    let promotionIdValue = promotionId
    if (promotionId && typeof promotionId === 'string') {
      try {
        const parsed = JSON.parse(promotionId)
        if (Array.isArray(parsed)) {
          promotionIdValue = JSON.stringify(parsed)
        }
      } catch (e) {
        // 保持原值
      }
    }
    
    // 更新订单
    await conn.query(
      'UPDATE orders SET agent_id = ?, items = ?, total_weight = ?, total_amount = ?, driver_phone = ?, promotion_id = ?, gift_items = ?, images = ?, remark = ? WHERE id = ?',
      [agentId, JSON.stringify(items), totalWeight, totalAmount, driverPhone, promotionIdValue, JSON.stringify(giftItems), JSON.stringify(images), remark, id]
    )
    
    // 如果金额发生变化，需要调整代理商余额和交易记录
    if (amountDiff !== 0) {
      // 更新代理商余额
      await conn.query('UPDATE agents SET balance = balance + ? WHERE id = ?', [amountDiff, agentId])
      
      // 更新关联的交易记录金额
      await conn.query(
        'UPDATE transactions SET amount = ? WHERE related_order_id = ? AND reason = ?',
        [-totalAmount, id, 'shipping']
      )
    }
    
    await conn.commit()
    res.json({ code: 0, message: '订单修改成功' })
  } catch (error) {
    await conn.rollback()
    res.status(500).json({ code: 500, message: error.message })
  } finally {
    conn.release()
  }
})

// 更新订单状态
app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    
    if (!status || !['pending', 'shipped', 'completed'].includes(status)) {
      return res.json({ code: 400, message: '订单状态无效' })
    }
    
    // 获取订单信息
    const [[order]] = await pool.query('SELECT * FROM orders WHERE id = ?', [id])
    if (!order) {
      return res.status(404).json({ code: 404, message: '订单不存在' })
    }
    
    // 更新订单状态和时间戳
    const updateFields = ['status = ?']
    const updateValues = [status]
    
    if (status === 'shipped' && order.status === 'pending') {
      updateFields.push('shipped_at = NOW()')
    }
    
    if (status === 'completed' && order.status !== 'completed') {
      if (!order.shipped_at) {
        updateFields.push('shipped_at = NOW()')
      }
      updateFields.push('completed_at = NOW()')
    }
    
    updateValues.push(id)
    
    await pool.query(
      `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    )
    
    res.json({ code: 0, message: '订单状态更新成功' })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 更新订单搭赠送达状态
app.put('/api/orders/:id/gifts', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    
    const { id } = req.params
    const { gifts, remark } = req.body
    
    if (!Array.isArray(gifts)) {
      return res.json({ code: 400, message: '搭赠信息格式错误' })
    }
    
    // 获取订单信息
    const [[order]] = await conn.query('SELECT * FROM orders WHERE id = ?', [id])
    if (!order) {
      await conn.rollback()
      return res.status(404).json({ code: 404, message: '订单不存在' })
    }
    
    // 获取管理员信息（如果有）
    let adminId = null
    let adminName = null
    const adminIdHeader = req.headers['admin-id']
    const adminRoleHeader = req.headers['admin-role']
    if (adminIdHeader && adminRoleHeader) {
      const [admins] = await conn.query('SELECT * FROM admins WHERE id = ? AND is_active = 1', [adminIdHeader])
      if (admins.length > 0) {
        adminId = admins[0].id
        adminName = admins[0].name
      }
    }
    
    // 获取原有赠品信息
    let giftItems = parseJsonField(order.gift_items) || []
    
    // 检查是否是组合赠品（通过检查 giftItems 中是否有 isGroup 或 groupId）
    const hasGroupGift = giftItems.some(g => g.isGroup === true || g.groupId)
    
    // 更新赠品的送达数量，并记录送达历史
    for (const gift of gifts) {
      // 查找匹配的赠品：支持 productId 和 groupId 两种匹配方式
      let giftItem = null
      if (gift.productId) {
        // 单个产品赠品：通过 productId 匹配
        giftItem = giftItems.find(g => g.productId === gift.productId)
        // 如果没找到，可能是组合赠品（前端发送的 productId 实际上是 groupId）
        if (!giftItem) {
          giftItem = giftItems.find(g => g.groupId === gift.productId)
        }
      } else if (gift.groupId) {
        // 组合赠品：通过 groupId 匹配
        giftItem = giftItems.find(g => g.groupId === gift.groupId || (g.isGroup && g.groupId === gift.groupId))
      }
      
      if (giftItem) {
        console.log('找到匹配的赠品项:', { 
          giftId: gift.productId || gift.groupId, 
          giftItem: { 
            productId: giftItem.productId, 
            groupId: giftItem.groupId, 
            isGroup: giftItem.isGroup 
          } 
        })
        const oldDeliveredQuantity = giftItem.deliveredQuantity || 0
        const newDeliveredQuantity = gift.deliveredQuantity || 0
        const quantityDelta = newDeliveredQuantity - oldDeliveredQuantity
        
        // 如果送达数量有变化，记录送达历史
        if (quantityDelta !== 0) {
          giftItem.deliveredQuantity = newDeliveredQuantity
          
          // 创建送达记录
          const recordId = uuidv4()
          const isGroup = giftItem.isGroup === true || giftItem.groupId || hasGroupGift
          
          // 如果是组合赠品，需要获取组合信息
          let groupId = null
          let groupName = null
          if (isGroup) {
            // 从 giftItem 中获取组合信息
            groupId = giftItem.groupId || null
            groupName = giftItem.groupName || '组合赠品'
            
            // 如果没有 groupId，尝试从订单的 groupGiftInfo 中获取
            if (!groupId && order.group_gift_info) {
              const groupGiftInfo = parseJsonField(order.group_gift_info)
              if (groupGiftInfo) {
                groupId = groupGiftInfo.groupId || null
                groupName = groupGiftInfo.groupName || '组合赠品'
              }
            }
          }
          
          await conn.query(
            `INSERT INTO gift_delivery_records 
             (id, order_id, agent_id, product_id, product_name, group_id, group_name, quantity, delivered_by, delivered_by_name, remark) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              recordId,
              id,
              order.agent_id,
              isGroup ? null : gift.productId,
              isGroup ? null : (giftItem.productName || gift.productName),
              groupId,
              groupName,
              Math.abs(quantityDelta), // 记录变化的绝对值
              adminId,
              adminName,
              remark || null
            ]
          )
        }
      } else {
        console.error('未找到匹配的赠品项:', { 
          gift, 
          giftItems: giftItems.map(g => ({ 
            productId: g.productId, 
            groupId: g.groupId, 
            isGroup: g.isGroup 
          })) 
        })
        await conn.rollback()
        return res.status(400).json({ code: 400, message: `未找到匹配的赠品项: ${gift.productId || gift.groupId || '未知'}` })
      }
    }
    
    // 更新订单的赠品信息
    await conn.query(
      'UPDATE orders SET gift_items = ? WHERE id = ?',
      [JSON.stringify(giftItems), id]
    )
    
    await conn.commit()
    res.json({ code: 0, message: '搭赠送达状态更新成功' })
  } catch (error) {
    await conn.rollback()
    res.status(500).json({ code: 500, message: error.message })
  } finally {
    conn.release()
  }
})

// 获取订单的搭赠送达记录
app.get('/api/orders/:id/gift-delivery-records', async (req, res) => {
  try {
    const { id } = req.params
    
    // 验证订单是否存在
    const [[order]] = await pool.query('SELECT * FROM orders WHERE id = ?', [id])
    if (!order) {
      return res.status(404).json({ code: 404, message: '订单不存在' })
    }
    
    // 查询送达记录
    const [records] = await pool.query(
      `SELECT * FROM gift_delivery_records 
       WHERE order_id = ? 
       ORDER BY created_at DESC`,
      [id]
    )
    
    // 转换字段名为驼峰格式
    const formattedRecords = records.map(record => ({
      id: record.id,
      orderId: record.order_id,
      agentId: record.agent_id,
      productId: record.product_id || undefined,
      productName: record.product_name || undefined,
      groupId: record.group_id || undefined,
      groupName: record.group_name || undefined,
      quantity: record.quantity,
      deliveredBy: record.delivered_by || undefined,
      deliveredByName: record.delivered_by_name || undefined,
      remark: record.remark || undefined,
      createdAt: record.created_at
    }))
    
    res.json({ code: 0, message: 'OK', data: formattedRecords })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 删除送达记录（仅管理员）
app.delete('/api/orders/:orderId/gift-delivery-records/:recordId', requireSuperAdmin, async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    
    const { orderId, recordId } = req.params
    const adminId = req.headers['admin-id'] || req.query.adminId
    const adminRole = req.headers['admin-role'] || req.query.adminRole
    
    // 验证管理员权限（admin 或 super_admin）
    if (adminRole !== 'admin' && adminRole !== 'super_admin') {
      await conn.rollback()
      return res.status(403).json({ code: 403, message: '无权限删除送达记录' })
    }
    
    // 验证订单是否存在
    const [[order]] = await conn.query('SELECT * FROM orders WHERE id = ?', [orderId])
    if (!order) {
      await conn.rollback()
      return res.status(404).json({ code: 404, message: '订单不存在' })
    }
    
    // 验证送达记录是否存在
    const [[record]] = await conn.query(
      'SELECT * FROM gift_delivery_records WHERE id = ? AND order_id = ?',
      [recordId, orderId]
    )
    if (!record) {
      await conn.rollback()
      return res.status(404).json({ code: 404, message: '送达记录不存在' })
    }
    
    // 删除送达记录
    await conn.query('DELETE FROM gift_delivery_records WHERE id = ?', [recordId])
    
    // 更新订单中的送达数量（减少对应的数量）
    const giftItems = parseJsonField(order.gift_items) || []
    let updated = false
    
    if (record.group_id) {
      // 组合赠品
      const giftItem = giftItems.find(g => g.groupId === record.group_id)
      if (giftItem && giftItem.deliveredQuantity) {
        giftItem.deliveredQuantity = Math.max(0, (giftItem.deliveredQuantity || 0) - record.quantity)
        updated = true
      }
    } else if (record.product_id) {
      // 单个产品赠品
      const giftItem = giftItems.find(g => g.productId === record.product_id)
      if (giftItem && giftItem.deliveredQuantity) {
        giftItem.deliveredQuantity = Math.max(0, (giftItem.deliveredQuantity || 0) - record.quantity)
        updated = true
      }
    }
    
    if (updated) {
      await conn.query(
        'UPDATE orders SET gift_items = ? WHERE id = ?',
        [JSON.stringify(giftItems), orderId]
      )
    }
    
    await conn.commit()
    res.json({ code: 0, message: '删除成功' })
  } catch (error) {
    await conn.rollback()
    res.status(500).json({ code: 500, message: error.message })
  } finally {
    conn.release()
  }
})

// 删除订单（仅超级管理员）
app.delete('/api/orders/:id', requireSuperAdmin, async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    
    const { id } = req.params
    
    // 获取订单信息
    const [[order]] = await conn.query('SELECT * FROM orders WHERE id = ?', [id])
    if (!order) {
      await conn.rollback()
      return res.status(404).json({ code: 404, message: '订单不存在' })
    }
    
    // 如果订单已发货（status为shipped或completed），需要退回代理商余额
    if (order.status === 'shipped' || order.status === 'completed') {
      const amount = Number(order.total_amount) || 0
      if (amount > 0) {
        // 退回代理商余额
        await conn.query('UPDATE agents SET balance = balance + ? WHERE id = ?', [amount, order.agent_id])
      }
    }
    
    // 删除关联的交易记录（如果有）
    await conn.query('DELETE FROM transactions WHERE related_order_id = ?', [id])
    
    // 删除订单
    await conn.query('DELETE FROM orders WHERE id = ?', [id])
    
    await conn.commit()
    res.json({ code: 0, message: '订单删除成功' })
  } catch (error) {
    await conn.rollback()
    res.status(500).json({ code: 500, message: error.message })
  } finally {
    conn.release()
  }
})

// ==================== 产品组合 API ====================
// 获取所有产品组合
app.get('/api/product-groups', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM product_groups ORDER BY created_at DESC')
    const groups = rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      productIds: parseJsonField(row.product_ids) || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
    res.json({ code: 0, message: 'OK', data: groups })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 创建产品组合
app.post('/api/product-groups', async (req, res) => {
  try {
    const { name, description, productIds } = req.body
    
    if (!name || name.trim() === '') {
      return res.json({ code: 400, message: '组合名称不能为空' })
    }
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.json({ code: 400, message: '请至少选择一个产品' })
    }
    
    // 验证所有产品的重量是否相同
    if (productIds.length > 1) {
      const placeholders = productIds.map(() => '?').join(',')
      const [productRows] = await pool.query(
        `SELECT id, name, weight FROM products WHERE id IN (${placeholders})`,
        productIds
      )
      
      if (productRows.length !== productIds.length) {
        return res.json({ code: 400, message: '部分产品不存在' })
      }
      
      // 检查所有产品的重量是否相同
      const firstWeight = productRows[0].weight
      const allSameWeight = productRows.every(product => product.weight === firstWeight)
      
      if (!allSameWeight) {
        const weightList = productRows.map(p => `${p.name}(${p.weight}kg)`).join('、')
        return res.json({ 
          code: 400, 
          message: `组合中的产品重量必须相同。当前产品重量：${weightList}` 
        })
      }
    }
    
    const id = uuidv4()
    await pool.query(
      'INSERT INTO product_groups (id, name, description, product_ids) VALUES (?, ?, ?, ?)',
      [id, name.trim(), description || '', JSON.stringify(productIds)]
    )
    res.json({ code: 0, message: '创建成功', data: { id } })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 更新产品组合
app.put('/api/product-groups/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, productIds } = req.body
    
    if (!name || name.trim() === '') {
      return res.json({ code: 400, message: '组合名称不能为空' })
    }
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.json({ code: 400, message: '请至少选择一个产品' })
    }
    
    // 验证所有产品的重量是否相同
    if (productIds.length > 1) {
      const placeholders = productIds.map(() => '?').join(',')
      const [productRows] = await pool.query(
        `SELECT id, name, weight FROM products WHERE id IN (${placeholders})`,
        productIds
      )
      
      if (productRows.length !== productIds.length) {
        return res.json({ code: 400, message: '部分产品不存在' })
      }
      
      // 检查所有产品的重量是否相同
      const firstWeight = productRows[0].weight
      const allSameWeight = productRows.every(product => product.weight === firstWeight)
      
      if (!allSameWeight) {
        const weightList = productRows.map(p => `${p.name}(${p.weight}kg)`).join('、')
        return res.json({ 
          code: 400, 
          message: `组合中的产品重量必须相同。当前产品重量：${weightList}` 
        })
      }
    }
    
    await pool.query(
      'UPDATE product_groups SET name=?, description=?, product_ids=? WHERE id=?',
      [name.trim(), description || '', JSON.stringify(productIds), id]
    )
    res.json({ code: 0, message: '更新成功' })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 删除产品组合
app.delete('/api/product-groups/:id', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    
    const { id } = req.params
    
    // 检查是否有代理商使用此组合作为年度目标
    const [agents] = await conn.query('SELECT id, name, yearly_targets FROM agents')
    let usedInTargets = false
    for (const agent of agents) {
      if (agent.yearly_targets) {
        const targets = typeof agent.yearly_targets === 'string' ? JSON.parse(agent.yearly_targets) : agent.yearly_targets
        for (const key in targets) {
          const target = targets[key]
          if (typeof target === 'object' && target.groupId === id) {
            usedInTargets = true
            break
          }
        }
      }
      if (usedInTargets) break
    }
    
    if (usedInTargets) {
      await conn.rollback()
      return res.json({ code: 400, message: '该组合正在被代理商年度目标使用，无法删除' })
    }
    
    // 检查是否有促销活动使用此组合
    const [promotions] = await conn.query('SELECT id, name, condition_group_id FROM promotions WHERE condition_group_id = ?', [id])
    if (promotions.length > 0) {
      await conn.rollback()
      return res.json({ code: 400, message: '该组合正在被促销活动使用，无法删除' })
    }
    
    await conn.query('DELETE FROM product_groups WHERE id = ?', [id])
    await conn.commit()
    res.json({ code: 0, message: '删除成功' })
  } catch (error) {
    await conn.rollback()
    res.status(500).json({ code: 500, message: error.message })
  } finally {
    conn.release()
  }
})

// ==================== 交易流水 API ====================
// 获取交易流水
app.get('/api/transactions', async (req, res) => {
  try {
    const { agentId } = req.query
    let sql = `SELECT t.*, a.name as agent_name, pa.name as payment_account_name, pa.id as payment_account_id 
               FROM transactions t 
               LEFT JOIN agents a ON t.agent_id = a.id 
               LEFT JOIN payment_accounts pa ON t.payment_account_id = pa.id`
    const params = []
    if (agentId) {
      sql += ' WHERE t.agent_id = ?'
      params.push(agentId)
    }
    sql += ' ORDER BY t.created_at DESC'
    const [rows] = await pool.query(sql, params)
    
    // 获取所有相关订单的商品信息
    const orderIds = rows.filter(r => r.related_order_id).map(r => r.related_order_id)
    const orderItemsMap = new Map()
    if (orderIds.length > 0) {
      const placeholders = orderIds.map(() => '?').join(',')
      const [orderRows] = await pool.query(
        `SELECT id, items FROM orders WHERE id IN (${placeholders})`,
        orderIds
      )
      orderRows.forEach(orderRow => {
        try {
          const items = typeof orderRow.items === 'string' ? JSON.parse(orderRow.items) : orderRow.items
          if (Array.isArray(items)) {
            // 处理组合商品：按组合分组显示
            const displayMap = new Map()
            
            items.forEach(item => {
              if (item.groupId && item.groupName && item.groupQuantity) {
                // 组合商品：按groupId分组，只显示一次组合名称和组合数量
                const key = `group-${item.groupId}`
                if (!displayMap.has(key)) {
                  displayMap.set(key, {
                    productName: item.groupName,
                    quantity: item.groupQuantity,
                    groupId: item.groupId
                  })
                }
              } else {
                // 单个商品：正常显示
                const key = `product-${item.productId}`
                displayMap.set(key, {
                  productName: item.productName || item.product_name,
                  quantity: Number(item.quantity) || 0
                })
              }
            })
            
            orderItemsMap.set(orderRow.id, Array.from(displayMap.values()))
          }
        } catch (e) {
          console.error('解析订单商品失败:', e)
        }
      })
    }
    
    const transactions = rows.map(row => {
      const orderItems = row.related_order_id ? orderItemsMap.get(row.related_order_id) : undefined
      // 处理凭证图片：支持字符串或JSON字符串（多图情况）
      let proofValue = row.proof
      if (row.proof && typeof row.proof === 'string') {
        try {
          const parsed = JSON.parse(row.proof)
          proofValue = parsed // 如果是JSON数组，使用解析后的数组；如果是单个字符串，保持原值
        } catch {
          // 不是JSON字符串，保持原字符串值
          proofValue = row.proof
        }
      }
      return {
        id: row.id,
        agentId: row.agent_id,
        agentName: row.agent_name,
        type: row.type,
        reason: row.reason,
        amount: Number(row.amount),
        proof: proofValue,
        relatedOrderId: row.related_order_id,
        relatedAgentId: row.related_agent_id,
        productId: row.product_id,
        quantity: row.quantity ? Number(row.quantity) : undefined,
        remark: row.remark,
        paymentAccountId: row.payment_account_id,
        paymentAccountName: row.payment_account_name,
        orderItems: orderItems,
        createdAt: row.created_at
      }
    })
    res.json({ code: 0, message: 'OK', data: transactions })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 充值
app.post('/api/transactions/recharge', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    
    const { agentId, amount, reason, proof, proofFilename, remark, paymentAccountId } = req.body
    const txId = uuidv4()
    
    // 如果有凭证图片，先检查是否重复
    if (proofFilename) {
      const [existing] = await conn.query('SELECT * FROM upload_records WHERE filename = ?', [proofFilename])
      if (existing.length > 0) {
        await conn.rollback()
        return res.json({ 
          code: 409, 
          message: '该转账截图已被使用过，请上传新的截图',
          data: { isDuplicate: true, originalRecord: existing[0] }
        })
      }
      
      // 记录图片
      const uploadId = uuidv4()
      await conn.query(
        'INSERT INTO upload_records (id, filename, upload_type, related_id, agent_id) VALUES (?, ?, ?, ?, ?)',
        [uploadId, proofFilename, 'recharge', txId, agentId]
      )
    }
    
    // 记录流水
    await conn.query(
      'INSERT INTO transactions (id, agent_id, type, reason, amount, proof, remark, payment_account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [txId, agentId, 'recharge', reason, amount, proof, remark, paymentAccountId]
    )
    
    // 增加余额
    await conn.query('UPDATE agents SET balance = balance + ? WHERE id = ?', [amount, agentId])
    
    await conn.commit()
    res.json({ code: 0, message: '充值成功', data: { id: txId } })
  } catch (error) {
    await conn.rollback()
    res.status(500).json({ code: 500, message: error.message })
  } finally {
    conn.release()
  }
})

// 扣款
app.post('/api/transactions/deduct', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    
    const { agentId, amount, reason, remark, productId, quantity } = req.body
    const txId = uuidv4()
    
    // 记录流水（包含商品信息）
    await conn.query(
      'INSERT INTO transactions (id, agent_id, type, reason, amount, remark, product_id, quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [txId, agentId, 'deduct', reason, -amount, remark || null, productId || null, quantity || null]
    )
    
    // 扣除余额
    await conn.query('UPDATE agents SET balance = balance - ? WHERE id = ?', [amount, agentId])
    
    await conn.commit()
    res.json({ code: 0, message: '扣款成功', data: { id: txId } })
  } catch (error) {
    await conn.rollback()
    res.status(500).json({ code: 500, message: error.message })
  } finally {
    conn.release()
  }
})

// 调货（原子操作）
app.post('/api/transactions/transfer', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    
    const { fromAgentId, toAgentId, amount, productId, quantity, remark } = req.body
    
    // 验证参数
    if (!fromAgentId || !toAgentId) {
      await conn.rollback()
      return res.json({ code: 400, message: '发货方和收货方不能为空' })
    }
    if (fromAgentId === toAgentId) {
      await conn.rollback()
      return res.json({ code: 400, message: '发货方和收货方不能相同' })
    }
    if (!amount || amount <= 0) {
      await conn.rollback()
      return res.json({ code: 400, message: '调货金额必须大于0' })
    }
    
    // 获取代理商名称
    const [fromAgents] = await conn.query('SELECT name FROM agents WHERE id = ?', [fromAgentId])
    const [toAgents] = await conn.query('SELECT name FROM agents WHERE id = ?', [toAgentId])
    
    if (fromAgents.length === 0) {
      await conn.rollback()
      return res.status(404).json({ code: 404, message: '发货方不存在' })
    }
    if (toAgents.length === 0) {
      await conn.rollback()
      return res.status(404).json({ code: 404, message: '收货方不存在' })
    }
    
    const fromAgent = fromAgents[0]
    const toAgent = toAgents[0]
    
    // 构建备注：如果有用户输入的备注，则使用；否则使用默认备注
    const defaultRemarkIn = `${toAgent.name} 调货`
    const defaultRemarkOut = `调货给 ${fromAgent.name}`
    const finalRemarkIn = remark ? `${defaultRemarkIn} - ${remark}` : defaultRemarkIn
    const finalRemarkOut = remark ? `${defaultRemarkOut} - ${remark}` : defaultRemarkOut
    
    // 1. 退款给发货方（记录调货产品信息，用于扣除完成量）
    const inTxId = uuidv4()
    await conn.query(
      'INSERT INTO transactions (id, agent_id, type, reason, amount, related_agent_id, product_id, quantity, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [inTxId, fromAgentId, 'recharge', 'transfer_in', amount, toAgentId, productId || null, quantity || null, finalRemarkIn]
    )
    await conn.query('UPDATE agents SET balance = balance + ? WHERE id = ?', [amount, fromAgentId])
    
    // 2. 从收货方扣款
    const outTxId = uuidv4()
    await conn.query(
      'INSERT INTO transactions (id, agent_id, type, reason, amount, related_agent_id, remark) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [outTxId, toAgentId, 'deduct', 'transfer_out', -amount, fromAgentId, finalRemarkOut]
    )
    await conn.query('UPDATE agents SET balance = balance - ? WHERE id = ?', [amount, toAgentId])
    
    await conn.commit()
    res.json({ code: 0, message: '调货成功', data: { inTxId, outTxId } })
  } catch (error) {
    await conn.rollback()
    res.status(500).json({ code: 500, message: error.message })
  } finally {
    conn.release()
  }
})

// 修改交易记录（仅超级管理员）
app.put('/api/transactions/:id', requireSuperAdmin, async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    
    const { id } = req.params
    const { agentId, amount, reason, remark, paymentAccountId, proof } = req.body
    
    // 获取原交易记录
    const [[originalTx]] = await conn.query('SELECT * FROM transactions WHERE id = ?', [id])
    if (!originalTx) {
      await conn.rollback()
      return res.status(404).json({ code: 404, message: '交易记录不存在' })
    }
    
    // 计算金额差异
    const amountDiff = amount - originalTx.amount
    
    // 处理凭证图片（支持字符串或数组）
    let proofValue = null
    if (proof) {
      if (Array.isArray(proof)) {
        proofValue = JSON.stringify(proof)
      } else if (typeof proof === 'string') {
        proofValue = proof
      }
    }
    
    // 判断是否是收款账户扣费（有 paymentAccountId 且没有 agentId，或者 reason 是 withdraw/fee/other）
    const isPaymentAccountDeduct = paymentAccountId && !agentId || 
                                    ['withdraw', 'fee', 'other'].includes(reason)
    
    // 对于收款账户扣费，保持原 agent_id（如果原来有的话），或者使用第一个代理商作为占位符
    let finalAgentId = agentId
    if (isPaymentAccountDeduct && !agentId) {
      // 收款账户扣费：保持原 agent_id（如果原来有），否则使用第一个代理商作为占位符
      if (originalTx.agent_id) {
        finalAgentId = originalTx.agent_id
      } else {
        // 如果没有原 agent_id，使用第一个代理商作为占位符（数据库要求 NOT NULL）
        const [firstAgent] = await conn.query('SELECT id FROM agents LIMIT 1')
        if (firstAgent.length > 0) {
          finalAgentId = firstAgent[0].id
        } else {
          await conn.rollback()
          return res.json({ code: 400, message: '系统中没有代理商，无法创建交易记录' })
        }
      }
    }
    
    // 更新交易记录
    await conn.query(
      'UPDATE transactions SET agent_id = ?, amount = ?, reason = ?, remark = ?, payment_account_id = ?, proof = ? WHERE id = ?',
      [finalAgentId, amount, reason, remark, paymentAccountId || null, proofValue, id]
    )
    
    // 如果金额或代理商发生变化，需要调整余额（仅非收款账户扣费时）
    if (!isPaymentAccountDeduct && (amountDiff !== 0 || originalTx.agent_id !== finalAgentId)) {
      // 恢复原代理商的余额（如果原交易有代理商）
      if (originalTx.agent_id) {
        if (originalTx.type === 'recharge') {
          await conn.query('UPDATE agents SET balance = balance - ? WHERE id = ?', [originalTx.amount, originalTx.agent_id])
        } else {
          await conn.query('UPDATE agents SET balance = balance + ? WHERE id = ?', [Math.abs(originalTx.amount), originalTx.agent_id])
        }
      }
      
      // 更新新代理商的余额
      if (finalAgentId) {
        const newType = amount > 0 ? 'recharge' : 'deduct'
        if (newType === 'recharge') {
          await conn.query('UPDATE agents SET balance = balance + ? WHERE id = ?', [amount, finalAgentId])
        } else {
          await conn.query('UPDATE agents SET balance = balance - ? WHERE id = ?', [Math.abs(amount), finalAgentId])
        }
      }
    }
    
    await conn.commit()
    res.json({ code: 0, message: '交易记录修改成功' })
  } catch (error) {
    await conn.rollback()
    res.status(500).json({ code: 500, message: error.message })
  } finally {
    conn.release()
  }
})

// 删除交易记录（仅超级管理员）
app.delete('/api/transactions/:id', requireSuperAdmin, async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    
    const { id } = req.params
    
    // 获取原交易记录
    const [[originalTx]] = await conn.query('SELECT * FROM transactions WHERE id = ?', [id])
    if (!originalTx) {
      await conn.rollback()
      return res.status(404).json({ code: 404, message: '交易记录不存在' })
    }
    
    // 检查是否为订单相关的交易记录（发货扣款），如果是，不允许删除
    if (originalTx.related_order_id) {
      await conn.rollback()
      return res.status(400).json({ code: 400, message: '订单相关的交易记录不能删除，请先删除订单' })
    }
    
    // 恢复代理商余额
    // 充值类型的交易：删除时需要扣除余额
    // 扣款类型的交易：删除时需要退回余额
    if (originalTx.type === 'recharge') {
      // 充值 -> 删除时扣除余额
      await conn.query('UPDATE agents SET balance = balance - ? WHERE id = ?', [originalTx.amount, originalTx.agent_id])
    } else {
      // 扣款 -> 删除时退回余额
      await conn.query('UPDATE agents SET balance = balance + ? WHERE id = ?', [Math.abs(originalTx.amount), originalTx.agent_id])
    }
    
    // 删除交易记录
    await conn.query('DELETE FROM transactions WHERE id = ?', [id])
    
    await conn.commit()
    res.json({ code: 0, message: '交易记录删除成功' })
  } catch (error) {
    await conn.rollback()
    res.status(500).json({ code: 500, message: error.message })
  } finally {
    conn.release()
  }
})

// ==================== 车型管理 API ====================
// 获取所有车型
app.get('/api/truck-types', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM truck_types ORDER BY is_default DESC, created_at ASC')
    const truckTypes = rows.map(row => ({
      id: row.id,
      name: row.name,
      minWeight: Number(row.min_weight),
      maxWeight: Number(row.max_weight),
      isDefault: Boolean(row.is_default)
    }))
    res.json({ code: 0, message: 'OK', data: truckTypes })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 创建车型
app.post('/api/truck-types', async (req, res) => {
  try {
    const { name, minWeight, maxWeight, isDefault } = req.body
    const id = uuidv4()
    
    // 如果设置为默认，先取消其他默认
    if (isDefault) {
      await pool.query('UPDATE truck_types SET is_default = 0')
    }
    
    await pool.query(
      'INSERT INTO truck_types (id, name, min_weight, max_weight, is_default) VALUES (?, ?, ?, ?, ?)',
      [id, name, minWeight, maxWeight, isDefault ? 1 : 0]
    )
    res.json({ code: 0, message: '创建成功', data: { id } })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 更新车型
app.put('/api/truck-types/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, minWeight, maxWeight, isDefault } = req.body
    
    if (isDefault) {
      await pool.query('UPDATE truck_types SET is_default = 0')
    }
    
    await pool.query(
      'UPDATE truck_types SET name=?, min_weight=?, max_weight=?, is_default=? WHERE id=?',
      [name, minWeight, maxWeight, isDefault ? 1 : 0, id]
    )
    res.json({ code: 0, message: '更新成功' })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 删除车型
app.delete('/api/truck-types/:id', async (req, res) => {
  try {
    const { id } = req.params
    await pool.query('DELETE FROM truck_types WHERE id=?', [id])
    res.json({ code: 0, message: '删除成功' })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// ==================== 收款账户 API ====================
// 获取所有收款账户
app.get('/api/payment-accounts', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM payment_accounts WHERE is_active = 1')
    // 为每个账户计算当前余额
    const accountsWithBalance = await Promise.all(
      rows.map(async (account) => {
        const [txs] = await pool.query(
          'SELECT SUM(amount) as total FROM transactions WHERE payment_account_id = ?',
          [account.id]
        )
        const currentBalance = Number(account.balance || 0) + Number(txs[0]?.total || 0)
        return { ...account, balance: currentBalance }
      })
    )
    res.json({ code: 0, message: 'OK', data: accountsWithBalance })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 创建收款账户
app.post('/api/payment-accounts', async (req, res) => {
  try {
    const { name, accountNo, bankName, qrCode } = req.body
    const id = uuidv4()
    await pool.query(
      'INSERT INTO payment_accounts (id, name, account_no, bank_name, qr_code) VALUES (?, ?, ?, ?, ?)',
      [id, name, accountNo, bankName, qrCode]
    )
    res.json({ code: 0, message: '创建成功', data: { id } })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 更新收款账户
app.put('/api/payment-accounts/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, accountNo, bankName, qrCode } = req.body
    
    if (!name || name.trim() === '') {
      return res.json({ code: 400, message: '账户名称不能为空' })
    }
    
    await pool.query(
      'UPDATE payment_accounts SET name = ?, account_no = ?, bank_name = ?, qr_code = ? WHERE id = ?',
      [name.trim(), accountNo || null, bankName || null, qrCode || null, id]
    )
    
    res.json({ code: 0, message: '更新成功' })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 删除收款账户
app.delete('/api/payment-accounts/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    // 检查是否有交易记录关联
    const [txs] = await pool.query(
      'SELECT COUNT(*) as count FROM transactions WHERE payment_account_id = ?',
      [id]
    )
    
    if (txs[0].count > 0) {
      return res.json({ code: 400, message: '该收款账户已有交易记录，无法删除' })
    }
    
    // 软删除（设置is_active=0）
    await pool.query(
      'UPDATE payment_accounts SET is_active = 0 WHERE id = ?',
      [id]
    )
    
    res.json({ code: 0, message: '删除成功' })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 获取收款账户的收款明细
app.get('/api/payment-accounts/:id/transactions', async (req, res) => {
  try {
    const { id } = req.params
    const [rows] = await pool.query(`
      SELECT t.*, a.name as agent_name 
      FROM transactions t 
      LEFT JOIN agents a ON t.agent_id = a.id 
      WHERE t.payment_account_id = ? AND t.type = 'recharge' AND t.reason = 'payment'
      ORDER BY t.created_at DESC
    `, [id])
    
    const transactions = rows.map(row => ({
      id: row.id,
      agentId: row.agent_id,
      agentName: row.agent_name,
      amount: Number(row.amount),
      proof: row.proof,
      remark: row.remark,
      createdAt: row.created_at
    }))
    
    // 计算总收款金额
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0)
    
    res.json({ 
      code: 0, 
      message: 'OK', 
      data: { 
        transactions,
        summary: {
          totalCount: transactions.length,
          totalAmount
        }
      } 
    })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// ==================== 图片查重 API ====================
// 检查图片是否重复
app.post('/api/upload/check-duplicate', async (req, res) => {
  try {
    const { filename } = req.body
    const [rows] = await pool.query('SELECT * FROM upload_records WHERE filename = ?', [filename])
    
    if (rows.length > 0) {
      const record = rows[0]
      // 获取关联的代理商名称
      let agentName = ''
      if (record.agent_id) {
        const [[agent]] = await pool.query('SELECT name FROM agents WHERE id = ?', [record.agent_id])
        agentName = agent?.name || ''
      }
      
      res.json({ 
        code: 0, 
        message: 'OK', 
        data: { 
          isDuplicate: true,
          originalRecord: {
            uploadType: record.upload_type,
            agentName,
            createdAt: record.created_at
          }
        } 
      })
    } else {
      res.json({ code: 0, message: 'OK', data: { isDuplicate: false } })
    }
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 文件上传 API
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '没有上传文件' })
    }
    
    // 返回文件的访问URL
    const fileUrl = `/api/uploads/${req.file.filename}`
    res.json({ 
      code: 0, 
      message: '上传成功', 
      data: { 
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      } 
    })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 多文件上传 API
app.post('/api/upload/multiple', upload.array('files', 9), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ code: 400, message: '没有上传文件' })
    }
    
    const files = req.files.map(file => ({
      url: `/api/uploads/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size
    }))
    
    res.json({ 
      code: 0, 
      message: '上传成功', 
      data: { files } 
    })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 记录已上传图片
app.post('/api/upload/record', async (req, res) => {
  try {
    const { filename, uploadType, relatedId, agentId } = req.body
    const id = uuidv4()
    await pool.query(
      'INSERT INTO upload_records (id, filename, upload_type, related_id, agent_id) VALUES (?, ?, ?, ?, ?)',
      [id, filename, uploadType, relatedId, agentId]
    )
    res.json({ code: 0, message: '记录成功', data: { id } })
  } catch (error) {
    // 如果是重复键错误，返回特定提示
    if (error.code === 'ER_DUP_ENTRY') {
      res.json({ code: 409, message: '该图片已被上传过', data: { isDuplicate: true } })
    } else {
      res.status(500).json({ code: 500, message: error.message })
    }
  }
})

// ==================== 统计 API ====================
app.get('/api/statistics', async (req, res) => {
  try {
    // 获取所有产品
    const [products] = await pool.query('SELECT id, name FROM products')
    
    // 年度订单（不含赠品订单 is_gift=0 或 NULL）
    const [yearOrders] = await pool.query(`
      SELECT items FROM orders WHERE YEAR(created_at) = YEAR(CURDATE()) AND (is_gift = 0 OR is_gift IS NULL)
    `)
    
    // 近30天订单（不含赠品订单）
    const [last30DaysOrders] = await pool.query(`
      SELECT items FROM orders WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND (is_gift = 0 OR is_gift IS NULL)
    `)
    
    // 计算年度统计
    const productStats = {}
    let totalShipments = 0
    products.forEach(p => { productStats[p.id] = { productId: p.id, productName: p.name, quantity: 0 } })
    
    yearOrders.forEach(order => {
      const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
      if (Array.isArray(items)) {
        items.forEach(item => {
          const qty = Number(item.quantity) || 0
          totalShipments += qty
          if (productStats[item.productId]) {
            productStats[item.productId].quantity += qty
          }
        })
      }
    })
    
    // 计算近30天统计
    const last30DaysProductStats = {}
    let last30DaysShipments = 0
    products.forEach(p => { last30DaysProductStats[p.id] = { productId: p.id, productName: p.name, quantity: 0 } })
    
    last30DaysOrders.forEach(order => {
      const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
      if (Array.isArray(items)) {
        items.forEach(item => {
          const qty = Number(item.quantity) || 0
          last30DaysShipments += qty
          if (last30DaysProductStats[item.productId]) {
            last30DaysProductStats[item.productId].quantity += qty
          }
        })
      }
    })
    
    res.json({
      code: 0,
      message: 'OK',
      data: {
        totalShipments,
        last30DaysShipments,
        productStats: Object.values(productStats),
        last30DaysProductStats: Object.values(last30DaysProductStats)
      }
    })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 获取代理商统计（排除赠品，包含补充数据）
app.get('/api/agents/:id/statistics', async (req, res) => {
  try {
    const { id } = req.params
    
    // 获取代理商信息
    const [[agent]] = await pool.query('SELECT * FROM agents WHERE id = ?', [id])
    if (!agent) {
      return res.status(404).json({ code: 404, message: '代理商不存在' })
    }
    
    // 解析年度目标
    let yearlyTargets = {}
    if (agent.yearly_targets) {
      try {
        yearlyTargets = typeof agent.yearly_targets === 'string' ? JSON.parse(agent.yearly_targets) : agent.yearly_targets
      } catch {
        yearlyTargets = {}
      }
    }
    // 兼容旧数据：如果没有yearly_targets但有旧字段，迁移数据
    if (Object.keys(yearlyTargets).length === 0 && agent.target_product_a) {
      yearlyTargets = { p1: agent.target_product_a }
    }
    
    // 获取所有商品信息（用于获取商品名称）
    const [productsRows] = await pool.query('SELECT id, name FROM products')
    const productsMap = new Map(productsRows.map(p => [p.id, p.name]))
    
    // 获取所有产品组合信息（用于获取组合名称）
    const [groupsRows] = await pool.query('SELECT id, name, product_ids FROM product_groups')
    const groupsMap = new Map(groupsRows.map(g => [g.id, { name: g.name, productIds: parseJsonField(g.product_ids) }]))
    
    // 获取该代理的年度订单（排除赠品）
    const [orders] = await pool.query(`
      SELECT items, gift_items FROM orders 
      WHERE agent_id = ? AND YEAR(created_at) = YEAR(CURDATE()) AND (is_gift = 0 OR is_gift IS NULL)
    `, [id])
    
    // 获取该代理调出的数量（从transactions表中，reason='transfer_in'表示调货收入，即从自己调出给别人的数量）
    const [transferOuts] = await pool.query(`
      SELECT product_id, quantity FROM transactions 
      WHERE agent_id = ? AND type = 'recharge' AND reason = 'transfer_in' 
      AND YEAR(created_at) = YEAR(CURDATE()) 
      AND product_id IS NOT NULL AND quantity IS NOT NULL
    `, [id])
    
    // 获取补充数据（手动录入的销售数据，不影响余额）- 注意：补充数据仍然是product_type格式，需要兼容
    const [supplementData] = await pool.query(`
      SELECT product_type, quantity FROM supplement_sales 
      WHERE agent_id = ? AND YEAR(sale_date) = YEAR(CURDATE())
    `, [id])
    
    // 按商品ID统计完成量（排除赠品/搭赠）
    // 重要：搭赠（gift_items）不计入任务进度，只统计正常购买的商品（items）
    const completedByProduct = {}
    let totalGifts = 0 // 赠品总数，仅用于统计展示，不影响任务进度计算
    
    orders.forEach(order => {
      // 统计正常购买的商品（不含赠品/搭赠）- 这些会计入任务进度
      const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
      if (Array.isArray(items)) {
        items.forEach(item => {
          const qty = Number(item.quantity) || 0
          const productId = item.productId
          if (productId) {
            completedByProduct[productId] = (completedByProduct[productId] || 0) + qty
          }
        })
      }
      
      // 统计赠品数量（仅用于展示，不计入任务进度）
      // 注意：gift_items 中的商品不会添加到 completedByProduct，因此不会影响任务完成量
      const giftItems = order.gift_items ? 
        (typeof order.gift_items === 'string' ? JSON.parse(order.gift_items) : order.gift_items) : []
      if (Array.isArray(giftItems)) {
        giftItems.forEach(gift => {
          totalGifts += Number(gift.quantity) || 0
          // 这里只累加 totalGifts，不会添加到 completedByProduct，确保搭赠不计入任务
        })
      }
    })
    
    // 加上补充数据（兼容旧格式）
    supplementData.forEach(supplement => {
      const qty = Number(supplement.quantity) || 0
      // 兼容旧的product_type格式：productA -> p1, mixed -> 其他商品
      if (supplement.product_type === 'productA') {
        completedByProduct['p1'] = (completedByProduct['p1'] || 0) + qty
      } else if (supplement.product_type === 'mixed') {
        // mixed类型需要按实际商品分配，这里暂时不处理，因为新系统应该用productId
      }
    })
    
    // 扣除调出的数量（调货给别人，从完成量中扣除）
    transferOuts.forEach(transfer => {
      const qty = Number(transfer.quantity) || 0
      const productId = transfer.product_id
      if (productId) {
        completedByProduct[productId] = Math.max(0, (completedByProduct[productId] || 0) - qty)
      }
    })
    
    // 构建年度统计（支持单个目标和组合目标）
    const yearlyStats = {}
    const processedProducts = new Set() // 记录已处理的产品（避免组合中的产品重复计算）
    
    Object.keys(yearlyTargets).forEach(key => {
      const targetValue = yearlyTargets[key]
      
      // 检查是否是组合目标（key以_group_或group_开头，且值是对象）
      if ((key.startsWith('_group_') || key.startsWith('group_')) && typeof targetValue === 'object' && targetValue !== null && !Array.isArray(targetValue)) {
        const group = targetValue
        if (group.products && Array.isArray(group.products) && typeof group.target === 'number') {
          // 组合目标：计算所有产品的总完成量（合计，不使用processedProducts限制）
          const groupCompleted = group.products.reduce((sum, productId) => {
            return sum + (completedByProduct[productId] || 0)
          }, 0)
          
          const groupTarget = group.target
          
          // 优先使用产品组合名称，如果没有则使用产品名称拼接
          let displayName = ''
          if (group.groupId && groupsMap.has(group.groupId)) {
            // 使用产品组合的名称
            const groupData = groupsMap.get(group.groupId)
            displayName = groupData ? groupData.name : ''
          } else {
            // 使用产品名称拼接
            displayName = group.products.map(pid => productsMap.get(pid) || pid).join(' + ')
          }
          
          // 使用组合key作为统计key，但显示组合名称
          yearlyStats[key] = {
            target: groupTarget,
            completed: groupCompleted,
            percentage: groupTarget > 0 ? Math.round((groupCompleted / groupTarget) * 100) : 0,
            isGroup: true,
            products: group.products,
            productNames: displayName,
            groupId: group.groupId || null
          }
        }
      } else if (typeof targetValue === 'number') {
        // 单个产品目标
        const productId = key
        if (!processedProducts.has(productId)) {
          processedProducts.add(productId)
          const target = targetValue
          const completed = completedByProduct[productId] || 0
          yearlyStats[productId] = {
            target,
            completed,
            percentage: target > 0 ? Math.round((completed / target) * 100) : 0,
            isGroup: false
          }
        }
      }
    })
    
    res.json({
      code: 0,
      message: 'OK',
      data: {
        yearlyStats,
        totalGiftsReceived: totalGifts
      }
    })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// ==================== 数据补充 API ====================
// 补充销售数据（仅更新任务完成率，不影响余额）
app.post('/api/agents/:id/supplement-sales', async (req, res) => {
  try {
    const { id } = req.params
    const { productType, quantity, saleDate, remark } = req.body
    
    if (!productType || !quantity || quantity <= 0) {
      return res.json({ code: 400, message: '产品类型和数量不能为空' })
    }
    
    if (productType !== 'productA' && productType !== 'mixed') {
      return res.json({ code: 400, message: '产品类型必须是 productA 或 mixed' })
    }
    
    // 验证代理商存在
    const [[agent]] = await pool.query('SELECT id FROM agents WHERE id = ?', [id])
    if (!agent) {
      return res.status(404).json({ code: 404, message: '代理商不存在' })
    }
    
    const supplementId = uuidv4()
    const date = saleDate || new Date().toISOString().split('T')[0]
    
    await pool.query(
      'INSERT INTO supplement_sales (id, agent_id, product_type, quantity, sale_date, remark) VALUES (?, ?, ?, ?, ?, ?)',
      [supplementId, id, productType, quantity, date, remark || null]
    )
    
    res.json({ code: 0, message: '补充数据成功', data: { id: supplementId } })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 获取补充数据记录
app.get('/api/agents/:id/supplement-sales', async (req, res) => {
  try {
    const { id } = req.params
    const [rows] = await pool.query(
      'SELECT * FROM supplement_sales WHERE agent_id = ? ORDER BY sale_date DESC, created_at DESC',
      [id]
    )
    res.json({ code: 0, message: 'OK', data: rows })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 删除补充数据记录
app.delete('/api/supplement-sales/:id', async (req, res) => {
  try {
    const { id } = req.params
    await pool.query('DELETE FROM supplement_sales WHERE id = ?', [id])
    res.json({ code: 0, message: '删除成功' })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// ==================== 收款账户余额管理 API ====================
// 获取收款账户余额明细
app.get('/api/payment-accounts/:id/balance-details', async (req, res) => {
  try {
    const { id } = req.params
    
    // 获取账户信息
    const [[account]] = await pool.query('SELECT * FROM payment_accounts WHERE id = ?', [id])
    if (!account) {
      return res.status(404).json({ code: 404, message: '收款账户不存在' })
    }
    
    // 获取所有交易记录（收款和扣费）
    const [transactions] = await pool.query(`
      SELECT 
        t.id,
        t.type,
        t.reason,
        t.amount,
        t.remark,
        t.proof,
        t.created_at,
        a.name as agent_name,
        a.id as agent_id
      FROM transactions t
      LEFT JOIN agents a ON t.agent_id = a.id
      WHERE t.payment_account_id = ?
      ORDER BY t.created_at DESC
    `, [id])
    
    // 计算当前余额
    let balance = Number(account.balance || 0)
    transactions.forEach(tx => {
      balance += Number(tx.amount || 0)
    })
    
    res.json({
      code: 0,
      message: 'OK',
      data: {
        account: {
          id: account.id,
          name: account.name,
          balance: balance
        },
        transactions: transactions.map(tx => {
          // 处理凭证图片：支持字符串或JSON字符串（多图情况）
          let proofValue = tx.proof
          if (tx.proof && typeof tx.proof === 'string') {
            try {
              const parsed = JSON.parse(tx.proof)
              proofValue = parsed // 如果是JSON数组，使用解析后的数组；如果是单个字符串，保持原值
            } catch {
              // 不是JSON字符串，保持原字符串值
              proofValue = tx.proof
            }
          }
          
          return {
            id: tx.id,
            type: tx.type,
            reason: tx.reason,
            amount: Number(tx.amount),
            remark: tx.remark,
            proof: proofValue,
            agentId: tx.agent_id,
            agentName: tx.agent_name,
            createdAt: tx.created_at
          }
        })
      }
    })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 收款账户扣费
app.post('/api/payment-accounts/:id/deduct', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    
    const { id } = req.params
    const { amount, reason, remark } = req.body
    
    if (!amount || amount <= 0) {
      await conn.rollback()
      return res.json({ code: 400, message: '扣费金额必须大于0' })
    }
    
    // 获取账户信息
    const [[account]] = await conn.query('SELECT * FROM payment_accounts WHERE id = ?', [id])
    if (!account) {
      await conn.rollback()
      return res.status(404).json({ code: 404, message: '收款账户不存在' })
    }
    
    // 计算当前余额
    const [allTxs] = await conn.query(
      'SELECT SUM(amount) as total FROM transactions WHERE payment_account_id = ?',
      [id]
    )
    const currentBalance = Number(account.balance || 0) + Number(allTxs[0]?.total || 0)
    
    if (currentBalance < amount) {
      await conn.rollback()
      return res.json({ code: 400, message: '余额不足' })
    }
    
    // 记录扣费交易
    const txId = uuidv4()
    await conn.query(
      'INSERT INTO transactions (id, payment_account_id, type, reason, amount, remark) VALUES (?, ?, ?, ?, ?, ?)',
      [txId, id, 'deduct', reason || 'other', -amount, remark || null]
    )
    
    await conn.commit()
    res.json({ code: 0, message: '扣费成功', data: { id: txId } })
  } catch (error) {
    await conn.rollback()
    res.status(500).json({ code: 500, message: error.message })
  } finally {
    conn.release()
  }
})

// 更新收款账户余额（设置初始余额）
app.put('/api/payment-accounts/:id/balance', async (req, res) => {
  try {
    const { id } = req.params
    const { balance } = req.body
    
    await pool.query('UPDATE payment_accounts SET balance = ? WHERE id = ?', [balance || 0, id])
    res.json({ code: 0, message: '更新成功' })
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message })
  }
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Nomur API 服务器运行在 http://localhost:${PORT}`)
})

