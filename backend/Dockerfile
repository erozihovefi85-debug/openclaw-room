# ==========================================
# 后端 Dockerfile
# ==========================================

FROM node:18-alpine

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY src ./src

# 设置环境变量
ENV NODE_ENV=production \
    PORT=3001 \
    MONGODB_URI=mongodb://mongodb:27017/procureai \
    JWT_SECRET=your-super-secret-jwt-key-change-this-in-production \
    DIFY_API_BASE=https://api.dify.ai/v1

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nodejs && \
    mkdir -p uploads && \
    chown -R nodejs:nodejs /app

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api', (r) => { if (r.statusCode !== 200) throw new Error('Health check failed') })"

# 启动应用
CMD ["node", "src/index.js"]
