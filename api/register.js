// Vercel Serverless Function: 完成注册
// SeaTable API Gateway + 阿里云 DirectMail

import { sendEmail } from "./_lib/alibaba-email.js";
import { listRows, appendRows, deleteRow } from "./_lib/seatable.js";

const TABLE = "Violet预注册";
const TEMP_TABLE = "验证码临时";

// 从 SeaTable 获取验证码
async function getStoredCode(campusEmail) {
  const rows = await listRows(TEMP_TABLE);
  const row = rows.find((r) => r["校园邮箱"] === campusEmail);
  if (row) {
    const expiresAt = parseInt(row["过期时间"]);
    if (Date.now() < expiresAt) {
      return row["验证码"];
    }
  }
  return null;
}

// 删除已使用的验证码
async function deleteStoredCode(campusEmail) {
  const rows = await listRows(TEMP_TABLE);
  const row = rows.find((r) => r["校园邮箱"] === campusEmail);
  if (row && row._id) {
    await deleteRow(TEMP_TABLE, row._id);
  }
}

// 检查用户名是否已存在
async function checkUsernameExists(username) {
  const rows = await listRows(TABLE);
  return rows.some((row) => row["用户名"] === username);
}

// 发送确认邮件
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
    await appendRows(TABLE, [
      {
        注册时间: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
        校园邮箱: campusEmail,
        用户名: username,
        常用邮箱: notifyEmail,
        状态: "pre-registered",
      },
    ]);

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
