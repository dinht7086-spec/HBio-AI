/** Chuyển đổi các khu vực nội dung chính trên trang chủ. */
function showPage(pageId) {
    const targetSection = document.getElementById(pageId);
    if (!targetSection || !targetSection.classList.contains('page-section')) {
        console.warn(`Không tìm thấy khu vực nội dung: ${pageId}`);
        return false;
    }

    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.toggle('active', section === targetSection);
    });

    document.querySelectorAll('.nav-link[data-page]').forEach(link => {
        const isActive = link.dataset.page === pageId;
        link.classList.toggle('active', isActive);
        if (isActive) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
    return false;
}

document.addEventListener('DOMContentLoaded', () => {
    const scrollWatcher = document.querySelector('.scroll-watcher');
    if (scrollWatcher) {
        const updateScrollProgress = () => {
            const pageHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = pageHeight > 0 ? (window.scrollY / pageHeight) * 100 : 0;
            scrollWatcher.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        };
        window.addEventListener('scroll', updateScrollProgress, { passive: true });
        window.addEventListener('resize', updateScrollProgress);
        updateScrollProgress();
    }
});

/* --- LOGIC CHO TRANG DEV TOOLS --- */

// 1. Tính độ phức tạp
function checkComplexity() {
    const input = document.getElementById('n-input').value.trim();
    const resultBox = document.getElementById('complexity-result');

    // Chấp nhận số thường, dạng 1e5 hoặc 10^5; không thực thi chuỗi người dùng nhập.
    const normalizedInput = input.toLowerCase().replace(/^10\s*\^\s*(\d+)$/, '1e$1');
    const n = Number(normalizedInput);

    if (!input || !Number.isFinite(n) || n <= 0) {
        resultBox.innerHTML = "Vui lòng nhập số hợp lệ (VD: 1000 hoặc 10^5)";
        resultBox.className = "result-box show";
        return;
    }

    let complexity = "";
    if (n <= 12) complexity = "O(N!)";
    else if (n <= 25) complexity = "O(2^N)";
    else if (n <= 400) complexity = "O(N^3)";
    else if (n <= 5000) complexity = "O(N^2)";
    else if (n <= 2e5) complexity = "O(N log N) hoặc O(N log(N)^2)";
    else if (n <= 1e6) complexity = "O(N log N)"
    else if (n <= 1e7) complexity = "O(N) - Duyệt tuyến tính";
    else complexity = "O(log N) hoặc O(1) - Binary Search / Math";

    resultBox.innerHTML = `<strong>Với N = ${input}:</strong><br>Độ phức tạp đề xuất: <span style="color: #34d399">${complexity}</span>`;
    resultBox.className = "result-box show";
}

// 2. Snippet Generator
const snippets = {
    basic: `#include <bits/stdc++.h>
using namespace std;
#define ll long long

void solve() {
    // Code here
}

int main() {
    ios_base::sync_with_stdio(false); cin.tie(NULL);
    int t = 1;
    // cin >> t;
    while(t--) solve();
    return 0;
}`,
    graph: `vector<int> adj[100005];
bool visited[100005];

void dfs(int u) {
    visited[u] = true;
    for (int v : adj[u]) {
        if (!visited[v]) dfs(v);
    }
}`,
    segment: `const int MAXN = 100005;
int t[4 * MAXN];

void build(int a[], int v, int tl, int tr) {
    if (tl == tr) t[v] = a[tl];
    else {
        int tm = (tl + tr) / 2;
        build(a, v*2, tl, tm);
        build(a, v*2+1, tm+1, tr);
        t[v] = t[v*2] + t[v*2+1];
    }
}`
};

function updateSnippet() {
    const type = document.getElementById('snippet-select').value;
    let code = snippets[type] ? snippets[type] : "// Chọn loại snippet";
    code = code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    document.getElementById('snippet-code').innerHTML = code;
}

function copySnippet() {
    const type = document.getElementById('snippet-select').value;
    if (snippets[type]) {
        navigator.clipboard.writeText(snippets[type]);
        alert("Đã copy code!");
    }
}

// 3. Simple Formatter
function formatCode() {
    let code = document.getElementById('raw-code').value;
    let formatted = "";
    let indent = 0;
    const lines = code.split('\n');

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        if (line.startsWith("}")) indent--;
        formatted += "    ".repeat(Math.max(0, indent)) + line + "\n";
        if (line.endsWith("{")) indent++;
    }
    formatted = formatted.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    document.getElementById('formatted-code').innerHTML = formatted;
}

