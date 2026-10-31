# Hướng dẫn bật chức năng Hỗ trợ / Đóng góp tài liệu

## 1. Tạo cơ sở dữ liệu Google Sheets

1. Mở [Google Apps Script](https://script.google.com/) và tạo một dự án độc lập.
2. Mở tệp `Code.gs` trong gói này, sao chép toàn bộ mã vào dự án Apps Script.
3. Chọn hàm `setupSupportDatabase` và nhấn **Run**.
4. Cấp quyền truy cập Google Sheets và Google Drive theo yêu cầu.
5. Trong **Execution log**, lấy liên kết Google Sheets và thư mục Drive vừa được tạo. Hai trang tính `YeuCauHoTro` và `DongGopTaiLieu` được tạo tự động.

## 2. Triển khai Apps Script thành Web App

1. Chọn **Deploy → New deployment → Web app**.
2. Chọn **Execute as: Me**.
3. Chọn **Who has access: Anyone** để khách truy cập website có thể gửi biểu mẫu.
4. Nhấn **Deploy**, cấp quyền nếu được yêu cầu và sao chép URL kết thúc bằng `/exec`.

## 3. Kết nối website với Web App

Mở `script.js`, tìm dòng:

```js
const SUPPORT_WEB_APP_URL = 'PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
```

Thay nội dung placeholder bằng URL `/exec` vừa sao chép. Không thay URL đăng ký khóa học hiện có.

## 4. Cách dữ liệu được lưu

- Yêu cầu hỗ trợ được thêm vào trang tính `YeuCauHoTro`.
- Tài liệu đóng góp được thêm vào trang tính `DongGopTaiLieu`.
- Tệp đính kèm (nếu có) được lưu trong thư mục Google Drive do hàm thiết lập tạo ra; đường dẫn tệp được ghi vào Google Sheets.
- Tệp được giới hạn tối đa 5MB. Chấp nhận PDF, Word, PowerPoint, Excel, CSV, TXT, JPG, PNG và ZIP.
- Tệp và bảng tính không được tự động chia sẻ công khai. Quản trị viên truy cập bằng tài khoản Google đã triển khai Apps Script.

## 5. Cập nhật phiên bản sau này

Khi sửa `Code.gs`, vào **Deploy → Manage deployments → Edit** để tạo phiên bản triển khai mới. Nếu tạo deployment mới, cần cập nhật lại URL trong `script.js`.

> Lưu ý: backend chỉ thực sự hoạt động sau khi bạn tự chạy `setupSupportDatabase`, triển khai Web App và điền URL. Các thao tác này cần quyền truy cập Google của bạn nên không thể thực hiện thay cho bạn trong các tệp mã nguồn.
