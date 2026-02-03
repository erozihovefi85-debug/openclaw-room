#!/bin/bash
# ============================================
# ProcureAI 镜像导入脚本
# 用途: 在云端服务器上加载导出的 Docker 镜像
# ============================================

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  ProcureAI 镜像导入工具${NC}"
echo -e "${YELLOW}========================================${NC}"

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}错误: Docker 未运行，请先启动 Docker${NC}"
    exit 1
fi

# 获取镜像文件目录
IMAGE_DIR=${1:-"./docker-images"}

if [ ! -d "$IMAGE_DIR" ]; then
    echo -e "${RED}错误: 镜像目录不存在: $IMAGE_DIR${NC}"
    echo "请先上传镜像文件到服务器"
    exit 1
fi

echo -e "\n${GREEN}[1/2] 加载前端镜像...${NC}"
FRONTEND_FILE=$(find "$IMAGE_DIR" -name "procureai-frontend-*.tar.gz" | head -1)
if [ -z "$FRONTEND_FILE" ]; then
    echo -e "${RED}错误: 未找到前端镜像文件${NC}"
    exit 1
fi
gunzip -c "$FRONTEND_FILE" | docker load
echo "✓ 前端镜像加载完成"

echo -e "\n${GREEN}[2/2] 加载后端镜像...${NC}"
BACKEND_FILE=$(find "$IMAGE_DIR" -name "procureai-backend-*.tar.gz" | head -1)
if [ -z "$BACKEND_FILE" ]; then
    echo -e "${RED}错误: 未找到后端镜像文件${NC}"
    exit 1
fi
gunzip -c "$BACKEND_FILE" | docker load
echo "✓ 后端镜像加载完成"

# 显示已加载的镜像
echo -e "\n${YELLOW}已加载的镜像:${NC}"
docker images | grep procureai

echo -e "\n${GREEN}镜像导入完成！${NC}"

# 检查是否有 docker-compose.yml
if [ -f "docker-compose.yml" ]; then
    echo -e "\n${YELLOW}启动服务...${NC}"
    docker compose up -d

    echo -e "\n${GREEN}服务已启动！${NC}"
    echo "查看状态: docker compose ps"
    echo "查看日志: docker compose logs -f"
else
    echo -e "\n${YELLOW}提示: 请确保项目目录中有 docker-compose.yml 文件${NC}"
fi