// Khởi tạo snippet khi có giao diện Dev Tools.
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('snippet-select')) updateSnippet();
});
/* =========================================
   ROADMAP LOGIC (LƯU TRỮ TIẾN ĐỘ)
   ========================================= */

// Danh sách các ID nhiệm vụ
const allTasks = ['task1', 'task2', 'task3', 'task4', 'task5', 'task6'];

// Hàm chạy khi trang web tải xong
document.addEventListener('DOMContentLoaded', () => {
    loadProgress();
});

// Hàm xử lý khi click vào một module học tập
function toggleTask(element, taskId) {
    // 1. Đảo ngược trạng thái completed
    element.classList.toggle('completed');

    // 2. Kiểm tra xem có class completed không để lưu trạng thái
    const isDone = element.classList.contains('completed');

    // 3. Lưu vào LocalStorage của trình duyệt
    if (isDone) {
        localStorage.setItem(taskId, 'done');
    } else {
        localStorage.removeItem(taskId);
    }

    // 4. Cập nhật lại thanh tiến độ
    updateProgressBar();
}

// Hàm cập nhật thanh hiển thị %
function updateProgressBar() {
    let completedCount = 0;

    allTasks.forEach(task => {
        if (localStorage.getItem(task) === 'done') {
            completedCount++;
        }
    });

    const percent = Math.round((completedCount / allTasks.length) * 100);

    // Cập nhật giao diện
    const fill = document.getElementById('total-progress');
    const text = document.getElementById('progress-text');

    if (fill && text) {
        fill.style.width = percent + '%';
        fill.innerText = percent + '%';
        const progressBar = fill.parentElement;
        if (progressBar) progressBar.setAttribute('aria-valuenow', String(percent));
        text.innerText = `Bạn đã hoàn thành ${completedCount}/${allTasks.length} nhiệm vụ.`;
    }
}

// Hàm tải lại dữ liệu cũ khi người dùng quay lại web
function loadProgress() {
    allTasks.forEach(task => {
        // Nếu trong bộ nhớ có lưu task này là done
        if (localStorage.getItem(task) === 'done') {
            // Tìm thẻ div chứa onclick="toggleTask(..., 'taskName')"
            const el = document.querySelector(`[onclick*="${task}"]`);
            if (el) {
                el.classList.add('completed');
            }
        }
    });
    // Tính lại thanh progress
    updateProgressBar();
}

// URL Web App của bạn (Không thay đổi)
const COURSE_GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwII0pIbUNxliEQbR_Yn2GJ5ZSjyMFP47Vruqg1jLrtKiaiGdUOsQSssEjhfPasX8b4Mw/exec";

document.addEventListener('DOMContentLoaded', () => {
    const courseForm = document.getElementById('courseForm');
    if (courseForm) {
        courseForm.addEventListener('submit', event => {
            event.preventDefault();
            handleFormSubmit(event.currentTarget, 'register_course');
        });
    }
});

/**
 * Hàm mới: Khi bấm nút "Đăng ký ngay" ở các thẻ Card
 * - Tự động cuộn xuống form
 * - Tự động chọn khóa học tương ứng
 */
function selectCourse(courseName) {
    const selectBox = document.getElementById('courseSelect');
    const formSection = document.getElementById('register-form-section');

    if (selectBox && formSection) {
        // 1. Gán giá trị cho ô select
        selectBox.value = courseName;

        // 2. Cuộn mượt xuống phần form
        formSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // 3. (Tùy chọn) Hiệu ứng nháy nhẹ để gây chú ý
        formSection.style.transition = "box-shadow 0.3s";
        formSection.style.boxShadow = "0 0 20px rgba(16, 185, 129, 0.5)";
        setTimeout(() => {
            formSection.style.boxShadow = "none";
        }, 1000);
    }
}

