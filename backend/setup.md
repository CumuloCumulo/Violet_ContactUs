# Violet 预注册后端部署指南（Vercel + SeaTable + SendCloud）

## 架构说明

- **后端**：Vercel Serverless Functions（国内可访问）
- **数据存储**：NJU SeaTable（`table.nju.edu.cn`）
- **邮件服务**：SendCloud（国内免费邮件 API）

## 1. SeaTable 配置

### 1.1 获取 dtable_uuid

1. 打开你的表格：https://table.nju.edu.cn/workspace/31730/dtable/Violet预注册/
2. 点击右上角「...」→「高级设置」→「开发者」
3. 复制「dtable uuid」

### 1.2 创建表格结构

在 SeaTable 中创建两个子表：

**Violet预注册表**（已存在）：
| 列名 | 类型 |
|------|------|
| 注册时间 | 文本 |
| 校园邮箱 | 文本 |
| 用户名 | 文本 |
| 常用邮箱 | 文本 |
| 状态 | 文本 |

**验证码临时表**（需新建）：
| 列名 | 类型 |
|------|------|
| 校园邮箱 | 文本 |
| 验证码 | 文本 |
| 过期时间 | 文本（时间戳） |

### 1.3 配置 API 文件

编辑 `api/sendCode.js`、`api/register.js`、`api/checkUsername.js`，填入 `dtableUuid`：

```js
const CONFIG = {
  seatable: {
    dtableUuid: 'your-dtable-uuid-here', // 填入你的 dtable uuid
    // ...
  }
};
```

## 2. SendCloud 配置

### 2.1 注册账号

1. 访问 https://sendcloud.net 注册账号
2. 完成实名认证（国内邮件服务要求）
3. 创建发件域名并验证（或使用提供的免费测试域名）

### 2.2 获取 API 凭证

1. 进入「设置」→「API 密钥」
2. 复制 API User 和 API Key

### 2.3 配置 API 文件

编辑 `api/sendCode.js` 和 `api/register.js`：

```js
const CONFIG = {
  sendcloud: {
    apiUser: 'your-api-user',      // 填入
    apiKey: 'your-api-key',        // 填入
    from: 'your-email@example.com', // 填入（需要在 SendCloud 验证）
    fromName: 'Violet 预注册'
  }
};
```

## 3. Vercel 部署

### 3.1 安装 Vercel CLI

```bash
npm install -g vercel
```

### 3.2 登录并部署

```bash
# 在项目目录下
vercel login
vercel
```

按提示操作，选择配置即可。

### 3.3 获取生产环境 URL

部署完成后，Vercel 会提供一个 URL，例如：
```
https://violet-pre-registration.vercel.app
```

### 3.4 配置环境变量（可选）

为了安全，建议将敏感配置存为环境变量：

```bash
vercel env add SEATABLE_DTABLE_UUID
vercel env add SENDCLOUD_API_USER
vercel env add SENDCLOUD_API_KEY
vercel env add SENDCLOUD_FROM
```

然后在代码中用 `process.env.SENTCLOUD_API_USER` 等引用。

## 4. 前端配置

编辑 `index.html`，将 `GAS_API_URL` 改为 Vercel API 地址：

```js
// 旧代码（GAS）
const GAS_API_URL = 'https://script.google.com/macros/s/...';

// 新代码（Vercel）
const API_URL = 'https://your-project.vercel.app/api';
```

然后更新所有 API 调用（去掉 `action` 参数，直接调用对应端点）：

```js
// sendCode
fetch(API_URL + '/sendCode', { method: 'POST', body: JSON.stringify({ campusEmail }) })

// register
fetch(API_URL + '/register', { method: 'POST', body: JSON.stringify({ ... }) })

// checkUsername
fetch(API_URL + '/checkUsername', { method: 'POST', body: JSON.stringify({ username }) })
```

## 5. 测试

```bash
# 测试发送验证码
curl -X POST https://your-project.vercel.app/api/sendCode \
  -H "Content-Type: application/json" \
  -d '{"campusEmail":"test@smail.nju.edu.cn"}'

# 测试用户名检查
curl -X POST https://your-project.vercel.app/api/checkUsername \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser"}'

# 测试注册
curl -X POST https://your-project.vercel.app/api/register \
  -H "Content-Type: application/json" \
  -d '{"campusEmail":"test@smail.nju.edu.cn","code":"123456","username":"testuser","notifyEmail":"test@qq.com"}'
```

## 注意事项

1. **Vercel 免费版限制**：100GB 流量/月，对于预注册足够用
2. **SendCloud 免费额度**：每天 200 封邮件
3. **SeaTable**：NJU 校内部署，无额外费用
4. **环境变量**：生产环境建议使用环境变量存储敏感信息

## 故障排查

- 邮件发送失败 → 检查 SendCloud 配置和发件域名验证
- SeaTable 连接失败 → 确认 dtable_uuid 正确
- CORS 错误 → Vercel 已配置，检查前端请求格式
- 验证码过期 → 检查 SeaTable 临时表的「过期时间」列
