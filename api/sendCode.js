// Vercel Serverless Function: 发送验证码
// 使用 SeaTable API 存储验证码 + 阿里云 DirectMail 发送邮件

import { sendEmail } from "./_lib/alibaba-email.js";

// 配置
const CONFIG = {
  seatable: {
    baseUrl: "https://table.nju.edu.cn",
    apiToken: "99f51181923573ac478be42e9a563727dfe99826",
    dtableUuid: "94fd388a-d14d-4afe-b74e-fffbfee64159",
    tableName: "Violet预注册",
    tempTableName: "验证码临时",
  },
};

// 生成6位验证码
function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// 存储验证码到 SeaTable
async function storeCode(campusEmail, code) {
  const { baseUrl, apiToken, dtableUuid, tempTableName } = CONFIG.seatable;

  const expiresAt = Date.now() + 5 * 60 * 1000; // 5分钟后过期

  const row = {
    校园邮箱: campusEmail,
    验证码: code,
    过期时间: String(expiresAt),
  };

  // 先删除旧的验证码（如果存在）
  await deleteOldCode(campusEmail);

  // 添加新验证码
  const response = await fetch(
    `${baseUrl}/dtable-server/api/v1/dtables/${dtableUuid}/rows/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rows: [row], table_name: tempTableName }),
    },
  );

  if (!response.ok) {
    const errBody = await response.text();
    console.error("SeaTable storeCode error:", response.status, errBody);
    throw new Error(`存储验证码失败: ${errBody}`);
  }
}

// 删除旧验证码
async function deleteOldCode(campusEmail) {
  const { baseUrl, apiToken, dtableUuid, tempTableName } = CONFIG.seatable;

  // 获取所有行
  const listRes = await fetch(
    `${baseUrl}/dtable-server/api/v1/dtables/${dtableUuid}/rows/?table_name=${encodeURIComponent(tempTableName)}`,
    {
      headers: { Authorization: `Bearer ${apiToken}` },
    },
  );

  const listData = await listRes.json();
  if (listData.rows) {
    const oldRow = listData.rows.find((r) => r["校园邮箱"] === campusEmail);
    if (oldRow && oldRow._id) {
      // 删除旧行
      await fetch(
        `${baseUrl}/dtable-server/api/v1/dtables/${dtableUuid}/rows/${oldRow._id}/`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${apiToken}` },
        },
      );
    }
  }
}

// 发送验证码邮件（通过阿里云 DirectMail）
async function sendVerificationEmail(to, code) {
  await sendEmail({
    to,
    subject: "Violet 校园认证 — 验证码",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
          .code { color: #8ca0ff; font-size: 48px; letter-spacing: 8px; font-weight: bold; }
          .footer { color: #999; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <h2>你好！</h2>
        <p>你的 Violet 预注册验证码是：</p>
        <p class="code">${code}</p>
        <p>验证码 5 分钟内有效，请尽快完成验证。</p>
        <p class="footer">如果你没有注册 Violet，请忽略此邮件。<br>— Violet 团队</p>
      </body>
      </html>
    `,
  });
}

// 检查邮箱是否已注册
async function checkEmailExists(campusEmail) {
  const { baseUrl, apiToken, dtableUuid, tableName } = CONFIG.seatable;

  if (!dtableUuid) {
    return false; // 未配置时跳过检查
  }

  const response = await fetch(
    `${baseUrl}/dtable-server/api/v1/dtables/${dtableUuid}/rows/?table_name=${encodeURIComponent(tableName)}`,
    {
      headers: { Authorization: `Bearer ${apiToken}` },
    },
  );

  const data = await response.json();
  if (data.rows) {
    return data.rows.some((row) => row["校园邮箱"] === campusEmail);
  }
  return false;
}

// Handler
export default async function handler(req, res) {
  // CORS
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
    const { campusEmail } = req.body;

    if (!campusEmail) {
      return res.json({ success: false, message: "请输入校园邮箱" });
    }

    if (!campusEmail.endsWith("@smail.nju.edu.cn")) {
      return res.json({
        success: false,
        message: "请使用南大校园邮箱（@smail.nju.edu.cn）",
      });
    }

    // 检查是否已注册
    const exists = await checkEmailExists(campusEmail);
    if (exists) {
      return res.json({ success: false, message: "该校园邮箱已注册" });
    }

    // 生成验证码
    const code = generateCode();

    // 存储到 SeaTable
    if (CONFIG.seatable.dtableUuid) {
      await storeCode(campusEmail, code);
    }

    // 发送邮件
    await sendVerificationEmail(campusEmail, code);

    res.json({ success: true, message: "验证码已发送" });
  } catch (error) {
    console.error("sendCode error:", error);
    res.json({ success: false, message: error.message || "服务器错误" });
  }
}