/**
 * Hàm xử lý gửi dữ liệu chung (Không đổi logic)
 */
function handleFormSubmit(form, actionType) {
    const btn = form.querySelector('button[type="submit"]');
    const originalBtnText = btn.innerHTML;
    const fileInput = form.querySelector('input[type="file"]');

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';
    btn.disabled = true;

    const formData = new FormData(form);
    const dataPayload = Object.fromEntries(formData.entries());
    dataPayload.action = actionType;

    // Hàm con gửi fetch
    const sendData = (payload) => {
        fetch(COURSE_GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                alert("✅ Đã gửi thông tin đăng ký. Chúng tôi sẽ liên hệ sớm.");
                form.reset();
            })
            .catch(error => {
                console.error('Lỗi gửi biểu mẫu đăng ký:', error);
                alert("Không thể xác nhận việc gửi đăng ký. Vui lòng kiểm tra kết nối hoặc liên hệ quản trị viên.");
            })
            .finally(() => {
                btn.innerHTML = originalBtnText;
                btn.disabled = false;
            });
    };

    // Logic xử lý file (cho form support)
    if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        if (file.size > 5 * 1024 * 1024) {
            alert("⚠️ File quá lớn (>5MB).");
            btn.innerHTML = originalBtnText;
            btn.disabled = false;
            return;
        }
        const reader = new FileReader();
        reader.onload = function (e) {
            dataPayload.fileData = e.target.result.split(',')[1];
            dataPayload.fileName = file.name;
            dataPayload.mimeType = file.type;
            sendData(dataPayload);
        };
        reader.readAsDataURL(file);
    } else {
        sendData(dataPayload);
    }
}
document.addEventListener('DOMContentLoaded', () => {

    // 1. CẤU HÌNH API
    const API_KEY = 'AIzaSyClzlHVaAeyUZoRoBu6_HpQEeLXOBLN4ME'; // <-- NHỚ DÁN LẠI API KEY NHÉ
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

    let chatHistory = [];
    let selectedFile = null; // Biến lưu trữ file đang chọn

    // 2. LẤY CÁC DOM ELEMENTS
    const chatContainer = document.getElementById('chat-container');
    const welcomeScreen = document.getElementById('welcome-screen');
    const suggestCards = document.querySelectorAll('.suggest-card');
    // Bấm vào thẻ gợi ý sẽ điền chữ vào ô nhập
    suggestCards.forEach(card => {
        card.addEventListener('click', () => {
            const promptText = card.getAttribute('data-prompt');
            chatInput.value = promptText;
            chatInput.focus();

            // Cập nhật lại chiều cao của ô textarea
            chatInput.style.height = 'auto';
            chatInput.style.height = (chatInput.scrollHeight) + 'px';
        });
    });
    const chatInput = document.getElementById('chat-input');
    const btnSend = document.getElementById('btn-send');
    const fileInput = document.getElementById('file-input');
    const filePreviewContainer = document.getElementById('file-preview-container');
    const fileNameDisplay = document.getElementById('file-name-display');
    const btnRemoveFile = document.getElementById('btn-remove-file');

    if (!chatInput || !btnSend || !chatContainer) return;

    // 3. SỰ KIỆN CHỌN FILE
    if (fileInput) fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            selectedFile = e.target.files[0];

            // Cảnh báo nếu file quá lớn
            if (selectedFile.size > 5 * 1024 * 1024) {
                alert("Vui lòng chọn file dưới 5MB để AI đọc nhanh hơn nhé!");
                selectedFile = null;
                fileInput.value = '';
                return;
            }

            fileNameDisplay.innerHTML = `<i class="fa-solid fa-paperclip"></i> ${selectedFile.name}`;
            filePreviewContainer.style.display = 'flex';
            chatInput.focus();
        }
    });

    if (btnRemoveFile) btnRemoveFile.addEventListener('click', () => {
        selectedFile = null;
        if (fileInput) fileInput.value = '';
        if (filePreviewContainer) filePreviewContainer.style.display = 'none';
    });

    chatInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    chatInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    btnSend.addEventListener('click', sendMessage);

    function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }

    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsText(file);
        });
    }

    // 4. HÀM GỬI TIN NHẮN (ĐÃ SỬA LỖI HIỂN THỊ FILE)
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text && !selectedFile) return;
        if (welcomeScreen) welcomeScreen.style.display = 'none';
        // --- BƯỚC MỚI: TẠO GIAO DIỆN HIỂN THỊ FILE CHO NGƯỜI DÙNG ---
        let attachmentHTML = "";
        let fileToProcess = selectedFile; // Lưu lại file tạm để hiển thị

        if (fileToProcess) {
            // Nếu là hình ảnh -> Hiển thị ảnh thu nhỏ tuyệt đẹp
            if (fileToProcess.type.startsWith('image/')) {
                const imgURL = URL.createObjectURL(fileToProcess);
                attachmentHTML = `
                    <div style="margin-top: 10px; border-radius: 8px; overflow: hidden; max-width: 250px; border: 1px solid rgba(16, 185, 129, 0.3);">
                        <img src="${imgURL}" style="width: 100%; display: block; object-fit: cover;">
                    </div>
                `;
            } else {
                // Nếu là file code/text -> Hiển thị thẻ tên file
                attachmentHTML = `
                    <div style="margin-top: 10px; padding: 10px 15px; background: rgba(16, 185, 129, 0.1); border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.3); display: inline-flex; align-items: center; gap: 10px; font-size: 0.9rem; font-family: var(--font-code);">
                        <i class="fa-solid fa-file-code" style="color: var(--primary-color); font-size: 1.2rem;"></i> 
                        <span>${fileToProcess.name}</span>
                    </div>
                `;
            }
        }

        let displayText = text || (fileToProcess ? "Hãy phân tích file đính kèm này." : "");

        // Gọi hàm hiển thị (Truyền thêm HTML của file)
        appendMessage('user', displayText, false, attachmentHTML);

        // Reset khung nhập liệu ngay lập tức
        chatInput.value = '';
        chatInput.style.height = 'auto';
        selectedFile = null;
        if (fileInput) fileInput.value = '';
        if (filePreviewContainer) filePreviewContainer.style.display = 'none';

        const loadingId = appendLoading();
        let userParts = [];

        // Đẩy chữ vào dữ liệu API
        if (text) {
            userParts.push({ text: text });
        } else if (fileToProcess) {
            userParts.push({ text: "Hãy phân tích chi tiết file đính kèm này." });
        }

        // Đẩy file vào dữ liệu API
        if (fileToProcess) {
            try {
                const isTextFile = fileToProcess.type.startsWith('text/') || fileToProcess.name.match(/\.(c|cpp|py|java|js|html|css|txt)$/i);

                if (isTextFile) {
                    const fileContent = await readFileAsText(fileToProcess);
                    userParts.push({ text: `\n\n--- NỘI DUNG FILE: ${fileToProcess.name} ---\n\`\`\`\n${fileContent}\n\`\`\`` });
                } else {
                    const base64Data = await readFileAsBase64(fileToProcess);
                    userParts.push({
                        inlineData: {
                            mimeType: fileToProcess.type || 'image/jpeg',
                            data: base64Data
                        }
                    });
                }
            } catch (err) {
                removeLoading(loadingId);
                appendMessage('ai', `**Lỗi đọc file:** ${err.message}`, true);
                return;
            }
        }

        chatHistory.push({ role: "user", parts: userParts });

        const systemInstruction = "Bạn là CodeZen AI. Hỗ trợ phân tích mã nguồn, tạo test case và giải thích thuật toán. Bạn có khả năng đọc hình ảnh chụp đề bài và đọc trực tiếp file code học sinh tải lên. Luôn sử dụng Markdown để bôi màu code.";

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemInstruction }] },
                    contents: chatHistory
                })
            });

            const data = await response.json();
            removeLoading(loadingId);

            if (!response.ok) {
                throw new Error(data.error?.message || 'Lỗi kết nối API');
            }

            const aiText = data.candidates[0].content.parts[0].text;

            // Xóa file ảnh nặng khỏi lịch sử để chat mượt hơn
            const cleanUserParts = userParts.filter(part => !part.inlineData);
            chatHistory[chatHistory.length - 1].parts = cleanUserParts;

            chatHistory.push({ role: "model", parts: [{ text: aiText }] });
            appendMessage('ai', aiText, true);

        } catch (error) {
            removeLoading(loadingId);
            appendMessage('ai', `**Lỗi:** ${error.message}`, true);
        }
    }

    // 5. HÀM HIỂN THỊ ĐÃ ĐƯỢC CẬP NHẬT ĐỂ NHẬN FILE
    function appendMessage(sender, text, isMarkdown = false, attachmentHTML = "") {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${sender}-message`;
        const avatarStr = sender === 'user' ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-robot"></i>';

        let contentHTML = text;
        if (isMarkdown) {
            contentHTML = marked.parse(text);
        } else {
            // Biến HTML người dùng nhập thành text thường để chống lỗi
            contentHTML = text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
        }

        // CHÈN THÊM GIAO DIỆN FILE AN TOÀN VÀO ĐÂY
        if (attachmentHTML) {
            contentHTML += attachmentHTML;
        }

        msgDiv.innerHTML = `
            <div class="message-avatar">${avatarStr}</div>
            <div class="message-content">${contentHTML}</div>
        `;

        chatContainer.appendChild(msgDiv);

        if (isMarkdown && window.MathJax) {
            MathJax.typesetPromise([msgDiv]).catch((err) => console.log('Lỗi MathJax:', err));
        }
        if (isMarkdown) {
            msgDiv.querySelectorAll('pre').forEach((preBlock) => {
                const codeBlock = preBlock.querySelector('code');
                if (codeBlock) hljs.highlightElement(codeBlock);

                const copyBtn = document.createElement('button');
                copyBtn.className = 'copy-code-btn';
                copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> Sao chép';
                copyBtn.addEventListener('click', () => {
                    const codeText = codeBlock ? codeBlock.innerText : preBlock.innerText;
                    navigator.clipboard.writeText(codeText).then(() => {
                        copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Đã chép';
                        copyBtn.style.color = 'var(--primary-color)';
                        setTimeout(() => {
                            copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> Sao chép';
                            copyBtn.style.color = '#94a3b8';
                        }, 2000);
                    });
                });
                preBlock.appendChild(copyBtn);
            });
        }
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function appendLoading() {
        const id = 'loading-' + Date.now();
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ai-message`;
        msgDiv.id = id;
        msgDiv.innerHTML = `
            <div class="message-avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="message-content" style="background: transparent; border: none; padding: 15px 0;">
                <div class="typing-indicator"><span></span><span></span><span></span></div>
            </div>
        `;
        chatContainer.appendChild(msgDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        return id;
    }

    function removeLoading(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }
});

