// Vercel Serverless Function: 检查用户名是否可用

import { listRows } from "./_lib/seatable.js";

const TABLE = "Violet预注册";

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
    const { username } = req.body;

    if (!username) {
      return res.json({ success: false, message: "请输入用户名" });
    }

    if (!/^[a-zA-Z0-9_]{2,20}$/.test(username)) {
      return res.json({
        success: false,
        message: "用户名仅支持 2-20 位字母、数字或下划线",
      });
    }

    const rows = await listRows(TABLE);
    const exists = rows.some((row) => row["用户名"] === username);

    if (exists) {
      return res.json({
        success: true,
        available: false,
        message: "该用户名已被占用",
      });
    }

    return res.json({ success: true, available: true, message: "用户名可用" });
  } catch (error) {
    console.error("checkUsername error:", error);
    res.json({ success: false, message: error.message || "服务器错误" });
  }
}
