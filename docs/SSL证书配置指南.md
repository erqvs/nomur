# SSL 证书配置指南

## 概述

小程序要求所有请求必须使用 HTTPS，因此需要为域名 `100nomur.net` 配置 SSL 证书。

## 方案一：使用 acme.sh 自动申请 Let's Encrypt 证书（推荐）

### 1. 安装 acme.sh

```bash
curl https://get.acme.sh | sh
source ~/.bashrc  # 或重新登录
```

### 2. 申请证书（HTTP 验证方式）

```bash
# 申请证书（需要确保 80 端口可访问）
~/.acme.sh/acme.sh --issue -d 100nomur.net -d www.100nomur.net --standalone

# 安装证书到 Nginx
~/.acme.sh/acme.sh --install-cert -d 100nomur.net \
  --key-file /etc/nginx/ssl/100nomur.net.key \
  --fullchain-file /etc/nginx/ssl/100nomur.net.pem \
  --reloadcmd "systemctl reload nginx"
```

### 3. 配置 Nginx 启用 HTTPS

编辑 `/etc/nginx/sites-available/nomur`，取消注释 HTTPS 服务器块，并注释掉 HTTP 服务器块中的 location 配置，启用重定向：

```nginx
# HTTP 服务器 - 重定向到 HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name 100nomur.net www.100nomur.net;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS 服务器
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name 100nomur.net www.100nomur.net;
    
    # SSL 证书配置
    ssl_certificate /etc/nginx/ssl/100nomur.net.pem;
    ssl_certificate_key /etc/nginx/ssl/100nomur.net.key;
    
    # ... 其他配置
}
```

### 4. 重新加载 Nginx

```bash
sudo nginx -t  # 测试配置
sudo systemctl reload nginx  # 重新加载
```

## 方案二：使用 DNS 验证（无需开放 80 端口）

如果 80 端口无法访问，可以使用 DNS 验证方式：

```bash
# 使用 DNS 验证（需要配置 DNS API）
# 以阿里云为例
export Ali_Key="your_ali_key"
export Ali_Secret="your_ali_secret"
~/.acme.sh/acme.sh --issue -d 100nomur.net -d www.100nomur.net --dns dns_ali

# 安装证书
~/.acme.sh/acme.sh --install-cert -d 100nomur.net \
  --key-file /etc/nginx/ssl/100nomur.net.key \
  --fullchain-file /etc/nginx/ssl/100nomur.net.pem \
  --reloadcmd "systemctl reload nginx"
```

## 方案三：使用云服务商免费证书

### 腾讯云
1. 登录腾讯云控制台
2. 进入「SSL 证书」->「免费证书」
3. 申请免费证书，填写域名 `100nomur.net` 和 `www.100nomur.net`
4. 验证域名后下载证书
5. 上传证书文件到服务器 `/etc/nginx/ssl/` 目录

### 阿里云
1. 登录阿里云控制台
2. 进入「数字证书管理服务」->「免费证书」
3. 申请免费证书
4. 验证域名后下载证书
5. 上传证书文件到服务器

## 证书自动续期

acme.sh 会自动配置证书续期，证书每 60 天自动更新一次。

查看证书信息：
```bash
~/.acme.sh/acme.sh --list
```

## 验证 HTTPS 配置

配置完成后，访问以下地址验证：
- https://100nomur.net
- https://www.100nomur.net
- https://100nomur.net/api/health

## 小程序配置

在小程序管理后台配置：
- **服务器域名**：`https://100nomur.net`
- **request合法域名**：`https://100nomur.net`
- **uploadFile合法域名**：`https://100nomur.net`
- **downloadFile合法域名**：`https://100nomur.net`

## 注意事项

1. 确保防火墙已开放 80 和 443 端口
2. 确保域名 DNS 解析已正确配置
3. Let's Encrypt 证书有效期为 90 天，acme.sh 会自动续期
4. 如果使用云服务商证书，需要手动续期