/* =========================================
   BIO SPHERE - FORM HỖ TRỢ / ĐÓNG GÓP TÀI LIỆU
   ========================================= */

// Dán URL Web App /exec của dự án Apps Script mới vào hằng số này.
const SUPPORT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzQ_icrr34ZbRXp_68lPsvv6_h9UXrd3Z-di20p6p4r7Ys7aBTi-maRt1gtp_NbVIEkcQ/exec';
const SUPPORT_MAX_FILE_SIZE = 5 * 1024 * 1024;
const SUPPORT_ALLOWED_EXTENSIONS = [
    'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'csv', 'txt',
    'jpg', 'jpeg', 'png', 'zip'
];

function initSupportForm() {
    const form = document.getElementById('supportForm');
    if (!form) return;

    const typeSelect = document.getElementById('requestType');
    const supportFields = document.getElementById('supportFields');
    const contributionFields = document.getElementById('contributionFields');
    const supportCategory = document.getElementById('supportCategory');
    const resourceTitle = document.getElementById('resourceTitle');
    const resourceSubject = document.getElementById('resourceSubject');
    const resourceUrl = document.getElementById('resourceUrl');
    const messageLabel = document.getElementById('messageLabel');
    const messageInput = document.getElementById('supportMessage');
    const messageHint = document.getElementById('messageHint');
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const fileNameText = document.getElementById('fileNameText');
    const submitButton = form.querySelector('button[type="submit"]');
    const statusBox = document.getElementById('supportStatus');
    const responseFrame = document.getElementById('support-response-frame');
    // Lưu yêu cầu đang chờ phản hồi để sử dụng lại khi thử gửi lần nữa.
    let pendingSubmission = null;
    let isSubmitting = false;

    if (!typeSelect || !fileInput || !submitButton || !statusBox) return;

    function setStatus(message, state = '') {
        statusBox.textContent = message;
        statusBox.className = `support-status${state ? ` is-${state}` : ''}`;
    }
    // Khóa các trường trong lúc gửi hoặc chờ xác nhận.
    // Không khóa nút gửi để người dùng có thể thử xác nhận lại.
    function lockSupportFields(locked) {
        form.querySelectorAll(
            'input, select, textarea, button[type="button"]'
        ).forEach(control => {
            control.disabled = locked;
        });

        if (!locked) {
            updateRequestType();
        }
    }

    // Chỉ nhận phản hồi từ Google Apps Script.
    function isTrustedGoogleOrigin(origin) {
        try {
            const hostname = new URL(origin).hostname;

            return hostname === 'script.google.com' ||
                hostname.endsWith('.googleusercontent.com');

        } catch (error) {
            return false;
        }
    }

    function updateRequestType() {
        const isContribution = typeSelect.value === 'contribution';
        supportFields.hidden = isContribution;
        contributionFields.hidden = !isContribution;

        supportCategory.disabled = isContribution;
        supportCategory.required = !isContribution;
        resourceTitle.disabled = !isContribution;
        resourceTitle.required = isContribution;
        resourceSubject.disabled = !isContribution;
        resourceUrl.disabled = !isContribution;

        messageLabel.innerHTML = isContribution
            ? 'Mô tả tài liệu / nguồn đóng góp <span>*</span>'
            : 'Nội dung chi tiết <span>*</span>';
        messageInput.placeholder = isContribution
            ? 'Giới thiệu nội dung, nguồn gốc hoặc giá trị của tài liệu...'
            : 'Mô tả câu hỏi, vấn đề hoặc phản ánh của bạn...';
        messageHint.textContent = isContribution
            ? 'Bạn có thể ghi chú thêm nội dung, tác giả hoặc phạm vi sử dụng của tài liệu.'
            : 'Mô tả càng cụ thể, chúng tôi càng dễ hỗ trợ bạn.';
        submitButton.innerHTML = isContribution
            ? '<i class="fa-solid fa-leaf"></i> Gửi đóng góp tài liệu'
            : '<i class="fa-solid fa-paper-plane"></i> Gửi yêu cầu hỗ trợ';
        setStatus('');
    }

    function displaySelectedFile(file) {
        if (!file) return;
        fileNameText.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
        fileNameDisplay.hidden = false;
        dropZone.classList.add('has-file');
    }

    function validateFile(file) {
        const extension = file.name.split('.').pop().toLowerCase();
        if (!SUPPORT_ALLOWED_EXTENSIONS.includes(extension)) {
            setStatus('Định dạng tệp chưa được hỗ trợ. Vui lòng chọn PDF, Office, ảnh, TXT hoặc ZIP.', 'error');
            return false;
        }
        if (file.size > SUPPORT_MAX_FILE_SIZE) {
            setStatus('Tệp vượt quá giới hạn 5MB. Vui lòng chọn tệp nhỏ hơn.', 'error');
            return false;
        }
        setStatus('');
        return true;
    }

    function assignDroppedFile(file) {
        if (!validateFile(file)) {
            fileInput.value = '';
            return;
        }
        const transfer = new DataTransfer();
        transfer.items.add(file);
        fileInput.files = transfer.files;
        displaySelectedFile(file);
    }

    typeSelect.addEventListener('change', updateRequestType);
    updateRequestType();

    fileInput.addEventListener('change', () => {
        if (!fileInput.files.length) return;
        const file = fileInput.files[0];
        if (validateFile(file)) displaySelectedFile(file);
        else removeSelectedFile();
    });

    if (dropZone) {
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, event => {
                event.preventDefault();
                dropZone.classList.add('drag-over');
            });
        });
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, event => {
                event.preventDefault();
                dropZone.classList.remove('drag-over');
            });
        });
        dropZone.addEventListener('drop', event => {
            const file = event.dataTransfer && event.dataTransfer.files[0];
            if (file) assignDroppedFile(file);
        });
        dropZone.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                fileInput.click();
            }
        });
    }


    form.addEventListener('submit', async event => {
        event.preventDefault();

        // Không cho phép nhiều lần gửi đồng thời.
        if (isSubmitting) return;

        const isRetry = Boolean(pendingSubmission);

        if (!isRetry && !form.reportValidity()) return;

        if (!/^https:\/\/script\.google\.com\/macros\/s\//.test(SUPPORT_WEB_APP_URL) ||
            SUPPORT_WEB_APP_URL.includes('PASTE_GOOGLE')) {

            setStatus(
                'Chưa cấu hình URL Google Apps Script. Hãy kiểm tra SUPPORT_WEB_APP_URL trong script.js.',
                'error'
            );
            return;
        }

        if (!isRetry) {
            const selectedFile = fileInput.files[0] || null;

            if (selectedFile && !validateFile(selectedFile)) return;
        }

        isSubmitting = true;

        submitButton.disabled = true;
        submitButton.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...';

        setStatus(
            isRetry
                ? 'Đang kiểm tra lại yêu cầu đã gửi...'
                : 'Đang gửi dữ liệu đến hệ thống...',
            'pending'
        );

        try {
            // Chỉ tạo payload một lần.
            // Khi gửi lại sẽ sử dụng đúng nonce và dữ liệu ban đầu.
            if (!pendingSubmission) {
                const selectedFile = fileInput.files[0] || null;

                let fileData = '';

                if (selectedFile) {
                    const dataUrl = await readSupportFileAsDataUrl(selectedFile);
                    fileData = dataUrl.split(',')[1] || '';
                }

                const isContribution = typeSelect.value === 'contribution';

                const nonce =
                    `bio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

                pendingSubmission = {
                    nonce: nonce,
                    requestType: typeSelect.value,
                    name: form.elements.name.value.trim(),
                    email: form.elements.email.value.trim(),
                    phone: form.elements.phone.value.trim(),
                    category: isContribution
                        ? resourceSubject.value
                        : supportCategory.value,
                    resourceTitle: isContribution
                        ? resourceTitle.value.trim()
                        : '',
                    resourceUrl: isContribution
                        ? resourceUrl.value.trim()
                        : '',
                    message: messageInput.value.trim(),
                    fileName: selectedFile ? selectedFile.name : '',
                    mimeType: selectedFile
                        ? (selectedFile.type || 'application/octet-stream')
                        : '',
                    fileData: fileData
                };

                // Giữ nguyên nội dung trong khi chờ Google xác nhận.
                lockSupportFields(true);
            }

            const frame = responseFrame || createSupportResponseFrame();

            const transportForm = document.createElement('form');

            transportForm.method = 'POST';
            transportForm.action = SUPPORT_WEB_APP_URL;
            transportForm.target = frame.name;
            transportForm.hidden = true;

            const payloadInput = document.createElement('input');

            payloadInput.type = 'hidden';
            payloadInput.name = 'payload';
            payloadInput.value = JSON.stringify(pendingSubmission);

            transportForm.appendChild(payloadInput);
            document.body.appendChild(transportForm);

            const handleResponse = responseEvent => {
                // Kiểm tra nguồn Google và mã phiên thay vì chỉ kiểm tra
                // frame.contentWindow, vì HtmlService có thể dùng iframe trung gian.
                if (!isTrustedGoogleOrigin(responseEvent.origin)) return;

                const result = responseEvent.data;

                if (
                    !result ||
                    result.type !== 'biosphere-support-result' ||
                    result.nonce !== pendingSubmission.nonce
                ) {
                    return;
                }

                window.removeEventListener('message', handleResponse);
                window.clearTimeout(responseTimeout);
                transportForm.remove();

                isSubmitting = false;
                pendingSubmission = null;

                submitButton.disabled = false;
                lockSupportFields(false);

                if (result.status === 'success') {
                    form.reset();

                    removeSelectedFile();
                    updateRequestType();

                    const receivedAtText = result.receivedAt
                        ? ` Thời gian tiếp nhận: ${result.receivedAt}.`
                        : '';

                    const ticketText = result.submissionId
                        ? ` Mã tiếp nhận: ${result.submissionId}.`
                        : '';

                    setStatus(
                        `${result.message || 'Đã gửi thông tin thành công.'}${receivedAtText}${ticketText}`,
                        'success'
                    );

                } else {
                    updateRequestType();

                    setStatus(
                        result.message ||
                        'Hệ thống chưa thể lưu thông tin. Vui lòng thử lại.',
                        'error'
                    );
                }
            };

            window.addEventListener('message', handleResponse);

            // Tăng thời gian chờ phản hồi lên 60 giây.
            const responseTimeout = window.setTimeout(() => {
                window.removeEventListener('message', handleResponse);
                transportForm.remove();

                isSubmitting = false;

                // Không xóa pendingSubmission và không mở khóa dữ liệu.
                // Lần thử tiếp theo sẽ dùng lại mã phiên cũ.
                submitButton.disabled = false;

                submitButton.innerHTML =
                    '<i class="fa-solid fa-rotate"></i> Kiểm tra / gửi lại an toàn';

                setStatus(
                    'Google chưa phản hồi xác nhận. Yêu cầu đang được giữ nguyên trên trang; đừng tải lại trang hoặc tạo yêu cầu mới. Nhấn nút "Kiểm tra / gửi lại an toàn" để thử lại. Hệ thống sẽ dùng cùng mã phiên để tránh ghi trùng.',
                    'pending'
                );

            }, 60000);

            transportForm.submit();

        } catch (error) {
            console.error('Lỗi gửi biểu mẫu hỗ trợ:', error);

            isSubmitting = false;
            submitButton.disabled = false;

            if (pendingSubmission) {
                // Có thể yêu cầu đã tới Google nhưng phản hồi bị lỗi.
                // Giữ nguyên mã phiên để lần gửi lại không tạo bản ghi mới.
                submitButton.innerHTML =
                    '<i class="fa-solid fa-rotate"></i> Kiểm tra / gửi lại an toàn';

                setStatus(
                    'Chưa xác định được kết quả gửi. Hãy nhấn "Kiểm tra / gửi lại an toàn" để xác nhận, không tạo yêu cầu mới.',
                    'pending'
                );

            } else {
                lockSupportFields(false);

                setStatus(
                    `Không thể chuẩn bị thông tin: ${error.message || 'Vui lòng thử lại.'}`,
                    'error'
                );
            }
        }
    });

}

function createSupportResponseFrame() {
    const frame = document.createElement('iframe');
    frame.id = 'support-response-frame';
    frame.name = 'supportResponseFrame';
    frame.title = 'Kết quả gửi biểu mẫu';
    frame.className = 'visually-hidden';
    document.body.appendChild(frame);
    return frame;
}

function readSupportFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Không thể đọc tệp đính kèm.'));
        reader.readAsDataURL(file);
    });
}

function removeSelectedFile() {
    const fileInput = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const dropZone = document.getElementById('dropZone');

    if (fileInput) fileInput.value = '';
    if (fileNameDisplay) fileNameDisplay.hidden = true;
    if (dropZone) dropZone.classList.remove('has-file', 'drag-over');
}

window.removeSelectedFile = removeSelectedFile;
document.addEventListener('DOMContentLoaded', initSupportForm);

