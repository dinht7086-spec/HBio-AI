/**
 * Chuyển đổi giữa các trang (sections)
 * @param {string} pageId - ID của section muốn hiển thị
 */
function showPage(pageId) {
    // 1. Ẩn tất cả các section
    const sections = document.querySelectorAll('.page-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });

    // 2. Gỡ bỏ trạng thái active của tất cả link trên navbar
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
    });

    // 3. Hiển thị section được chọn
    const targetSection = document.getElementById(pageId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // 4. Kích hoạt màu sắc cho link tương ứng trên navbar
    navLinks.forEach(link => {
        // Kiểm tra xem thuộc tính onclick của link có chứa pageId không
        const clickHandler = link.getAttribute('onclick');
        if (clickHandler && clickHandler.includes(pageId)) {
            link.classList.add('active');
        }
    });

    // 5. Cuộn trang về đầu với hiệu ứng mượt mà
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Lắng nghe sự kiện khi trang web tải xong (tùy chọn)
document.addEventListener('DOMContentLoaded', () => {
    console.log("Hệ thống học liệu Tin Học đã sẵn sàng!");
});

/* --- LOGIC CHO TRANG DEV TOOLS --- */

// 1. Tính độ phức tạp
function checkComplexity() {
    const input = document.getElementById('n-input').value.trim();
    const resultBox = document.getElementById('complexity-result');
    
    // Chuyển đổi 10^5 hoặc 1e5 thành số
    let n = input.toLowerCase().replace('10^', '1e');
    try {
        n =  eval(n);
    } catch (e) {
        n = parseFloat(n);
    }

    if (!n || isNaN(n)) {
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
    else if (n <=1e6) complexity =  "O(N log N)"
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
    if(snippets[type]) {
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

// Khởi tạo snippet mặc định khi tải trang
window.onload = function() {
    updateSnippet();
}
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
    
    if(fill && text) {
        fill.style.width = percent + '%';
        fill.innerText = percent + '%';
        text.innerText = `Bạn đã hoàn thành ${completedCount}/${allTasks.length} nhiệm vụ.`;
    }
}

// Hàm tải lại dữ liệu cũ khi người dùng quay lại web
function loadProgress() {
    allTasks.forEach(task => {
        // Nếu trong bộ nhớ có lưu task này là done
        if (localStorage.getItem(task) === 'done') {
            // Tìm thẻ div chứa onclick="toggleTask(..., 'taskName')"
            const el = document.querySelector(`div[onclick*="${task}"]`);
            if (el) {
                el.classList.add('completed');
            }
        }
    });
    // Tính lại thanh progress
    updateProgressBar();
}

// --- LOGIC CHO TRANG KHÓA HỌC ---

// Hàm chọn khóa học từ nút "Đăng ký ngay"
function selectCourse(courseValue) {
    // 1. Cuộn xuống phần form
    const formSection = document.getElementById('register-form-section');
    formSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // 2. Chọn option tương ứng trong select box
    const selectBox = document.getElementById('courseSelect');
    selectBox.value = courseValue;
    
    // 3. Hiệu ứng focus nhẹ để người dùng biết đã chọn
    selectBox.style.borderColor = 'var(--primary-color)';
    setTimeout(() => {
        selectBox.style.borderColor = ''; // Trả về mặc định sau 1s
    }, 1000);
}

// --- CẬP NHẬT HÀM CHUYỂN TRANG (Thay thế hàm showPage cũ) ---
function showPage(pageId) {
    // 1. Ẩn TẤT CẢ các section đang có
    const sections = document.querySelectorAll('.page-section');
    sections.forEach(section => {
        section.style.display = 'none'; // Ẩn hết
    });

    // 2. Hiện section được chọn
    const targetSection = document.getElementById(pageId);
    if (targetSection) {
        // Nếu là trang courses hoặc algorithms, dùng grid/block tùy thiết kế
        // Cách an toàn nhất là xóa thuộc tính display none để nó về mặc định của CSS
        targetSection.style.display = ''; 
        
        // Nếu xóa display='' mà vẫn không lên, hãy dùng dòng dưới:
        if(window.getComputedStyle(targetSection).display === 'none') {
             targetSection.style.display = 'block';
        }
    } else {
        console.error("Không tìm thấy trang có id: " + pageId);
    }

    // 3. Cập nhật màu active cho Menu
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
        // Kiểm tra xem nút này có phải nút vừa bấm không
        if (link.getAttribute('onclick').includes("'" + pageId + "'")) {
            link.classList.add('active');
        }
    });

    // 4. Cuộn lên đầu trang cho đẹp
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// URL Web App của bạn (Không thay đổi)
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwII0pIbUNxliEQbR_Yn2GJ5ZSjyMFP47Vruqg1jLrtKiaiGdUOsQSssEjhfPasX8b4Mw/exec"; 

document.addEventListener('DOMContentLoaded', function() {
    
    // 1. XỬ LÝ FORM ĐĂNG KÝ KHÓA HỌC (ID mới là courseForm)
    const courseForm = document.getElementById('courseForm');
    if (courseForm) {
        courseForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Chặn load lại trang
            handleFormSubmit(event.target, "register_course");
        });
    }

    // 2. XỬ LÝ FORM HỖ TRỢ (Giữ nguyên)
    const supportForm = document.getElementById('supportForm');
    if (supportForm) {
        supportForm.addEventListener('submit', function(event) {
            event.preventDefault(); 
            handleFormSubmit(event.target, "send_support");
        });
    }
    // --- PHẦN XỬ LÝ GIAO DIỆN UPLOAD FILE MỚI ---
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const fileNameText = document.getElementById('fileNameText');

    // Chỉ chạy nếu đang ở trang có support form
    if (dropZone && fileInput) {
        
        // 1. Click vào vùng dropZone thì kích hoạt input file ẩn
        dropZone.addEventListener('click', () => fileInput.click());

        // 2. Xử lý khi chọn file qua nút bấm bình thường
        fileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                showFileName(this.files[0].name);
            }
        });

        // 3. Các sự kiện Kéo & Thả (Drag & Drop)
        // Ngăn chặn hành động mặc định của trình duyệt khi kéo file
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });

        // Hiệu ứng khi kéo file vào vùng chọn
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, highlight, false);
        });
        
        // Tắt hiệu ứng khi kéo ra ngoài
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, unhighlight, false);
        });

        // Xử lý khi thả file vào
        dropZone.addEventListener('drop', handleDrop, false);
    }

    // --- CÁC HÀM HỖ TRỢ CHO UPLOAD ---
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight() {
        dropZone.classList.add('drag-over');
    }

    function unhighlight() {
        dropZone.classList.remove('drag-over');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            // Gán file vừa thả vào cho input ẩn
            fileInput.files = files;
            // Hiển thị tên file
            showFileName(files[0].name);
        }
    }

    function showFileName(name) {
        fileNameText.textContent = name;
        fileNameDisplay.style.display = 'flex';
        dropZone.style.display = 'none'; // Ẩn vùng chọn đi cho gọn
    }

    // Hàm xóa file đã chọn (được gọi từ HTML onclick)
    window.removeSelectedFile = function() {
        fileInput.value = ''; // Reset input
        fileNameDisplay.style.display = 'none'; // Ẩn tên file
        dropZone.style.display = 'block'; // Hiện lại vùng chọn
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
        fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        })
        .then(response => {
            alert("✅ Đăng ký thành công! Chúng tôi sẽ liên hệ sớm.");
            form.reset();
        })
        .catch(error => {
            alert("✅ Đã gửi thông tin! (Hệ thống đã ghi nhận).");
            form.reset();
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
        reader.onload = function(e) {
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
    fileInput.addEventListener('change', (e) => {
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

    btnRemoveFile.addEventListener('click', () => {
        selectedFile = null;
        fileInput.value = '';
        filePreviewContainer.style.display = 'none';
    });

    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    chatInput.addEventListener('keydown', function(e) {
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
        fileInput.value = '';
        filePreviewContainer.style.display = 'none';

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

    // ==========================================
// TÍCH HỢP GỬI FORM HỖ TRỢ LÊN GOOGLE SHEETS
// ==========================================
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz3xQOnsRmr7v1l0Ef1UQYJW0OoqnD_D3Z4RI17FMQ5CeQ0k9pPWrPrUE4qjUKIgPEJ/exec'; // Nhớ thay URL của bạn vào đây

async function handleSupport(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Đổi trạng thái nút bấm
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';
    submitBtn.disabled = true;

    // Đã đổi tên biến thành supportFileInput
    const supportFileInput = document.getElementById('fileInput');
    let fileData = null;
    let fileName = null;
    let mimeType = null;

    if (supportFileInput && supportFileInput.files.length > 0) {
        const file = supportFileInput.files[0];
        fileName = file.name;
        mimeType = file.type;
        const base64Full = await getBase64(file);
        fileData = base64Full.split(',')[1]; 
    }

    const payload = {
        name: form.name.value,
        contact: form.contact.value,
        category: form.category.value,
        message: form.message.value,
        fileName: fileName,
        mimeType: mimeType,
        fileData: fileData
    };

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        if (result.result === 'success') {
            alert('Gửi yêu cầu thành công! Cảm ơn bạn.');
            form.reset();
            removeSelectedFile(); 
        } else {
            alert('Lỗi hệ thống: ' + result.error);
        }
    } catch (error) {
        alert('Lỗi kết nối mạng, vui lòng thử lại sau.');
    } finally {
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Gửi Yêu Cầu';
        submitBtn.disabled = false;
    }
}

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Xử lý giao diện: Đã đổi toàn bộ tên biến tránh xung đột
const supportDropZone = document.getElementById('dropZone');
const supportFileInputDOM = document.getElementById('fileInput');
const supportFileNameDisplay = document.getElementById('fileNameDisplay');
const supportFileNameText = document.getElementById('fileNameText');

if (supportDropZone && supportFileInputDOM) {
    supportDropZone.addEventListener('click', () => supportFileInputDOM.click());
    
    supportFileInputDOM.addEventListener('change', function() {
        if (this.files.length > 0) {
            supportFileNameText.textContent = this.files[0].name;
            supportFileNameDisplay.style.display = 'flex';
        }
    });

    supportDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        supportDropZone.style.borderColor = '#10b981';
    });

    supportDropZone.addEventListener('dragleave', () => {
        supportDropZone.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    });

    supportDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        supportDropZone.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        if (e.dataTransfer.files.length > 0) {
            supportFileInputDOM.files = e.dataTransfer.files;
            supportFileNameText.textContent = supportFileInputDOM.files[0].name;
            supportFileNameDisplay.style.display = 'flex';
        }
    });
}

function removeSelectedFile() {
    const fileInp = document.getElementById('fileInput');
    const fileDisp = document.getElementById('fileNameDisplay');
    if (fileInp) fileInp.value = '';
    if (fileDisp) fileDisp.style.display = 'none';
}
});