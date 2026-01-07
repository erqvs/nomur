# acme.sh 安装和 SSL 证书配置步骤

## 第一步：安装 acme.sh

在服务器上执行以下命令：

```bash
# 安装 acme.sh（会自动安装到 ~/.acme.sh/）
curl https://get.acme.sh | sh

# 重新加载 shell 配置，或重新登录
source ~/.bashrc
# 或者
source ~/.profile
```

验证安装：
```bash
~/.acme.sh/acme.sh --version
```

## 第二步：申请 SSL 证书

### 方式一：HTTP 验证（推荐，最简单）

**前提条件**：确保 80 端口可以访问，域名解析已生效。

```bash
# 申请证书（会自动验证域名所有权）
~/.acme.sh/acme.sh --issue -d 100nomur.net -d www.100nomur.net --standalone

# 等待验证完成，通常需要几秒钟到几分钟
```

### 方式二：DNS 验证（如果 80 端口无法访问）

如果使用阿里云 DNS：
```bash
export Ali_Key="你的阿里云AccessKey"
export Ali_Secret="你的阿里云AccessSecret"
~/.acme.sh/acme.sh --issue -d 100nomur.net -d www.100nomur.net --dns dns_ali
```

如果使用其他 DNS 服务商，请参考 acme.sh 文档：
```bash
~/.acme.sh/acme.sh --issue --dns -d 100nomur.net -d www.100nomur.net
```

## 第三步：安装证书到 Nginx

证书申请成功后，安装到 Nginx：

```bash
# 创建 SSL 证书目录（如果不存在）
sudo mkdir -p /etc/nginx/ssl

# 安装证书
~/.acme.sh/acme.sh --install-cert -d 100nomur.net \
  --key-file /etc/nginx/ssl/100nomur.net.key \
  --fullchain-file /etc/nginx/ssl/100nomur.net.pem \
  --reloadcmd "systemctl reload nginx"
```

## 第四步：配置 Nginx 启用 HTTPS

编辑 Nginx 配置文件：
```bash
sudo nano /etc/nginx/sites-available/nomur
```

需要做以下修改：

1. **取消注释 HTTPS 服务器块**（找到被注释的 `server { listen 443 ... }` 部分，取消注释）

2. **修改 HTTP 服务器块**，添加重定向：
   ```nginx
   server {
       listen 80;
       listen [::]:80;
       server_name 100nomur.net www.100nomur.net;
       
       # 重定向到 HTTPS
       return 301 https://$server_name$request_uri;
   }
   ```

3. **确保 HTTPS 服务器块中的证书路径正确**：
   ```nginx
   ssl_certificate /etc/nginx/ssl/100nomur.net.pem;
   ssl_certificate_key /etc/nginx/ssl/100nomur.net.key;
   ```

## 第五步：测试并重新加载 Nginx

```bash
# 测试配置
sudo nginx -t

# 如果测试通过，重新加载 Nginx
sudo systemctl reload nginx
```

## 第六步：验证 HTTPS

访问以下地址验证：
- https://100nomur.net
- https://www.100nomur.net
- https://100nomur.net/api/health

## 证书自动续期

acme.sh 会自动配置证书续期，证书每 60 天自动更新一次。

查看证书列表：
```bash
~/.acme.sh/acme.sh --list
```

查看证书详细信息：
```bash
~/.acme.sh/acme.sh --info -d 100nomur.net
```

## 常见问题

### 1. 证书申请失败：域名验证失败
- 检查域名 DNS 解析是否正确
- 确保 80 端口可以访问（HTTP 验证方式）
- 检查防火墙是否开放 80 端口

### 2. 证书安装失败：权限不足
- 确保使用 sudo 执行安装命令
- 检查 /etc/nginx/ssl 目录权限

### 3. Nginx 配置测试失败
- 检查证书文件路径是否正确
- 检查证书文件是否存在
- 查看错误日志：`sudo tail -f /var/log/nginx/error.log`

## 完成后的检查清单

- [ ] acme.sh 已安装
- [ ] SSL 证书已申请成功
- [ ] 证书已安装到 /etc/nginx/ssl/
- [ ] Nginx 配置已启用 HTTPS
- [ ] HTTP 已重定向到 HTTPS
- [ ] HTTPS 访问正常
- [ ] API 接口可通过 HTTPS 访问

