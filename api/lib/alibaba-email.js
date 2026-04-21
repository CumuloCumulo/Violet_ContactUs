import crypto from "crypto";

const DIRECT_MAIL_ENDPOINT = "https://dm.aliyuncs.com";

// 阿里云 DirectMail API 签名工具
function percentEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

function signature(params, accessKeySecret) {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join("&");

  const stringToSign = `GET&${percentEncode("/")}&${percentEncode(sorted)}`;
  return crypto
    .createHmac("sha1", `${accessKeySecret}&`)
    .update(stringToSign)
    .digest("base64");
}

// 发送邮件
export async function sendEmail({ to, subject, html }) {
  const accessKeyId = process.env.ALIBABA_CLOUD_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET;
  const from = process.env.ALIBABA_CLOUD_SENDER_EMAIL || "cumulo@njuviolet.com";
  const fromName = "Violet";

  if (!accessKeyId || !accessKeySecret) {
    throw new Error("阿里云邮件服务未配置，请设置环境变量");
  }

  const params = {
    Action: "SingleSendMail",
    AccountName: from,
    ReplyToAddress: "false",
    AddressType: "1",
    ToAddress: to,
    FromAlias: fromName,
    Subject: subject,
    HtmlBody: html,
    Format: "JSON",
    Version: "2015-11-23",
    AccessKeyId: accessKeyId,
    SignatureMethod: "HMAC-SHA1",
    SignatureVersion: "1.0",
    SignatureNonce: crypto.randomUUID(),
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  };

  params.Signature = signature(params, accessKeySecret);

  const query = Object.entries(params)
    .map(([k, v]) => `${percentEncode(k)}=${percentEncode(v)}`)
    .join("&");

  const response = await fetch(`${DIRECT_MAIL_ENDPOINT}/?${query}`);
  const result = await response.json();

  if (result.Code) {
    throw new Error(result.Message || "发送邮件失败");
  }

  return result;
}
