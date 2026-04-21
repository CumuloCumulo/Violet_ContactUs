// SeaTable API 工具：通过 API Gateway v2 访问

const BASE_URL = "https://table.nju.edu.cn";
const API_TOKEN = "99f51181923573ac478be42e9a563727dfe99826";
const DTABLE_UUID = "94fd388a-d14d-4afe-b74e-fffbfee64159";

// 缓存 access_token（有效期 3 天）
let tokenCache = { token: null, expires: 0 };

async function getAccessToken() {
  if (tokenCache.token && Date.now() < tokenCache.expires) {
    return tokenCache.token;
  }

  const res = await fetch(`${BASE_URL}/api/v2.1/dtable/app-access-token/`, {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });
  const data = await res.json();

  tokenCache = {
    token: data.access_token,
    expires: Date.now() + 3 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000,
  };
  return data.access_token;
}

// 读取行
export async function listRows(tableName) {
  const token = await getAccessToken();
  const res = await fetch(
    `${BASE_URL}/api-gateway/api/v2/dtables/${DTABLE_UUID}/rows/?table_name=${encodeURIComponent(tableName)}&convert_keys=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = await res.json();
  return data.rows || [];
}

// 追加行
export async function appendRows(tableName, rows) {
  const token = await getAccessToken();
  const res = await fetch(
    `${BASE_URL}/api-gateway/api/v2/dtables/${DTABLE_UUID}/rows/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rows, table_name: tableName }),
    },
  );
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`SeaTable 写入失败: ${errBody}`);
  }
  return res.json();
}

// 删除行
export async function deleteRow(tableName, rowId) {
  const token = await getAccessToken();
  const res = await fetch(
    `${BASE_URL}/api-gateway/api/v2/dtables/${DTABLE_UUID}/rows/${rowId}/`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ table_name: tableName }),
    },
  );
  if (!res.ok) {
    const errBody = await res.text();
    console.error("SeaTable deleteRow error:", res.status, errBody);
  }
}

// 删除匹配条件的所有行
export async function deleteRows(tableName, matchFn) {
  const rows = await listRows(tableName);
  const toDelete = rows.filter(matchFn);
  for (const row of toDelete) {
    if (row._id) {
      await deleteRow(tableName, row._id);
    }
  }
}
