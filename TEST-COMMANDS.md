# MP3 API 测试命令

## ⚠️ 重要提示
在 zsh/bash 中使用 curl 时，**必须使用 `-g` 参数**来禁用URL字符转义，或者使用URL编码。

---

## ✅ 正确的测试命令

### 1. 基础查询
```bash
# 获取所有用户
curl http://localhost:3000/api/users

# 获取所有任务
curl http://localhost:3000/api/tasks
```

### 2. WHERE 查询（使用 -g 参数）
```bash
# 获取已完成的任务
curl -g 'http://localhost:3000/api/tasks?where={"completed":true}&limit=5'

# 根据ID查询用户
curl -g 'http://localhost:3000/api/users?where={"_id":"USER_ID"}' 
# 替换 USER_ID 为实际ID
```

### 3. SORT 排序
```bash
# 按姓名排序用户
curl -g 'http://localhost:3000/api/users?sort={"name":1}&limit=5'

# 按日期降序排序任务
curl -g 'http://localhost:3000/api/tasks?sort={"dateCreated":-1}&limit=5'
```

### 4. SELECT 选择字段
```bash
# 只返回用户名和邮箱
curl -g 'http://localhost:3000/api/users?select={"name":1,"email":1}&limit=3'

# 排除_id字段
curl -g 'http://localhost:3000/api/users?select={"_id":0}&limit=3'
```

### 5. SKIP 和 LIMIT 分页
```bash
# 跳过前60个，返回20个任务
curl -g 'http://localhost:3000/api/tasks?skip=60&limit=20'

# 第2页用户（每页10个）
curl -g 'http://localhost:3000/api/users?skip=10&limit=10'
```

### 6. COUNT 计数
```bash
# 获取用户总数
curl 'http://localhost:3000/api/users?count=true'

# 获取任务总数
curl 'http://localhost:3000/api/tasks?count=true'

# 获取已完成任务数量
curl -g 'http://localhost:3000/api/tasks?where={"completed":true}&count=true'
```

### 7. 组合查询
```bash
# 获取已完成的任务，按日期降序，限制5个
curl -g 'http://localhost:3000/api/tasks?where={"completed":true}&sort={"dateCreated":-1}&limit=5'

# 获取用户，按姓名排序，只返回名字，跳过前5个，返回10个
curl -g 'http://localhost:3000/api/users?sort={"name":1}&select={"name":1}&skip=5&limit=10'
```

---

## 🧪 创建数据测试

### 创建用户
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"张三","email":"zhangsan@example.com"}'
```

### 创建任务
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"name":"完成作业","description":"数学作业","deadline":"2025-12-31T00:00:00.000Z"}'
```

---

## 🔍 使用 Postman 测试（推荐）

1. 下载 Postman: https://www.postman.com/
2. 创建新请求
3. 选择方法（GET, POST, PUT, DELETE）
4. 输入URL（不需要 -g 参数）
5. 添加请求体（如果需要）
6. 发送请求

**Postman 会自动处理URL编码，更简单！**

---

## 📊 格式化输出（可选）

使用 `python3 -m json.tool` 格式化输出：

```bash
curl -g 'http://localhost:3000/api/users?limit=3' | python3 -m json.tool
```

---

## 💡 常见错误

### ❌ 错误：花括号被解释
```bash
curl http://localhost:3000/api/tasks?where={"completed":true}
# 错误: zsh: parse error near `}'
```

### ✅ 正确：使用 -g 参数
```bash
curl -g 'http://localhost:3000/api/tasks?where={"completed":true}'
```

### ✅ 正确：使用单引号
```bash
curl 'http://localhost:3000/api/tasks?where={"completed":true}'
```

---

## 🚀 完整的测试序列

```bash
# 1. 创建用户
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"测试用户","email":"test@example.com"}'

# 2. 获取用户ID（从上面的响应中复制）
USER_ID="YOUR_USER_ID"

# 3. 创建任务并分配给用户
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"测试任务\",\"description\":\"重要任务\",\"deadline\":\"2025-12-31T00:00:00.000Z\",\"assignedUser\":\"$USER_ID\"}"

# 4. 查询已完成的任务
curl -g 'http://localhost:3000/api/tasks?where={"completed":true}&limit=5' | python3 -m json.tool

# 5. 按姓名排序用户
curl -g 'http://localhost:3000/api/users?sort={"name":1}&limit=5' | python3 -m json.tool

# 6. 获取计数
curl 'http://localhost:3000/api/users?count=true'
curl 'http://localhost:3000/api/tasks?count=true'
```

