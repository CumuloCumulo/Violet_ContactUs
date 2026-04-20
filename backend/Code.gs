// ============================================
// Violet 预注册后端 — Google Apps Script
// ============================================

const SHEET_ID = '1Soz5yZxaHUu9seHPTC-J8QsX6u6bieRKrN1dlNnJZjA'; // TODO: 填入 Google Sheets 的 Spreadsheet ID
const SHEET_NAME = 'pre-registrations';

// ---------- 入口 ----------

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;

    let result;
    switch (action) {
      case 'sendCode':
        result = sendCode(params);
        break;
      case 'register':
        result = register(params);
        break;
      case 'checkUsername':
        result = checkUsername(params);
        break;
      default:
        result = { success: false, message: '未知操作' };
    }

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ success: false, message: '服务器错误：' + err.message });
  }
}

function doGet(e) {
  return jsonResponse({ status: 'ok', service: 'Violet Pre-Registration' });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------- 发送验证码 ----------

function sendCode(params) {
  const campusEmail = (params.campusEmail || '').trim().toLowerCase();

  if (!campusEmail) {
    return { success: false, message: '请输入校园邮箱' };
  }

  if (!campusEmail.endsWith('@smail.nju.edu.cn')) {
    return { success: false, message: '请使用南大校园邮箱（@smail.nju.edu.cn）' };
  }

  // 检查是否已注册
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === campusEmail) {
      return { success: false, message: '该校园邮箱已注册' };
    }
  }

  // 生成 6 位验证码
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 分钟过期

  // 存入 ScriptProperties（key=邮箱, value=code|timestamp）
  PropertiesService.getScriptProperties().setProperty(
    'code_' + campusEmail,
    code + '|' + expiresAt
  );

  // 发送验证码邮件
  const subject = 'Violet 校园认证 — 验证码';
  const body =
    '你好！\n\n' +
    '你的 Violet 预注册验证码是：' + code + '\n\n' +
    '验证码 5 分钟内有效，请尽快完成验证。\n\n' +
    '如果你没有注册 Violet，请忽略此邮件。\n\n' +
    '— Violet 团队';

  GmailApp.sendEmail(campusEmail, subject, body);

  return { success: true, message: '验证码已发送' };
}

// ---------- 注册 ----------

function register(params) {
  const campusEmail = (params.campusEmail || '').trim().toLowerCase();
  const code = (params.code || '').trim();
  const username = (params.username || '').trim();
  const notifyEmail = (params.notifyEmail || '').trim().toLowerCase();

  // 基本校验
  if (!campusEmail || !code || !username || !notifyEmail) {
    return { success: false, message: '请填写所有字段' };
  }

  if (!campusEmail.endsWith('@smail.nju.edu.cn')) {
    return { success: false, message: '校园邮箱格式不正确' };
  }

  if (!/^[a-zA-Z0-9_]{2,20}$/.test(username)) {
    return { success: false, message: '用户名仅支持 2-20 位字母、数字或下划线' };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail)) {
    return { success: false, message: '常用邮箱格式不正确' };
  }

  // 验证码校验
  const stored = PropertiesService.getScriptProperties().getProperty('code_' + campusEmail);
  if (!stored) {
    return { success: false, message: '请先发送验证码' };
  }

  const parts = stored.split('|');
  const storedCode = parts[0];
  const expiresAt = Number(parts[1]);

  if (Date.now() > expiresAt) {
    PropertiesService.getScriptProperties().deleteProperty('code_' + campusEmail);
    return { success: false, message: '验证码已过期，请重新发送' };
  }

  if (code !== storedCode) {
    return { success: false, message: '验证码错误' };
  }

  // 检查校园邮箱是否已注册
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === campusEmail) {
      return { success: false, message: '该校园邮箱已注册' };
    }
    if (data[i][2] === username) {
      return { success: false, message: '该用户名已被占用' };
    }
  }

  // 写入 Google Sheets
  // 列：timestamp | campus_email | username | notify_email | status
  sheet.appendRow([
    new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    campusEmail,
    username,
    notifyEmail,
    'pre-registered'
  ]);

  // 删除已使用的验证码
  PropertiesService.getScriptProperties().deleteProperty('code_' + campusEmail);

  // 发送确认邮件到常用邮箱
  const subject = 'Violet 预注册成功';
  const body =
    '你好，' + username + '！\n\n' +
    '恭喜你完成 Violet 预注册！\n\n' +
    '注册信息：\n' +
    '  用户名：' + username + '\n' +
    '  校园邮箱：' + campusEmail + '\n\n' +
    '我们会在产品上线后第一时间通知你。\n\n' +
    '期待与你相遇。\n\n' +
    '— Violet 团队';

  GmailApp.sendEmail(notifyEmail, subject, body);

  return { success: true, message: '注册成功' };
}

// ---------- 检查用户名 ----------

function checkUsername(params) {
  const username = (params.username || '').trim();

  if (!username) {
    return { success: false, message: '请输入用户名' };
  }

  if (!/^[a-zA-Z0-9_]{2,20}$/.test(username)) {
    return { success: false, message: '用户名仅支持 2-20 位字母、数字或下划线' };
  }

  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === username) {
      return { success: false, available: false, message: '该用户名已被占用' };
    }
  }

  return { success: true, available: true, message: '用户名可用' };
}

// ---------- 辅助函数 ----------

function getSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // 写入表头
    sheet.appendRow(['timestamp', 'campus_email', 'username', 'notify_email', 'status']);
    // 首行加粗
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  }
  return sheet;
}
