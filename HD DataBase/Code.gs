/**
 * BioSphere - Google Apps Script backend cho biểu mẫu Hỗ trợ / Đóng góp tài liệu.
 *
 * Cách dùng:
 * 1. Tạo một dự án Google Apps Script độc lập.
 * 2. Dán toàn bộ tệp này vào Code.gs.
 * 3. Chạy setupSupportDatabase() một lần và cấp quyền.
 * 4. Deploy > New deployment > Web app; Execute as: Me; Who has access: Anyone.
 * 5. Sao chép URL Web app kết thúc bằng /exec vào SUPPORT_WEB_APP_URL trong script.js.
 */

const BIOSPHERE_CONFIG = {
  SPREADSHEET_PROPERTY: 'BIOSPHERE_SUPPORT_SPREADSHEET_ID',
  FOLDER_PROPERTY: 'BIOSPHERE_SUPPORT_FOLDER_ID',
  MAX_FILE_BYTES: 5 * 1024 * 1024,
  SUPPORT_SHEET: 'YeuCauHoTro',
  CONTRIBUTION_SHEET: 'DongGopTaiLieu',
  FILE_FOLDER_NAME: 'BioSphere - Tep ho tro va tai lieu dong gop'
};

const SUPPORT_HEADERS = [
  'Thời gian',
  'Mã tiếp nhận',
  'Họ và tên',
  'Email',
  'Số điện thoại',
  'Chủ đề',
  'Tên tài liệu',
  'Liên kết tài liệu',
  'Nội dung',
  'Tên tệp đính kèm',
  'Liên kết tệp',
  'Trạng thái'
];

/** Chạy thủ công một lần để tự tạo Google Sheet, hai trang tính và thư mục Drive. */
function setupSupportDatabase() {
  const properties = PropertiesService.getScriptProperties();
  let spreadsheet;
  let folder;

  const spreadsheetId = properties.getProperty(BIOSPHERE_CONFIG.SPREADSHEET_PROPERTY);
  const folderId = properties.getProperty(BIOSPHERE_CONFIG.FOLDER_PROPERTY);

  if (spreadsheetId) {
    spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  } else {
    spreadsheet = SpreadsheetApp.create('BioSphere - Cơ sở dữ liệu hỗ trợ');
    properties.setProperty(BIOSPHERE_CONFIG.SPREADSHEET_PROPERTY, spreadsheet.getId());
  }

  if (folderId) {
    folder = DriveApp.getFolderById(folderId);
  } else {
    folder = DriveApp.createFolder(BIOSPHERE_CONFIG.FILE_FOLDER_NAME);
    properties.setProperty(BIOSPHERE_CONFIG.FOLDER_PROPERTY, folder.getId());
  }

  ensureSheet_(spreadsheet, BIOSPHERE_CONFIG.SUPPORT_SHEET);
  ensureSheet_(spreadsheet, BIOSPHERE_CONFIG.CONTRIBUTION_SHEET);

  const defaultSheet = spreadsheet.getSheetByName('Sheet1');
  if (defaultSheet && defaultSheet.getLastRow() === 0 && spreadsheet.getSheets().length > 2) {
    spreadsheet.deleteSheet(defaultSheet);
  }

  Logger.log('Google Sheet: ' + spreadsheet.getUrl());
  Logger.log('Thư mục Drive: ' + folder.getUrl());
  return {
    spreadsheetUrl: spreadsheet.getUrl(),
    folderUrl: folder.getUrl()
  };
}

/** Endpoint nhận biểu mẫu từ website qua một iframe ẩn, không cần CORS. */
function doPost(event) {
  let nonce = '';

  try {
    const rawPayload = event && event.parameter && event.parameter.payload
      ? event.parameter.payload
      : (event && event.postData && event.postData.contents ? event.postData.contents : '{}');
    const payload = JSON.parse(rawPayload);
    nonce = sanitizeNonce_(payload.nonce);

    const result = saveSubmission_(payload);
    return createFrameResponse_({
      type: 'biosphere-support-result',
      nonce: nonce,
      status: 'success',
      message: result.message,
      submissionId: result.submissionId
    });
  } catch (error) {
    return createFrameResponse_({
      type: 'biosphere-support-result',
      nonce: nonce,
      status: 'error',
      message: error && error.message ? error.message : 'Không thể lưu thông tin. Vui lòng thử lại.'
    });
  }
}

/** Kiểm tra nhanh trạng thái triển khai khi mở URL /exec bằng trình duyệt. */
function doGet() {
  return HtmlService.createHtmlOutput(
    '<main style="font:16px Arial,sans-serif;padding:24px;color:#14532d">' +
    '<h2>BioSphere Support API</h2><p>Endpoint đang hoạt động. Hãy gửi dữ liệu bằng biểu mẫu trên website.</p></main>'
  );
}

