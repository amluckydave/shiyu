# 故障排查指南

## 单词标注功能不工作

### 问题描述
标注的单词不在生词本显示

### 原因
API 服务器未启动，导致数据无法保存到后端

### 解决方案

需要同时启动两个服务：

1. **Web 开发服务器**（端口 5173）
   ```bash
   pnpm dev:web
   ```

2. **API 服务器**（端口 3100）
   ```bash
   pnpm dev:api
   ```

或者使用根目录的开发命令同时启动所有服务：
```bash
pnpm dev
```

### 验证方法

1. 打开浏览器开发者工具（F12）
2. 切换到 Network（网络）标签
3. 尝试添加一个单词
4. 查看是否有 `/api/bilingual-data` 的 POST 请求
5. 检查请求状态码是否为 200

### 数据存储位置

生词本数据存储在：
- Windows: `C:\Users\<用户名>\.vuepress-bilingual-data.json`
- macOS/Linux: `~/.vuepress-bilingual-data.json`

## 其他常见问题

### 端口被占用

如果端口 5173 或 3100 被占用：

1. 查找占用端口的进程：
   ```bash
   # Windows
   netstat -ano | findstr :5173
   netstat -ano | findstr :3100
   
   # macOS/Linux
   lsof -i :5173
   lsof -i :3100
   ```

2. 终止进程或修改配置文件中的端口号

### 热更新不工作

1. 检查文件是否保存
2. 查看终端是否有错误信息
3. 尝试刷新浏览器（Ctrl+R 或 Cmd+R）
4. 如果仍然不工作，重启开发服务器

### 目录不显示

1. 确保文章内容中有 h1-h4 标题
2. 检查浏览器控制台是否有 JavaScript 错误
3. 尝试刷新页面

## 开发命令参考

```bash
# 启动所有服务
pnpm dev

# 仅启动 Web 服务
pnpm dev:web

# 仅启动 API 服务
pnpm dev:api

# 构建项目
pnpm build

# 运行测试
pnpm test

# 清理缓存
pnpm clean
```

## 获取帮助

如果问题仍未解决：

1. 查看终端输出的错误信息
2. 检查浏览器控制台的错误
3. 查看 GitHub Issues
4. 提交新的 Issue 并附上错误信息
