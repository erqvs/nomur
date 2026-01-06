# Nomur 微商管理系统

基于 uni-app + Vue3 + TypeScript 的微商代理管理小程序。

## 功能特性

### 管理端功能
- 📊 **数据驾驶舱** - 年度/月度发货统计、代理列表概览
- 📦 **商品管理** - 商品CRUD、素材库管理
- 👥 **代理管理** - 代理信息、年度目标设置
- 📝 **极速开单** - 勾选式操作、实时计算、自动赠品
- 💰 **财务管理** - 充值、扣款、调货（原子操作）

### 代理端功能
- 📈 **业绩看板** - 年度任务进度、促销进度
- 💵 **余额明细** - 收支记录查询
- 🎁 **促销查询** - 活动规则、个人进度

## 技术栈

- **框架**: uni-app (Vue 3.x)
- **语言**: TypeScript
- **状态管理**: Pinia
- **样式**: SCSS + CSS Variables
- **构建工具**: Vite

## 项目结构

```
src/
├── components/          # 公共组件
│   ├── TagSelect/       # 标签选择（替代下拉菜单）
│   ├── ImageUploader/   # 图片上传
│   ├── BalanceCard/     # 余额卡片
│   └── QuickInput/      # 快捷输入
├── pages/
│   ├── admin/           # 管理端页面
│   │   ├── dashboard/   # 数据驾驶舱
│   │   ├── products/    # 商品管理
│   │   ├── agents/      # 代理管理
│   │   ├── orders/      # 极速开单
│   │   └── finance/     # 财务管理
│   └── agent/           # 代理端页面
│       ├── home/        # 业绩首页
│       ├── balance/     # 余额明细
│       └── promotions/  # 促销查询
├── stores/              # Pinia 状态管理
├── types/               # TypeScript 类型定义
├── utils/               # 工具函数
├── styles/              # 全局样式
└── static/              # 静态资源
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发调试

```bash
# H5 端
npm run dev:h5

# 微信小程序
npm run dev:mp-weixin
```

### 构建发布

```bash
# H5 端
npm run build:h5

# 微信小程序
npm run build:mp-weixin
```

## 设计规范

### 交互原则
- ❌ 禁止下拉菜单，使用平铺勾选
- ✅ 大触控区域，适合移动端
- ✅ 实时计算，毫秒级响应
- ✅ 减少输入，多用选择

### 颜色规范
- 主色: `#1890FF`
- 成功: `#52C41A`
- 警告: `#FAAD14`
- 危险: `#FF4D4F`
- 背景: `#F5F7FA`

## 核心业务逻辑

### 余额系统
- 支持负数余额（欠款状态）
- 充值原因：赠送、代理打款
- 扣款原因：发货、罚款、调货

### 调货逻辑
```
A代理发货给B代理：
1. 公司退款给A (+amount)
2. 公司从B扣款 (-amount)
使用事务确保原子操作
```

### 促销活动
- 规则：每满N件赠送指定商品
- 代理可查询：已购数量、已获赠品

## License

MIT

