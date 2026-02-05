# 使用官方Nginx镜像作为基础
FROM nginx:alpine

# 删除默认的Nginx配置
RUN rm -rf /usr/share/nginx/html/*

# 复制项目文件到Nginx目录
COPY . /usr/share/nginx/html/

# 创建自定义Nginx配置
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html toolbox.html lottery.html earth-activity.html ai-report-generator.html; \
        try_files $uri $uri/ /index.html; \
    } \
    gzip on; \
    gzip_vary on; \
    gzip_min_length 1024; \
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript; \
}' > /etc/nginx/conf.d/default.conf

# 暴露80端口
EXPOSE 80

# 启动Nginx
CMD ["nginx", "-g", "daemon off;"]
