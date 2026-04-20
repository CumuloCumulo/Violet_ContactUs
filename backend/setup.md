# Violet 预注册后端部署指南

## 1. 创建 Google Sheets

1. 在 Google Drive 中新建一个 Google Sheets 表格
2. 表格会自动创建一个 `Sheet1`，脚本会自动创建名为 `pre-registrations` 的工作表
3. 记下 URL 中的 Spreadsheet ID：
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
   ```
4. 将该 ID 填入 `Code.gs` 中的 `SHEET_ID` 常量

## 2. 创建 Google Apps Script 项目

1. 打开 [script.google.com](https://script.google.com)
2. 点击「新项目」
3. 将 `Code.gs` 的内容粘贴到编辑器中
4. 填入 `SHEET_ID`

## 3. 部署为 Web App

1. 点击右上角「部署」→「新部署」
2. 齿轮图标选择「Web 应用」
3. 配置：
   - 说明：`v1`
   - 执行身份：**我**
   - 谁有访问权限：**任何人**
4. 点击「部署」
5. 授权 Google 权限（首次需要）
6. 复制 Web App URL

## 4. 配置前端

将获得的 Web App URL 填入 `index.html` 中 `GAS_API_URL` 常量：

```js
const GAS_API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```

## 5. 测试

使用 curl 测试接口：

```bash
# 测试发送验证码
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{"action":"sendCode","campusEmail":"test@smail.nju.edu.cn"}'

# 测试用户名检查
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{"action":"checkUsername","username":"testuser"}'

# 测试注册（需先获取验证码）
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{"action":"register","campusEmail":"test@smail.nju.edu.cn","code":"123456","username":"testuser","notifyEmail":"test@gmail.com"}'
```

## 6. 数据列结构

| 列 | 字段 | 说明 |
|---|---|---|
| A | timestamp | 注册时间 |
| B | campus_email | 校园邮箱 |
| C | username | 用户名 |
| D | notify_email | 常用邮箱 |
| E | status | 状态（pre-registered） |

## 注意事项

- GAS Web App 每次修改代码后需要创建**新部署**，旧的部署不会自动更新
- GmailApp 每日发送配额为 100 封（免费账户），足够预注册使用
- 验证码存储在 ScriptProperties 中，5 分钟过期
- 部署时「执行身份」必须选「我」，否则 GmailApp 无法发送邮件
