# ProcureAI 云端部署指南

本文档介绍如何将 ProcureAI 项目部署到云端服务器。

## 目录

- [部署架构](#部署架构)
- [前置要求](#前置要求)
- [环境变量配置](#环境变量配置)
- [部署方式](#部署方式)
  - [Docker Compose 部署](#docker-compose-部署)
  - [Kubernetes 部署](#kubernetes-部署)
  - [云平台一键部署](#云平台一键部署)
- [运维管理](#运维管理)
- [故障排查](#故障排查)

---

## 部署架构

```
┌─────────────────┐
│   Nginx (80)    │  前端静态资源服务
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
┌────────▼────────┐  ┌────▼─────────────────┐
│  Frontend (80)  │  │  Backend (3001)      │
│  React + Vite   │  │  Node.js + Express   │
└─────────────────┘  └────┬─────────────────┘
                          │
                   ┌──────▼─────────┐
                   │  MongoDB (27017)│
                   │  数据持久化      │
                   └─────────────────┘
```

---

## 前置要求

### 服务器配置

- **操作系统**: Linux (Ubuntu 20.04+ / CentOS 8+)
- **CPU**: 2 核心以上
- **内存**: 4GB 以上
- **磁盘**: 20GB 以上可用空间

### 软件要求

- Docker 20.10+
- Docker Compose 2.0+

### 检查安装

```bash
# 检查 Docker
docker --version
docker compose version

# 如未安装 Docker
curl -fsSL https://get.docker.com | sh

# 添加当前用户到 docker 组
sudo usermod -aG docker $USER
newgrp docker
```

---

## 环境变量配置

创建 `.env` 文件在项目根目录:

```bash
# 复制模板
cp .env.example .env

# 编辑配置
vi .env
```

### 必需配置项

```env
# JWT 密钥 (必须修改为随机字符串)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-12345

# Dify API Keys
DIFY_API_KEY_CASUAL=app-xxxxxxxxxxxx
DIFY_API_KEY_KEYWORD=app-xxxxxxxxxxxx
DIFY_API_KEY_DOCGEN=app-xxxxxxxxxxxx
DIFY_API_KEY_SUPPLIER=app-xxxxxxxxxxxx
DIFY_API_KEY_PRICE=app-xxxxxxxxxxxx

# SiliconFlow API Key
SILICONFLOW_API_KEY=sk-xxxxxxxxxxxx

# 域名配置 (生产环境)
CORS_ORIGIN=https://your-domain.com
VITE_API_URL=https://your-domain.com/api
```

### 可选配置项

```env
# MongoDB 配置 (使用默认值即可)
MONGODB_URI=mongodb://admin:admin123@mongodb:27017/procureai?authSource=admin

# 管理员账号
ADMIN_EMAIL=admin@procureai.com
ADMIN_PASSWORD=admin123

# 文件上传限制 (字节)
MAX_FILE_SIZE=10485760
```

---

## 部署方式

### Docker Compose 部署 (推荐)

适用于单服务器部署。

#### 1. 克隆代码

```bash
# 克隆项目
git clone https://github.com/your-username/procureai.git
cd procureai
```

#### 2. 配置环境变量

```bash
# 创建 .env 文件
cat > .env << EOF
JWT_SECRET=$(openssl rand -hex 32)
DIFY_API_KEY_CASUAL=your-dify-api-key
DIFY_API_KEY_KEYWORD=your-dify-api-key
DIFY_API_KEY_DOCGEN=your-dify-api-key
DIFY_API_KEY_SUPPLIER=your-dify-api-key
DIFY_API_KEY_PRICE=your-dify-api-key
SILICONFLOW_API_KEY=your-siliconflow-api-key
CORS_ORIGIN=https://your-domain.com
VITE_API_URL=https://your-domain.com/api
EOF
```

#### 3. 构建并启动

```bash
# 构建镜像
docker compose build

# 启动服务
docker compose up -d

# 查看状态
docker compose ps
docker compose logs -f
```

#### 4. 验证部署

```bash
# 检查健康状态
curl http://localhost/api

# 查看所有容器
docker ps
```

---

### Kubernetes 部署

适用于集群环境和高可用部署。

#### 1. 创建 Kubernetes 配置

在项目根目录创建 `k8s/` 目录:

```bash
mkdir -p k8s/
```

#### 2. 部署 MongoDB

```bash
kubectl apply -f k8s/mongodb-deployment.yaml
kubectl apply -f k8s/mongodb-service.yaml
kubectl apply -f k8s/mongodb-pvc.yaml
```

#### 3. 部署后端

```bash
# 创建 ConfigMap
kubectl apply -f k8s/backend-configmap.yaml

# 创建 Secret
kubectl create secret generic procureai-secrets \
  --from-literal=jwt-secret=$(openssl rand -hex 32) \
  --from-literal=dify-api-key=your-dify-key \
  --from-literal=siliconflow-api-key=your-sf-key

# 部署
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml
```

#### 4. 部署前端

```bash
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml
```

#### 5. 配置 Ingress

```bash
kubectl apply -f k8s/ingress.yaml
```

---

### 云平台一键部署

#### 阿里云/腾讯云/AWS 使用 Docker Compose

```bash
# 连接服务器
ssh root@your-server-ip

# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 克隆项目
git clone https://github.com/your-username/procureai.git
cd procureai

# 配置环境变量
vi .env

# 启动
docker compose up -d
```

#### 使用云平台容器服务

**阿里云 ACK (Container Service for Kubernetes)**

1. 创建 Kubernetes 集群
2. 使用镜像推送到阿里云容器镜像服务
3. 使用 kubectl 部署

**腾讯云 TKE (Tencent Kubernetes Engine)**

1. 创建 TKE 集群
2. 推送镜像到腾讯云容器镜像服务
3. 使用 kubectl 部署

**华为云 CCE (Cloud Container Engine)**

1. 创建 CCE 集群
2. 推送镜像到 SWR 容器镜像服务
3. 使用 kubectl 部署

---

## 运维管理

### 日常操作

```bash
# 查看日志
docker compose logs -f backend
docker compose logs -f frontend

# 重启服务
docker compose restart backend

# 更新代码
git pull
docker compose up -d --build

# 停止服务
docker compose down

# 清理数据 (谨慎!)
docker compose down -v
```

### 数据备份

```bash
# MongoDB 备份
docker exec procureai-mongodb mongodump \
  --uri="mongodb://admin:admin123@localhost:27017/procureai?authSource=admin" \
  --archive=/data/backup/procureai-$(date +%Y%m%d).tar.gz

# 从备份恢复
docker exec procureai-mongodb mongorestore \
  --uri="mongodb://admin:admin123@localhost:27017/procureai?authSource=admin" \
  --archive=/data/backup/procureai-20240101.tar.gz
```

### 监控

```bash
# 容器资源监控
docker stats

# 磁盘使用
df -h

# 日志大小
du -sh /var/lib/docker/containers/*
```

---

## 故障排查

### 常见问题

#### 1. 容器启动失败

```bash
# 查看详细日志
docker compose logs backend

# 检查端口占用
netstat -tlnp | grep :3001
```

#### 2. 数据库连接失败

```bash
# 检查 MongoDB 容器
docker exec procureai-mongodb mongosh \
  "mongodb://admin:admin123@localhost:27017/procureai?authSource=admin"

# 检查网络连接
docker network inspect procureai-network
```

#### 3. 前端无法访问后端

- 检查 CORS_ORIGIN 配置
- 检查 VITE_API_URL 配置
- 验证后端健康检查: `curl http://localhost:3001/api`

#### 4. 文件上传失败

- 检查 uploads 目录权限
- 验证 MAX_FILE_SIZE 配置

---

## 安全建议

1. **修改默认密码**: 修改 MongoDB 和管理员密码
2. **配置 HTTPS**: 使用 Let's Encrypt 配置 SSL
3. **限制访问**: 使用防火墙限制端口访问
4. **定期备份**: 设置自动备份任务
5. **监控日志**: 配置日志监控和告警

---

## 更新日志

- **2024-01**: 初始版本
- 支持 Docker Compose 和 Kubernetes 部署
- 添加云平台部署指南

---

## 技术支持

如有问题,请联系: support@procureai.com
