// Vercel Serverless Function: 发送验证码
// SeaTable API Gateway + 阿里云 DirectMail

import { sendEmail } from "./_lib/alibaba-email.js";
import { listRows, appendRows, deleteRow } from "./_lib/seatable.js";

const TABLE = "Violet预注册";
const TEMP_TABLE = "验证码临时";

// 生成6位验证码
function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// 存储验证码
async function storeCode(campusEmail, code) {
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5分钟过期

  // 先删除旧验证码
  await deleteOldCode(campusEmail);

  // 写入新验证码
  await appendRows(TEMP_TABLE, [
    { 校园邮箱: campusEmail, 验证码: code, 过期时间: String(expiresAt) },
  ]);
}

// 删除旧验证码
async function deleteOldCode(campusEmail) {
  const rows = await listRows(TEMP_TABLE);
  const oldRow = rows.find((r) => r["校园邮箱"] === campusEmail);
  if (oldRow && oldRow._id) {
    await deleteRow(TEMP_TABLE, oldRow._id);
  }
}

// 检查邮箱是否已注册
async function checkEmailExists(campusEmail) {
  const rows = await listRows(TABLE);
  return rows.some((row) => row["校园邮箱"] === campusEmail);
}

// 发送验证码邮件
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

    const exists = await checkEmailExists(campusEmail);
    if (exists) {
      return res.json({ success: false, message: "该校园邮箱已注册" });
    }

    const code = generateCode();
    await storeCode(campusEmail, code);
    await sendVerificationEmail(campusEmail, code);

    res.json({ success: true, message: "验证码已发送" });
  } catch (error) {
    console.error("sendCode error:", error);
    res.json({ success: false, message: error.message || "服务器错误" });
  }
}
