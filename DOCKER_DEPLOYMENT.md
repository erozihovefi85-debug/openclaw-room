# Docker 部署指南

本指南将帮助您使用 Docker 和 Docker Compose 部署 ProcureAI 应用。

---

## 📋 前置要求

### 必需软件
- **Docker**: >= 20.10.0
- **Docker Compose**: >= 2.0.0
- **Git**: 用于克隆代码仓库

### 验证安装
```bash
docker --version
docker-compose --version
git --version
```

---

## 🚀 快速部署

### 1. 克隆代码仓库

```bash
git clone <repository-url>
cd procureai0111
```

### 2. 配置环境变量

复制并编辑环境变量文件：

```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

编辑 `.env` 文件，设置以下关键配置：

```bash
# JWT 密钥（必须修改！）
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-to-min-32-characters

# Dify API Keys
DIFY_API_KEY_CASUAL=your-dify-api-key-casual
DIFY_API_KEY_KEYWORD=your-dify-api-key-keyword
DIFY_API_KEY_DOCGEN=your-dify-api-key-docgen
DIFY_API_KEY_SUPPLIER=your-dify-api-key-supplier
DIFY_API_KEY_PRICE=your-dify-api-key-price

# SiliconFlow API Key（用于需求清单提取）
SILICONFLOW_API_KEY=your-siliconflow-api-key

# CORS 配置（生产环境需要修改）
CORS_ORIGIN=https://your-domain.com
```

### 3. 构建并启动服务

```bash
# 构建并启动所有服务
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 查看服务状态
docker-compose ps
```

### 4. 访问应用

- **前端**: http://localhost
- **后端 API**: http://localhost:3001/api
- **MongoDB**: localhost:27017

---

## 📦 部署架构

### 服务说明

| 服务 | 容器名 | 端口 | 说明 |
|------|--------|------|------|
| **前端** | procureai-frontend | 80, 443 | Nginx 静态文件服务 |
| **后端** | procureai-backend | 3001 | Node.js API 服务 |
| **数据库** | procureai-mongodb | 27017 | MongoDB 数据库 |

### 网络架构

所有服务运行在 `procureai-network` 桥接网络中，确保服务间可以相互通信。

---

## 🔧 常用命令

### 启动服务

```bash
# 启动所有服务
docker-compose up -d

# 启动特定服务
docker-compose up -d backend
```

### 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止特定服务
docker-compose stop backend
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
```

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f mongodb

# 查看最近 100 行日志
docker-compose logs --tail=100 backend
```

### 进入容器

```bash
# 进入后端容器
docker-compose exec backend sh

# 进入数据库容器
docker-compose exec mongodb mongosh

# 进入前端容器
docker-compose exec frontend sh
```

### 更新服务

```bash
# 重新构建并启动
docker-compose up -d --build

# 仅重新构建后端
docker-compose up -d --build backend
```

---

## 🔐 生产环境部署

### 1. 修改 JWT_SECRET

```bash
# 生成强随机密钥
openssl rand -base64 32
```

将生成的密钥设置为 `JWT_SECRET` 环境变量。

### 2. 配置 HTTPS

**选项 A：使用 Nginx 反向代理**

在宿主机上安装 Nginx，配置如下：

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-ForwardedFor $proxy_add_x_forwarded_for;
        proxy_set_header X-ForwardedProto $scheme;
    }
}
```

**选项 B：在容器内配置 HTTPS**

取消 `nginx.conf` 中 HTTPS 配置的注释，并挂载证书：

```yaml
frontend:
  volumes:
    - ./certs:/etc/nginx/certs:ro
```

### 3. 环境变量配置

创建生产环境配置文件 `.env.production`：

```bash
# 生产环境配置
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com
JWT_SECRET=<your-very-secure-secret>
```

更新 `docker-compose.yml`：

```yaml
frontend:
  env_file:
    - .env.production
  environment:
    VITE_API_URL: https://your-domain.com/api

backend:
  env_file:
    - .env.production
```

### 4. 数据持久化

确保使用命名卷或绑定挂载：

```yaml
volumes:
  mongodb_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /path/to/host/mongodb
```

### 5. 资源限制

限制资源使用：

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

---

## 🐛 故障排查

### 服务启动失败

```bash
# 查看服务状态
docker-compose ps

# 查看服务日志
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb
```

### 端口冲突

如果端口被占用，修改 `docker-compose.yml` 中的端口映射：

```yaml
services:
  backend:
    ports:
      - "3002:3001"  # 修改外部端口
```

### 数据库连接失败

```bash
# 检查 MongoDB 状态
docker-compose exec mongodb mongosh

# 查看数据库
show dbs
use procureai
db.users.find()
```

### 构建失败

```bash
# 清理旧镜像
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

---

## 📊 监控和维护

### 健康检查

```bash
# 检查所有服务健康状态
docker-compose ps

# 检查服务日志
docker-compose logs -f --tail=50
```

### 数据备份

```bash
# 备份 MongoDB 数据
docker-compose exec mongodb mongodump --db procureai --out /data/backup/

# 备份上传文件
docker run --rm -v $(pwd)/uploads:/backup -v procureai-mongodb_data:/data alpine tar czf /backup/backup-$(date +%Y%m%d).tar.gz /data
```

### 日志管理

```bash
# 清理日志（定期执行）
docker-compose exec backend sh -c "truncate -s 0 /proc/*/fd/1"

# 查看日志大小
docker-compose exec backend du -sh /app/logs
```

---

## 🔧 开发环境

### 本地开发

使用本地开发的配置：

```bash
# 仅启动数据库
docker-compose up -d mongodb

# 本地运行前端
npm run dev

# 本地运行后端
cd backend
npm run dev
```

### 数据库连接

```bash
# 连接到 MongoDB
docker-compose exec mongodb mongosh

# 连接字符串
mongodb://admin:admin123@localhost:27017
```

---

## 📈 扩展部署

### 水平扩展

```bash
# 扩展后端服务实例
docker-compose up -d --scale backend=3
```

### 负载均衡

使用 Nginx 或 Traefik 进行负载均衡。

---

## 📝 注意事项

1. **安全性**
   - 生产环境必须修改所有默认密码
   - 使用强 JWT 密钥
   - 配置防火墙规则
   - 定期更新镜像

2. **性能优化**
   - 根据负载调整资源限制
   - 启用 Nginx 缓存
   - 配置 MongoDB 副本集

3. **数据备份**
   - 定期备份 MongoDB 数据
   - 备份用户上传文件
   - 备份配置文件

4. **监控告警**
   - 配置日志监控
   - 设置资源使用告警
   - 配置自动重启策略

---

## 🆘 支持

如遇到问题，请检查：

1. Docker 和 Docker Compose 版本
2. 端口占用情况
3. 环境变量配置
4. 防火墙设置
5. 日志输出信息

**部署文档版本**: v1.0.0
**最后更新**: 2026-01-20
