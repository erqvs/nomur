# npm 镜像源配置指南

## 问题说明

在国内服务器上，npm 默认使用官方源（registry.npmjs.org），下载速度很慢。配置国内镜像源可以大幅提升下载速度。

## 配置方法

### 方法一：使用淘宝镜像（推荐）

```bash
# 设置淘宝镜像
npm config set registry https://registry.npmmirror.com

# 验证配置
npm config get registry
```

### 方法二：使用腾讯云镜像

```bash
npm config set registry https://mirrors.cloud.tencent.com/npm/
```

### 方法三：使用华为云镜像

```bash
npm config set registry https://repo.huaweicloud.com/repository/npm/
```

## 临时使用镜像（不修改配置）

如果只想临时使用镜像，可以在安装时指定：

```bash
npm install --registry=https://registry.npmmirror.com
```

## 恢复官方源

如果需要恢复官方源：

```bash
npm config set registry https://registry.npmjs.org
```

## 查看当前配置

```bash
# 查看所有配置
npm config list

# 查看镜像源
npm config get registry
```

## 其他 npm 镜像源

- **淘宝镜像**：https://registry.npmmirror.com（原 registry.npm.taobao.org）
- **腾讯云镜像**：https://mirrors.cloud.tencent.com/npm/
- **华为云镜像**：https://repo.huaweicloud.com/repository/npm/
- **cnpm**：https://cnpmjs.org/

## 注意事项

1. 淘宝镜像已迁移到新域名 `registry.npmmirror.com`，旧域名 `registry.npm.taobao.org` 已停止服务
2. 配置后，所有 npm 命令都会使用新镜像源
3. 如果遇到某些包下载问题，可以临时切换回官方源

