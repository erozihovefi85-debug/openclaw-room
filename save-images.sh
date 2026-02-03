#!/bin/bash
# ============================================
# ProcureAI 镜像导出脚本
# 用途: 将构建好的 Docker 镜像导出为 tar 文件，便于传输到云端服务器
# ============================================

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  ProcureAI 镜像导出工具${NC}"
echo -e "${YELLOW}========================================${NC}"

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "错误: Docker 未运行，请先启动 Docker"
    exit 1
fi

# 设置镜像名称和标签
FRONTEND_IMAGE="procureai-frontend"
BACKEND_IMAGE="procureai-backend"
VERSION=${1:-latest}

# 创建输出目录
OUTPUT_DIR="./docker-images"
mkdir -p "$OUTPUT_DIR"

echo -e "\n${GREEN}[1/3] 构建 Docker 镜像...${NC}"
docker compose build

echo -e "\n${GREEN}[2/3] 导出前端镜像...${NC}"
docker save "${FRONTEND_IMAGE}:${VERSION}" | gzip > "${OUTPUT_DIR}/${FRONTEND_IMAGE}-${VERSION}.tar.gz"
echo "✓ 前端镜像已保存: ${OUTPUT_DIR}/${FRONTEND_IMAGE}-${VERSION}.tar.gz"

echo -e "\n${GREEN}[3/3] 导出后端镜像...${NC}"
docker save "${BACKEND_IMAGE}:${VERSION}" | gzip > "${OUTPUT_DIR}/${BACKEND_IMAGE}-${VERSION}.tar.gz"
echo "✓ 后端镜像已保存: ${OUTPUT_DIR}/${BACKEND_IMAGE}-${VERSION}.tar.gz"

# 显示文件大小
echo -e "\n${YELLOW}导出完成！文件列表:${NC}"
ls -lh "$OUTPUT_DIR"

# 显示文件总大小
TOTAL_SIZE=$(du -sh "$OUTPUT_DIR" | cut -f1)
echo -e "\n${GREEN}总大小: $TOTAL_SIZE${NC}"

echo -e "\n${YELLOW}传输命令示例:${NC}"
echo "  scp -r ${OUTPUT_DIR}/* root@your-server:/opt/procureai/"

echo -e "\n${YELLOW}在服务器上加载镜像:${NC}"
echo "  cd /opt/procureai"
echo "  chmod +x load-images.sh"
echo "  ./load-images.sh"
