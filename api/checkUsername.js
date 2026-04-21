// Vercel Serverless Function: 检查用户名是否可用

const CONFIG = {
  seatable: {
    baseUrl: "https://table.nju.edu.cn",
    apiToken: "99f51181923573ac478be42e9a563727dfe99826",
    dtableUuid: "94fd388a-d14d-4afe-b74e-fffbfee64159", // TODO: 填入 dtable_uuid
    tableName: "Violet预注册",
  },
};

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

    const { baseUrl, apiToken, dtableUuid, tableName } = CONFIG.seatable;

    // 检查是否配置了 dtableUuid
    if (!dtableUuid) {
      // 未配置时直接返回可用（开发阶段）
      return res.json({
        success: true,
        available: true,
        message: "用户名可用",
      });
    }

    const response = await fetch(
      `${baseUrl}/dtable-server/api/v1/dtables/${dtableUuid}/rows/?table_name=${encodeURIComponent(tableName)}`,
      {
        headers: { Authorization: `Bearer ${apiToken}` },
      },
    );

    const data = await response.json();
    let exists = false;
    if (data.rows) {
      exists = data.rows.some((row) => row["用户名"] === username);
    }

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
