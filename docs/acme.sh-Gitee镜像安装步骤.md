# acme.sh 使用 Gitee 镜像安装步骤

## 问题说明

由于国内服务器访问 GitHub 网络不通畅，可以使用 Gitee 镜像源安装 acme.sh。

## 安装步骤

### 1. 克隆 acme.sh 仓库

```bash
# 克隆 Gitee 镜像仓库
git clone https://gitee.com/neilpang/acme.sh.git ~/.acme.sh
```

### 2. 进入目录并安装

```bash
# 进入 acme.sh 目录
cd ~/.acme.sh

# 执行安装脚本
./acme.sh --install
```

### 3. 配置环境变量

```bash
# 重新加载 shell 配置
source ~/.bashrc
# 或者
source ~/.profile

# 如果上面命令无效，可以手动添加到 PATH
echo 'export PATH="$HOME/.acme.sh:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### 4. 验证安装

```bash
# 检查 acme.sh 是否可用
~/.acme.sh/acme.sh --version

# 或者
acme.sh --version
```

### 5. 设置邮箱（可选但推荐）

```bash
# 设置默认邮箱（用于证书到期提醒）
~/.acme.sh/acme.sh --register-account -m admin@100nomur.net
```

## 完整安装命令（一键执行）

```bash
# 克隆仓库
git clone https://gitee.com/neilpang/acme.sh.git ~/.acme.sh

# 进入目录
cd ~/.acme.sh

# 安装
./acme.sh --install

# 添加到 PATH（如果还没有）
echo 'export PATH="$HOME/.acme.sh:$PATH"' >> ~/.bashrc
source ~/.bashrc

# 验证安装
~/.acme.sh/acme.sh --version
```

## 后续步骤

安装完成后，继续执行证书申请：

```bash
# 申请证书（需要先停止 Nginx）
sudo systemctl stop nginx

# 申请证书
~/.acme.sh/acme.sh --issue -d 100nomur.net -d www.100nomur.net --standalone

# 启动 Nginx
sudo systemctl start nginx

# 安装证书到 Nginx
sudo mkdir -p /etc/nginx/ssl
~/.acme.sh/acme.sh --install-cert -d 100nomur.net \
  --key-file /etc/nginx/ssl/100nomur.net.key \
  --fullchain-file /etc/nginx/ssl/100nomur.net.pem \
  --reloadcmd "systemctl reload nginx"
```

## 注意事项

1. 如果 `~/.acme.sh` 目录已存在，先删除：
   ```bash
   rm -rf ~/.acme.sh
   ```

2. 如果安装后无法使用 `acme.sh` 命令，使用完整路径：
   ```bash
   ~/.acme.sh/acme.sh --version
   ```

3. Gitee 镜像可能更新不及时，如果遇到问题，可以尝试：
   - 使用官方 GitHub 源（如果网络允许）
   - 或者手动从 GitHub 下载最新版本