function saveSubmission_(payload) {
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = properties.getProperty(BIOSPHERE_CONFIG.SPREADSHEET_PROPERTY);
  const folderId = properties.getProperty(BIOSPHERE_CONFIG.FOLDER_PROPERTY);

  if (!spreadsheetId || !folderId) {
    throw new Error('Cơ sở dữ liệu chưa được khởi tạo. Quản trị viên cần chạy setupSupportDatabase() trước.');
  }

  const requestType = String(payload.requestType || '').trim();
  if (requestType !== 'support' && requestType !== 'contribution') {
    throw new Error('Loại yêu cầu không hợp lệ.');
  }

  const name = requiredText_(payload.name, 'Vui lòng nhập họ và tên.', 100);
  const email = requiredText_(payload.email, 'Vui lòng nhập email liên hệ.', 150);
  const message = requiredText_(payload.message, 'Vui lòng nhập nội dung chi tiết.', 5000);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Địa chỉ email chưa hợp lệ.');
  }

  const category = cleanText_(payload.category, 150);
  const resourceTitle = cleanText_(payload.resourceTitle, 180);
  const resourceUrl = cleanUrl_(payload.resourceUrl);
  if (requestType === 'contribution' && !resourceTitle) {
    throw new Error('Vui lòng nhập tên tài liệu đóng góp.');
  }

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheetName = requestType === 'contribution'
    ? BIOSPHERE_CONFIG.CONTRIBUTION_SHEET
    : BIOSPHERE_CONFIG.SUPPORT_SHEET;
  const sheet = ensureSheet_(spreadsheet, sheetName);
  const folder = DriveApp.getFolderById(folderId);

  let savedFile = null;
  const fileData = String(payload.fileData || '');
  const fileName = cleanFileName_(payload.fileName);
  const mimeType = String(payload.mimeType || 'application/octet-stream').slice(0, 120);

  if (fileData) {
    const estimatedBytes = Math.floor(fileData.length * 3 / 4);
    if (estimatedBytes > BIOSPHERE_CONFIG.MAX_FILE_BYTES) {
      throw new Error('Tệp đính kèm vượt quá giới hạn 5MB.');
    }
    if (!fileName || !isAllowedFile_(fileName)) {
      throw new Error('Định dạng tệp không được hỗ trợ.');
    }

    const bytes = Utilities.base64Decode(fileData);
    if (bytes.length > BIOSPHERE_CONFIG.MAX_FILE_BYTES) {
      throw new Error('Tệp đính kèm vượt quá giới hạn 5MB.');
    }
    const blob = Utilities.newBlob(bytes, mimeType, fileName);
    savedFile = folder.createFile(blob);
  }

  const submissionId = Utilities.getUuid().toUpperCase();
  const row = [
    new Date(),
    submissionId,
    safeSheetValue_(name),
    safeSheetValue_(email),
    safeSheetValue_(cleanText_(payload.phone, 30)),
    safeSheetValue_(category),
    safeSheetValue_(resourceTitle),
    safeSheetValue_(resourceUrl),
    safeSheetValue_(message),
    savedFile ? savedFile.getName() : '',
    savedFile ? savedFile.getUrl() : '',
    'Mới tiếp nhận'
  ];

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    sheet.appendRow(row);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  return {
    submissionId: submissionId,
    message: requestType === 'contribution'
      ? 'Đã tiếp nhận tài liệu đóng góp của bạn.'
      : 'Đã tiếp nhận yêu cầu hỗ trợ của bạn.'
  };
}

function ensureSheet_(spreadsheet, sheetName) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(sheetName);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SUPPORT_HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, SUPPORT_HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#d1fae5')
      .setFontColor('#064e3b');
    sheet.autoResizeColumns(1, SUPPORT_HEADERS.length);
  }
  return sheet;
}

function requiredText_(value, errorMessage, maxLength) {
  const text = cleanText_(value, maxLength);
  if (!text) throw new Error(errorMessage);
  return text;
}

function cleanText_(value, maxLength) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, maxLength || 5000);
}

function cleanUrl_(value) {
  const url = cleanText_(value, 1000);
  if (!url) return '';
  if (!/^https:\/\//i.test(url)) throw new Error('Liên kết tài liệu phải bắt đầu bằng https://');
  return url;
}

function cleanFileName_(value) {
  return cleanText_(value, 180).replace(/[\\/:*?"<>|]/g, '_');
}

function isAllowedFile_(fileName) {
  return /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|csv|txt|jpg|jpeg|png|zip)$/i.test(fileName);
}

function safeSheetValue_(value) {
  const text = String(value == null ? '' : value);
  return /^[=+@\-]/.test(text) ? "'" + text : text;
}

function sanitizeNonce_(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
}

function createFrameResponse_(result) {
  const serialized = JSON.stringify(result).replace(/</g, '\\u003c');
  const html = '<!doctype html><html><head><meta charset="utf-8"></head><body>' +
    '<script>window.parent.postMessage(' + serialized + ', "*");</script>' +
    '</body></html>';
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
