// Vercel Serverless Function: 完成注册
// 使用 SeaTable API 存储用户数据 + 阿里云 DirectMail 发送确认邮件

import { sendEmail } from "./_lib/alibaba-email.js";

const CONFIG = {
  seatable: {
    baseUrl: "https://table.nju.edu.cn",
    apiToken: "99f51181923573ac478be42e9a563727dfe99826",
    dtableUuid: "94fd388a-d14d-4afe-b74e-fffbfee64159",
    tableName: "Violet预注册",
  },
};

// 共享验证码存储（实际部署建议用 Redis 或外部存储）
// 注意：Vercel serverless 每次执行是独立的，这里需要用外部存储
// 为简化，我们用 SeaTable 存储临时验证码

// 从 SeaTable 获取验证码
async function getStoredCode(campusEmail) {
  const { baseUrl, apiToken, dtableUuid } = CONFIG.seatable;

  // 查找临时验证码表
  const response = await fetch(
    `${baseUrl}/dtable-server/api/v1/dtables/${dtableUuid}/rows/?table_name=验证码临时`,
    {
      headers: { Authorization: `Bearer ${apiToken}` },
    },
  );

  const data = await response.json();
  if (data.rows) {
    const row = data.rows.find((r) => r["校园邮箱"] === campusEmail);
    if (row) {
      const expiresAt = parseInt(row["过期时间"]);
      if (Date.now() < expiresAt) {
        return row["验证码"];
      }
    }
  }
  return null;
}

// 删除已使用的验证码
async function deleteStoredCode(campusEmail) {
  const { baseUrl, apiToken, dtableUuid } = CONFIG.seatable;

  // 先获取 row_id
  const listRes = await fetch(
    `${baseUrl}/dtable-server/api/v1/dtables/${dtableUuid}/rows/?table_name=验证码临时`,
    {
      headers: { Authorization: `Bearer ${apiToken}` },
    },
  );

  const listData = await listRes.json();
  if (listData.rows) {
    const row = listData.rows.find((r) => r["校园邮箱"] === campusEmail);
    if (row && row._id) {
      // 删除行
      await fetch(
        `${baseUrl}/dtable-server/api/v1/dtables/${dtableUuid}/rows/${row._id}/`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${apiToken}` },
        },
      );
    }
  }
}

// 添加用户到表格
async function appendRow(campusEmail, username, notifyEmail) {
  const { baseUrl, apiToken, dtableUuid, tableName } = CONFIG.seatable;

  const row = {
    注册时间: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
    校园邮箱: campusEmail,
    用户名: username,
    常用邮箱: notifyEmail,
    状态: "pre-registered",
  };

  const response = await fetch(
    `${baseUrl}/dtable-server/api/v1/dtables/${dtableUuid}/rows/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rows: [row], table_name: tableName }),
    },
  );

  return response.json();
}

// 检查用户名是否已存在
async function checkUsernameExists(username) {
  const { baseUrl, apiToken, dtableUuid, tableName } = CONFIG.seatable;

  const response = await fetch(
    `${baseUrl}/dtable-server/api/v1/dtables/${dtableUuid}/rows/?table_name=${encodeURIComponent(tableName)}`,
    {
      headers: { Authorization: `Bearer ${apiToken}` },
    },
  );

  const data = await response.json();
  if (data.rows) {
    return data.rows.some((row) => row["用户名"] === username);
  }
  return false;
}

// 发送确认邮件（通过阿里云 DirectMail）
async function sendConfirmationEmail(notifyEmail, username, campusEmail) {
  await sendEmail({
    to: notifyEmail,
    subject: "Violet 预注册成功",
    html: `
      <h2>你好，${username}！</h2>
      <p>恭喜你完成 Violet 预注册！</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>注册信息</h3>
        <p><strong>用户名：</strong>${username}</p>
        <p><strong>校园邮箱：</strong>${campusEmail}</p>
      </div>
      <p>我们会在产品上线后第一时间通知你。</p>
      <p>期待与你相遇。</p>
      <hr>
      <p style="color: #999; font-size: 12px;">— Violet 团队</p>
    `,
  });
}

// Handler
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  try {
    const { campusEmail, code, username, notifyEmail } = req.body;

    // 基本校验
    if (!campusEmail || !code || !username || !notifyEmail) {
      return res.json({ success: false, message: "请填写所有字段" });
    }

    if (!campusEmail.endsWith("@smail.nju.edu.cn")) {
      return res.json({ success: false, message: "校园邮箱格式不正确" });
    }

    if (!/^[a-zA-Z0-9_]{2,20}$/.test(username)) {
      return res.json({
        success: false,
        message: "用户名仅支持 2-20 位字母、数字或下划线",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail)) {
      return res.json({ success: false, message: "常用邮箱格式不正确" });
    }

    // 验证码校验
    const storedCode = await getStoredCode(campusEmail);
    if (!storedCode) {
      return res.json({ success: false, message: "请先发送验证码" });
    }

    if (code !== storedCode) {
      return res.json({ success: false, message: "验证码错误" });
    }

    // 检查用户名
    const usernameExists = await checkUsernameExists(username);
    if (usernameExists) {
      return res.json({ success: false, message: "该用户名已被占用" });
    }

    // 写入 SeaTable
    await appendRow(campusEmail, username, notifyEmail);

    // 删除验证码
    await deleteStoredCode(campusEmail);

    // 发送确认邮件
    await sendConfirmationEmail(notifyEmail, username, campusEmail);

    res.json({ success: true, message: "注册成功" });
  } catch (error) {
    console.error("register error:", error);
    res.json({ success: false, message: error.message || "服务器错误" });
  }
}
