document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. CẤU HÌNH API KEY LINH HOẠT
    // ==========================================
    const DEFAULT_API_KEY = ''; 
    let API_KEY = localStorage.getItem('codezen_api_key') || DEFAULT_API_KEY;
    
    const btnSettings = document.getElementById('btn-settings');
    if(btnSettings) {
        btnSettings.addEventListener('click', () => {
            const currentKey = API_KEY === DEFAULT_API_KEY ? '' : API_KEY;
            const key = prompt("⚙️ Nhập Gemini API Key của riêng bạn:\n(Để trống và nhấn OK nếu muốn dùng key mặc định)", currentKey);
            if (key !== null) {
                API_KEY = key.trim() || DEFAULT_API_KEY;
                localStorage.setItem('codezen_api_key', API_KEY);
                alert("✅ Đã lưu API Key thành công!");
            }
        });
    }
    
    function getApiUrl() {
        // 1. Kiểm tra xem có phải đang chạy trên mạng (Vercel) không?
        const isOnline = window.location.hostname !== 'localhost' && 
                         window.location.hostname !== '127.0.0.1' && 
                         window.location.protocol !== 'file:';

        if (isOnline) {
            return '/api/chat'; // Chạy trên mạng thì dùng Server an toàn
        }
        
        // 2. Nếu chạy trên máy tính (ổ D), dùng API trực tiếp
        if (!API_KEY || API_KEY === '') {
            alert("⚙️ Bạn đang test code trên máy tính. Vui lòng bấm vào icon Bánh Răng ở góc phải màn hình để nhập API Key trước khi chat nhé!");
            return null;
        }
        return `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${API_KEY}`;
    }
    // Cấu hình marked để ngắt dòng thông minh và thụt lề chuẩn
    if (window.marked) {
        marked.setOptions({
            breaks: true,      // Xuống dòng 1 lần là ngắt dòng luôn
            gfm: true,         // Sử dụng GitHub Flavored Markdown
            headerIds: false,
            mangle: false
        });
    }
    // ==========================================
    // 2. KHAI BÁO DOM ELEMENTS
    // ==========================================
    let selectedFiles = [];

    const chatContainer = document.getElementById('chat-container');
    const welcomeScreen = document.getElementById('welcome-screen');
    const suggestCards = document.querySelectorAll('.suggest-card');
    const btnMic = document.getElementById('btn-mic');
    const chatInput = document.getElementById('chat-input');
    const btnSend = document.getElementById('btn-send');
    const btnStop = document.getElementById('btn-stop');
    let abortController = null; // Biến toàn cục để điều khiển ngắt API

    // Lắng nghe sự kiện bấm nút Dừng
    if (btnStop) {
        btnStop.addEventListener('click', () => {
            if (abortController) {
                abortController.abort(); // Kích hoạt tín hiệu ngắt kết nối
            }
        });
    }
    const fileInput = document.getElementById('file-input');
    const filePreviewContainer = document.getElementById('file-preview-container');
    
    const codePanel = document.getElementById('code-panel');
    const btnCloseCode = document.getElementById('btn-close-code');
    const btnDownloadCode = document.getElementById('btn-download-code');
    const codeViewerTitle = document.getElementById('code-viewer-title');
    const codeViewerContent = document.getElementById('code-viewer-content');
    
    const preCodeContainer = document.getElementById('pre-code-container');
    const livePreviewFrame = document.getElementById('live-preview-frame');
    const quickActionBtns = document.querySelectorAll('.btn-quick-action');

    // Elements cho Sidebar (Lịch sử chat)
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    const chatSidebar = document.getElementById('chat-sidebar');
    const mainLayout = document.getElementById('main-layout');
    const btnNewChat = document.getElementById('btn-new-chat');
    const historyList = document.getElementById('history-list');

    if (!chatInput || !btnSend || !chatContainer) {
        console.error("Lỗi: Thiếu giao diện HTML quan trọng!");
        return;
    }

    // --- KHỞI TẠO NÚT CUỘN XUỐNG ĐÁY ---
    const chatWrapperDOM = document.querySelector('.chat-wrapper');
    const scrollBtn = document.createElement('button');
    scrollBtn.className = 'btn-scroll-bottom';
    scrollBtn.innerHTML = '<i class="fa-solid fa-arrow-down"></i>';
    if(chatWrapperDOM) chatWrapperDOM.appendChild(scrollBtn);

    // Lắng nghe sự kiện cuộn của khung chat
    if(chatContainer) {
        chatContainer.addEventListener('scroll', () => {
            // Nếu cuộn lên trên cách đáy hơn 150px thì hiện nút
            if (chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight > 150) {
                scrollBtn.classList.add('show');
            } else {
                scrollBtn.classList.remove('show');
            }
        });
    }

    // Bấm vào nút thì cuộn mượt mà xuống đáy
    scrollBtn.addEventListener('click', () => {
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
    });

    // ==========================================
    // 3. BỘ NÃO ĐA LUỒNG (CHỐNG KẸT LỖI 100%)
    // ==========================================
    let chatSessions = [];
    let currentSessionId = localStorage.getItem('codezen_current_session') || null;

    // ĐỌC DỮ LIỆU AN TOÀN TỪ LOCALSTORAGE
    try {
        const storedData = localStorage.getItem('codezen_sessions');
        if (storedData) {
            chatSessions = JSON.parse(storedData);
            if (!Array.isArray(chatSessions)) chatSessions = [];
        }
    } catch (error) {
        console.error("Dữ liệu cũ bị lỗi, hệ thống sẽ làm mới lại!", error);
        chatSessions = [];
        localStorage.removeItem('codezen_sessions');
    }

    // Nếu không có chat nào, tạo mới
    if (chatSessions.length === 0) {
        createNewSession(false);
    } else if (!currentSessionId || !chatSessions.find(s => s.id === currentSessionId)) {
        currentSessionId = chatSessions[0].id;
    }

    // HÀM LƯU DỮ LIỆU VÀO MÁY
    function saveSessions() {
        try {
            const cleanSessions = chatSessions.map(session => ({
                id: session.id,
                title: session.title,
                history: session.history.map(msg => ({
                    role: msg.role,
                    parts: msg.parts ? msg.parts.filter(p => p.text) : []
                }))
            }));
            localStorage.setItem('codezen_sessions', JSON.stringify(cleanSessions));
            localStorage.setItem('codezen_current_session', currentSessionId);
        } catch(e) { console.error("Lỗi lưu chat:", e); }
    }

    // HÀM TẠO ĐOẠN CHAT MỚI
    function createNewSession(switchUI = true) {
        const newId = 'session_' + Date.now();
        chatSessions.push({ id: newId, title: 'Đoạn chat mới', history: [] });
        currentSessionId = newId;
        saveSessions();
        
        if (switchUI) {
            renderSidebar();
            clearChatUI();
        }
        
        // Đóng sidebar trên Mobile sau khi bấm tạo mới
        if (window.innerWidth <= 900 && chatSidebar && mainLayout) {
            chatSidebar.classList.add('closed');
            mainLayout.classList.add('sidebar-closed');
        }
    }

    // GẮN SỰ KIỆN CHO NÚT "+ ĐOẠN CHAT MỚI" (Bảo vệ tuyệt đối không liệt)
    if (btnNewChat) {
        btnNewChat.addEventListener('click', () => {
            chatInput.value = '';
            chatInput.style.height = 'auto';
            chatInput.focus();
            createNewSession(true);
        });
    }

    // HÀM CHUYỂN QUA LẠI GIỮA CÁC ĐOẠN CHAT
    function switchSession(id) {
        if (currentSessionId === id) return;
        currentSessionId = id;
        saveSessions();
        renderSidebar();
        clearChatUI();
        loadCurrentSessionMessages();

        if (window.innerWidth <= 900 && chatSidebar && mainLayout) {
            chatSidebar.classList.add('closed');
            mainLayout.classList.add('sidebar-closed');
        }
    }

    // HÀM VẼ LẠI DANH SÁCH BÊN TRÁI
    function renderSidebar() {
        if (!historyList) return;
        historyList.innerHTML = '';
        
        const reversedSessions = [...chatSessions].reverse();
        
        reversedSessions.forEach(session => {
            const item = document.createElement('div');
            item.className = `history-item ${session.id === currentSessionId ? 'active' : ''}`;
            
            const deleteBtnHTML = `<button class="btn-delete-chat" data-id="${session.id}" style="background:none; border:none; color:#ef4444; cursor:pointer; margin-left:auto; display:none; padding:5px;"><i class="fa-solid fa-trash-can"></i></button>`;
            
            item.innerHTML = `<i class="fa-regular fa-message"></i> <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${session.title}</span> ${deleteBtnHTML}`;
            
            item.addEventListener('mouseenter', () => { const btn = item.querySelector('.btn-delete-chat'); if(btn) btn.style.display = 'block'; });
            item.addEventListener('mouseleave', () => { const btn = item.querySelector('.btn-delete-chat'); if(btn) btn.style.display = 'none'; });
            
            item.addEventListener('click', (e) => {
                if(!e.target.closest('.btn-delete-chat')) switchSession(session.id);
            });

            const delBtn = item.querySelector('.btn-delete-chat');
            if (delBtn) {
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if(confirm('Bạn có chắc muốn xóa đoạn chat này?')) {
                        chatSessions = chatSessions.filter(s => s.id !== session.id);
                        if(chatSessions.length === 0) createNewSession(false);
                        else if(currentSessionId === session.id) currentSessionId = chatSessions[chatSessions.length - 1].id;
                        saveSessions();
                        renderSidebar();
                        if(currentSessionId === chatSessions[chatSessions.length - 1].id) { clearChatUI(); loadCurrentSessionMessages(); }
                    }
                });
            }
            historyList.appendChild(item);
        });
    }

    // DỌN SẠCH KHUNG CHAT KHI CHUYỂN TRANG
    function clearChatUI() {
        const msgs = chatContainer.querySelectorAll('.chat-message:not(#welcome-screen)');
        msgs.forEach(m => m.remove());
        if (codePanel) codePanel.style.display = 'none';
        if (livePreviewFrame) livePreviewFrame.style.display = 'none';
        if (preCodeContainer) preCodeContainer.style.display = 'block';
        
        const currentSession = chatSessions.find(s => s.id === currentSessionId);
        if (currentSession && currentSession.history.length === 0 && welcomeScreen) {
            welcomeScreen.style.display = 'flex';
        } else if (welcomeScreen) {
            welcomeScreen.style.display = 'none';
        }
    }

    // ĐỌC LẠI TIN NHẮN CŨ VÀ HIỂN THỊ
    function loadCurrentSessionMessages() {
        try {
            const currentSession = chatSessions.find(s => s.id === currentSessionId);
            if (currentSession && currentSession.history.length > 0) {
                if (welcomeScreen) welcomeScreen.style.display = 'none';
                currentSession.history.forEach(msg => {
                    if (msg.parts && msg.parts.length > 0) {
                        const text = msg.parts.map(p => p.text || '').join('\n');
                        if (text) appendMessage(msg.role === 'user' ? 'user' : 'ai', text, msg.role === 'model', "", false);
                    }
                });
            }
        } catch (error) {
            console.error("Lỗi khi load tin nhắn:", error);
        }
    }

    // CHẠY UI LẦN ĐẦU TIÊN
    renderSidebar();
    loadCurrentSessionMessages();

    // SỰ KIỆN NÚT ĐÓNG/MỞ SIDEBAR (Menu 3 gạch)

    if (btnToggleSidebar && chatSidebar) {
        btnToggleSidebar.addEventListener('click', () => {
            // Đóng/mở class 'closed' cho thanh bên
            chatSidebar.classList.toggle('closed');
            
            // Tìm linh hoạt layout chính để nới rộng khung chat
            const layoutChinh = document.querySelector('.main-layout');
            if (layoutChinh) {
                layoutChinh.classList.toggle('sidebar-closed');
            }
        });

        // Mặc định đóng thanh bên nếu dùng trên điện thoại (<900px)
        if (window.innerWidth <= 900) {
            chatSidebar.classList.add('closed');
            const layoutChinh = document.querySelector('.main-layout');
            if (layoutChinh) layoutChinh.classList.add('sidebar-closed');
        }
    }

    // ==========================================
    // 4. THANH CÔNG CỤ THAO TÁC NHANH (WORKSPACE)
    // ==========================================
    if (quickActionBtns) {
        quickActionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-action');
                const currentCode = codeViewerContent ? codeViewerContent.textContent : "";
                
                if (!currentCode || currentCode.includes('Code bạn import sẽ hiển thị')) {
                    alert("Vui lòng Import file code hoặc để AI viết code trước!"); return;
                }

               if (action === 'terminal') {
                    const backendContainer = document.getElementById('backend-runner-container');
                    const terminalContainer = document.getElementById('terminal-output-container');
                    const isPreviewing = livePreviewFrame.style.display === 'block' || (backendContainer && backendContainer.style.display === 'flex');
                    
                    if (isPreviewing) {
                        // --- ĐÓNG TERMINAL ---
                        livePreviewFrame.style.display = 'none'; 
                        if(backendContainer) backendContainer.style.display = 'none';
                        preCodeContainer.style.display = 'block';
                        btn.innerHTML = '<i class="fa-solid fa-terminal"></i> Terminal'; 
                        btn.classList.remove('active-run');
                    } else {
                        // --- MỞ TERMINAL (CHƯA CHẠY CODE) ---
                        preCodeContainer.style.display = 'none'; 
                        btn.innerHTML = '<i class="fa-solid fa-code"></i> Đóng Terminal'; 
                        btn.classList.add('active-run');

                        let lang = 'javascript';
                        const classes = codeViewerContent.className;
                        const match = classes.match(/language-(\w+)/);
                        if (match) lang = match[1].toLowerCase();

                        const webLangs = ['html', 'css', 'javascript', 'js'];

                        if (webLangs.includes(lang) && !currentCode.includes('#include')) {
                            livePreviewFrame.style.display = 'block';
                            livePreviewFrame.srcdoc = currentCode;
                        } else {
                            if(backendContainer) backendContainer.style.display = 'flex';
                            if(terminalContainer) {
                                terminalContainer.innerHTML = '<div style="color: #888;">Nhập dữ liệu đầu vào (nếu có) và bấm "Chạy Code" để bắt đầu...</div>';
                            }
                        }
                    }
                    return;
                }

                let prompt = "";
                switch(action) {
                    case 'explain': prompt = "Hãy giải thích chi tiết đoạn code này giúp tôi:\n\n"; break;
                    case 'bug': prompt = "Hãy tìm lỗi và sửa lại đoạn code này giúp tôi (nếu có):\n\n"; break;
                    case 'optimize': prompt = "Hãy tối ưu hóa đoạn code này để nó chạy nhanh và sạch hơn:\n\n"; break;
                    case 'test': prompt = "Hãy viết các test case cho đoạn code này:\n\n"; break;
                }

                if (chatInput && btnSend) {
                    if (preCodeContainer) preCodeContainer.style.display = 'block';
                    if (livePreviewFrame) livePreviewFrame.style.display = 'none';
                    const runBtn = document.querySelector('.btn-quick-action[data-action="run"]');
                    if(runBtn) { runBtn.innerHTML = '<i class="fa-solid fa-play"></i> Xem thử (Run)'; runBtn.classList.remove('active-run'); }

                    chatInput.value = prompt + "```\n" + currentCode + "\n```";
                    chatInput.style.height = 'auto'; chatInput.style.height = (chatInput.scrollHeight) + 'px';
                    chatInput.focus();
                    sendMessage(); 
                }
            });
        });
        // ==========================================
        // 4.5 XỬ LÝ NÚT "CHẠY CODE" BÊN TRONG TERMINAL
        // ==========================================
        const btnExecuteCode = document.getElementById('btn-execute-code');
        if (btnExecuteCode) {
            btnExecuteCode.addEventListener('click', () => {
                const terminalContainer = document.getElementById('terminal-output-container');
                const stdinInput = document.getElementById('stdin-input');
                const currentCode = codeViewerContent ? codeViewerContent.textContent : "";
                
                if (!currentCode) return;

                let lang = 'javascript';
                const classes = codeViewerContent.className;
                const match = classes.match(/language-(\w+)/);
                if (match) lang = match[1].toLowerCase();

                let compilerName = 'gcc-head'; 
                if (lang === 'c++' || lang === 'cpp') compilerName = 'gcc-head';
                else if (lang === 'python' || lang === 'py') compilerName = 'cpython-head';
                else if (lang === 'java') compilerName = 'openjdk-head';
                else if (lang === 'c#' || lang === 'csharp') compilerName = 'mono-head';

                const stdinValue = stdinInput ? stdinInput.value : "";

                if(terminalContainer) terminalContainer.innerHTML = '<div style="color: #888;"><i class="fa-solid fa-cloud-arrow-up"></i> Đang biên dịch qua máy chủ Wandbox...</div>';
                btnExecuteCode.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang chạy...';
                btnExecuteCode.disabled = true;

                fetch('https://wandbox.org/api/compile.json', { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        compiler: compilerName,
                        code: currentCode,
                        stdin: stdinValue,
                        save: false
                    })
                })
                .then(res => res.json())
                .then(data => {
                    if(terminalContainer) {
                        const isError = data.status !== "0";
                        const color = isError ? '#ef4444' : '#10b981';
                        let output = data.program_message || data.compiler_error || data.compiler_message || "";
                        const safeOutput = output.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
                        
                        terminalContainer.innerHTML = `<span style="color: ${color};">${safeOutput || '<span style="color: #888;">Chương trình chạy thành công (Không có đầu ra).</span>'}</span>`;

                        if (isError) {
                            const debugBtn = document.createElement('button');
                            debugBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Nhờ AI sửa lỗi này';
                            debugBtn.style.cssText = 'margin-top: 15px; display: block; background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid #10b981; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-family: var(--font-main); font-size: 0.85rem; transition: 0.3s;';
                            debugBtn.onclick = () => {
                                const chatInput = document.getElementById('chat-input');
                                const btnSend = document.getElementById('btn-send');
                                if(chatInput && btnSend) {
                                    chatInput.value = `Hãy giúp tôi sửa lỗi biên dịch sau:\n\n**Mã lỗi:**\n\`\`\`\n${output}\n\`\`\`\n\n**Code hiện tại:**\n\`\`\`${lang}\n${currentCode}\n\`\`\``;
                                    chatInput.focus();
                                    chatInput.style.height = 'auto'; chatInput.style.height = (chatInput.scrollHeight) + 'px';
                                    setTimeout(() => btnSend.click(), 300);
                                }
                            };
                            terminalContainer.appendChild(debugBtn);
                        }
                    }
                })
                .catch(err => {
                    if(terminalContainer) terminalContainer.innerHTML = `<span style="color: #ef4444;">[Lỗi kết nối] Không thể kết nối đến máy chủ biên dịch Wandbox.</span>`;
                })
                .finally(() => {
                    btnExecuteCode.innerHTML = '<i class="fa-solid fa-play"></i> Chạy Code';
                    btnExecuteCode.disabled = false;
                });
            });
        }
    }

    if(btnDownloadCode && codeViewerContent) {
        btnDownloadCode.addEventListener('click', () => {
            const codeContent = codeViewerContent.textContent;
            if (!codeContent || codeContent.includes('Code bạn import sẽ hiển thị')) { 
                alert("Chưa có code để tải!"); return; 
            }
            
            // Lấy ngôn ngữ hiện tại từ class của codeViewerContent
            let ext = 'txt';
            const classes = codeViewerContent.className;
            const match = classes.match(/language-(\w+)/);
            if (match) {
                const lang = match[1].toLowerCase();
                // Map ngôn ngữ với đuôi file
                const extensionMap = {
                    'javascript': 'js', 'js': 'js', 'python': 'py', 'py': 'py',
                    'html': 'html', 'css': 'css', 'java': 'java', 'c': 'c',
                    'cpp': 'cpp', 'csharp': 'cs', 'cs': 'cs', 'php': 'php',
                    'ruby': 'rb', 'go': 'go', 'rust': 'rs', 'sql': 'sql', 'json': 'json'
                };
                ext = extensionMap[lang] || lang; // Nếu không có trong map, dùng luôn tên ngôn ngữ
            }

            const blob = new Blob([codeContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); 
            a.href = url; 
            a.download = `CodeZen_Snippet_${new Date().getTime()}.${ext}`; // Lưu với đuôi chuẩn
            a.click(); 
            URL.revokeObjectURL(url);
        });
    }
    if(btnCloseCode && codePanel) {
        btnCloseCode.addEventListener('click', () => {
            codePanel.style.display = 'none'; // Ẩn cột code
            
            // Ẩn thanh kéo và Trả khung chat về lại 100% màn hình
            const splitter = document.getElementById('drag-splitter');
            if(splitter) splitter.style.display = 'none';
            const leftPanel = document.querySelector('.chat-wrapper');
            if(leftPanel) {
                leftPanel.style.width = '100%';
                leftPanel.style.flex = '1';
            }
        });
    }

    // ==========================================
    // 5. XỬ LÝ FILE KÉO THẢ
    // ==========================================
    if(fileInput) fileInput.addEventListener('change', async (e) => handleFiles(e.target.files));
    const chatWrapper = document.getElementById('chat-panel') || document.querySelector('.chat-wrapper');
    if(chatWrapper) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => chatWrapper.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); }));
        ['dragenter', 'dragover'].forEach(evt => chatWrapper.addEventListener(evt, () => chatWrapper.style.border = '2px dashed var(--primary-color)'));
        ['dragleave', 'drop'].forEach(evt => chatWrapper.addEventListener(evt, () => chatWrapper.style.border = 'none'));
        chatWrapper.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
    }
    // --- BỔ SUNG: Tính năng Paste (Ctrl+V) ảnh trực tiếp ---
    document.addEventListener('paste', (e) => {
        const items = e.clipboardData.items;
        let pastedFiles = [];
        
        // Quét trong khay nhớ tạm (clipboard) xem có file hình ảnh nào không
        for (let i = 0; i < items.length; i++) {
            if (items[i].kind === 'file') {
                const file = items[i].getAsFile();
                if (file && file.type.startsWith('image/')) {
                    pastedFiles.push(file);
                }
            }
        }
        
        // Nếu tìm thấy ảnh, đẩy thẳng vào hàm xử lý file có sẵn
        if (pastedFiles.length > 0) {
            e.preventDefault(); // Chặn hành vi paste mặc định của trình duyệt
            handleFiles(pastedFiles);
        }
    });
    async function handleFiles(files) {
        if (!files || files.length === 0) return;
        for(let file of files) {
            if (file.size > 5 * 1024 * 1024) continue;
            selectedFiles.push(file);
            const isTextFile = file.type.startsWith('text/') || file.name.match(/\.(c|cpp|py|java|js|html|css|txt)$/i);
            if (isTextFile && codePanel && codeViewerContent && codeViewerTitle) {
                try {
                    const content = await readFileAsText(file);
                    codeViewerTitle.innerHTML = `<i class="fa-solid fa-file-code"></i> ${file.name}`;
                    codeViewerContent.textContent = content;
                    if(window.hljs) { codeViewerContent.removeAttribute('data-highlighted'); hljs.highlightElement(codeViewerContent); }
                    
                    if (preCodeContainer && livePreviewFrame) {
                        preCodeContainer.style.display = 'block'; livePreviewFrame.style.display = 'none';
                        const runBtn = document.querySelector('.btn-quick-action[data-action="run"]');
                        if(runBtn) { runBtn.innerHTML = '<i class="fa-solid fa-play"></i> Xem thử (Run)'; runBtn.classList.remove('active-run'); }
                    }
                    codePanel.style.display = 'flex';
                    // --- HIỆN THANH KÉO VÀ CHIA ĐÔI MÀN HÌNH ---
                    const splitter = document.getElementById('drag-splitter');
                    if (splitter && window.innerWidth > 900) {
                        splitter.style.display = 'block';
                        const leftPanel = document.querySelector('.chat-wrapper');
                        if (leftPanel && (!leftPanel.style.width || leftPanel.style.width === '100%')) {
                            leftPanel.style.flex = 'none';
                            leftPanel.style.width = 'calc(50% - 15px)';
                        }
                    }
                } catch(err) { console.error(err); }
            }
        }
        renderFilePreviews();
        if(chatInput) chatInput.focus();
    }

    function renderFilePreviews() {
        if(!filePreviewContainer) return;
        filePreviewContainer.innerHTML = '';
        if (selectedFiles.length === 0) { filePreviewContainer.style.display = 'none'; return; }
        filePreviewContainer.style.display = 'flex';
        selectedFiles.forEach((file, index) => {
            const isImage = file.type.startsWith('image/');
            const chip = document.createElement('div');
            chip.style.cssText = "display: inline-flex; align-items: center; padding: 4px 10px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 8px; font-size: 0.85rem; color: var(--text-main); font-family: var(--font-code);";
            chip.innerHTML = `<i class="fa-solid ${isImage ? 'fa-image' : 'fa-file-code'}" style="margin-right: 8px; color: var(--primary-color);"></i><span style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.name}</span><button data-index="${index}" class="btn-remove-chip" style="background: none; border: none; color: #ef4444; cursor: pointer; margin-left: 10px;"><i class="fa-solid fa-xmark"></i></button>`;
            filePreviewContainer.appendChild(chip);
        });
        document.querySelectorAll('.btn-remove-chip').forEach(btn => btn.addEventListener('click', function() {
            selectedFiles.splice(parseInt(this.getAttribute('data-index')), 1); renderFilePreviews();
        }));
    }

    function readFileAsBase64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = e => reject(e); reader.readAsDataURL(file); }); }
    function readFileAsText(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = e => reject(e); reader.readAsText(file); }); }

    // ==========================================
    // 6. XỬ LÝ KHUNG NHẬP CHỮ & GỬI TIN NHẮN
    // ==========================================
    if(suggestCards) suggestCards.forEach(c => c.addEventListener('click', () => { if(chatInput) { chatInput.value = c.getAttribute('data-prompt'); chatInput.focus(); chatInput.style.height = 'auto'; chatInput.style.height = (chatInput.scrollHeight) + 'px'; } }));
    if(chatInput) {
        chatInput.addEventListener('input', function() { this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px'; });
        chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    }
    if(btnSend) btnSend.addEventListener('click', sendMessage);
    let isGenerating = false;
    async function sendMessage() {
        if (isGenerating) return;
        const text = chatInput.value.trim();
        if (!text && selectedFiles.length === 0) return;
        isGenerating = true;
        if (btnSend) btnSend.style.display = 'none';
        if (btnStop) btnStop.style.display = 'flex';
        abortController = new AbortController();
        if (welcomeScreen) welcomeScreen.style.display = 'none';
        
        const currentSession = chatSessions.find(s => s.id === currentSessionId);
        if (!currentSession) return;

        // Tự đổi tên luồng chat (Chỉ ở câu hỏi đầu tiên)
        if (currentSession.history.length === 0 && text) {
            currentSession.title = text.length > 25 ? text.substring(0, 25) + '...' : text;
            renderSidebar();
        } else if (currentSession.history.length === 0 && filesToProcess.length > 0) {
            currentSession.title = "Phân tích file mã nguồn";
            renderSidebar();
        }

        let attachmentHTML = "";
        let filesToProcess = [...selectedFiles]; 

        if (filesToProcess.length > 0) {
            attachmentHTML += `<div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px;">`;
            filesToProcess.forEach(file => {
                if (file.type.startsWith('image/')) {
                    const imgURL = URL.createObjectURL(file);
                    attachmentHTML += `<div style="border-radius: 8px; overflow: hidden; max-width: 200px; border: 1px solid rgba(16, 185, 129, 0.3);"><img src="${imgURL}" style="width: 100%; display: block; object-fit: cover;"></div>`;
                } else {
                    attachmentHTML += `<div style="padding: 8px 15px; background: rgba(16, 185, 129, 0.1); border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.3); display: inline-flex; align-items: center; gap: 10px; font-size: 0.9rem; font-family: var(--font-code);"><i class="fa-solid fa-file-code" style="color: var(--primary-color);"></i><span>${file.name}</span></div>`;
                }
            });
            attachmentHTML += `</div>`;
        }

        let displayText = text || (filesToProcess.length > 0 ? "Hãy phân tích file đính kèm này." : "");
        appendMessage('user', displayText, false, attachmentHTML, true); 

        chatInput.value = ''; chatInput.style.height = 'auto'; selectedFiles = []; renderFilePreviews();
        if(fileInput) fileInput.value = '';

        const loadingId = appendLoading();
        let userParts = [];

        if (text) userParts.push({ text: text });
        else if (filesToProcess.length > 0) userParts.push({ text: "Hãy phân tích chi tiết file đính kèm này." });

        if (filesToProcess.length > 0) {
            for(let fileToProcess of filesToProcess) {
                try {
                    const isTextFile = fileToProcess.type.startsWith('text/') || fileToProcess.name.match(/\.(c|cpp|py|java|js|html|css|txt)$/i);
                    if (isTextFile) {
                        const fileContent = await readFileAsText(fileToProcess);
                        userParts.push({ text: `\n\n--- NỘI DUNG FILE: ${fileToProcess.name} ---\n\`\`\`\n${fileContent}\n\`\`\`` });
                    } else {
                        const base64Data = await readFileAsBase64(fileToProcess);
                        userParts.push({ inlineData: { mimeType: fileToProcess.type || 'image/jpeg', data: base64Data } });
                    }
                } catch (err) {}
            }
        }

        currentSession.history.push({ role: "user", parts: userParts });
        saveSessions(); 

        // --- HỆ THỐNG NHÂN VẬT AI (PERSONAS) ---
        let systemInstruction = "Bạn là HBioAI, một AI hỗ trợ trả lời thắc mắc về Công nghệ Sinh học, Di truyền học, Hóa sinh và Sinh học phân tử. Nhiệm vụ của bạn là giải đáp các thắc mắc chuyên sâu về sinh học một cách khoa học, chính xác. Nếu người dùng hỏi vấn đề không liên quan đến sinh học, y học hay khoa học sự sống, hãy lịch sự từ chối và hướng họ quay lại chủ đề Sinh học.";
        
        const personaSelect = document.getElementById('ai-persona-select');
        const url = getApiUrl();
        if (!url) {
            removeLoading(loadingId);
            return; // Dừng lại nếu test trên máy tính mà chưa nhập API Key
        }
        try {
            const response = await fetch(url, { // Gọi đến file backend của Vercel
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Gửi dữ liệu đi (không cần đính kèm key nữa)
                body: JSON.stringify({ 
                    systemInstruction: { parts: [{ text: systemInstruction }] }, 
                    contents: currentSession.history 
                }),
                signal: abortController.signal
            });
            
                
            // --- DÁN ĐOẠN NÀY VÀO NGAY DƯỚI LỆNH FETCH CỦA BẠN ---
            removeLoading(loadingId);

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || 'Lỗi kết nối API');
            }

            // 1. Tạo khung tạm với giao diện mới chuyên nghiệp
            const streamMsgDiv = document.createElement('div');
            streamMsgDiv.className = `chat-message ai-message streaming-active`;
            streamMsgDiv.innerHTML = `
                <div class="message-avatar" style="align-self: flex-start; margin-top: 10px;">
                    <i class="fa-solid fa-robot"></i>
                </div>
                <div class="message-content streaming-content" id="streaming-content">
                    <span style="color: var(--text-muted); font-style: italic;">HBio AI đang suy nghĩ...</span>
                </div>
            `;
            
            
            chatContainer.appendChild(streamMsgDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;

            const streamingContent = streamMsgDiv.querySelector('#streaming-content');
            let fullText = "";

            // 2. Đọc luồng dữ liệu (Stream)
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = ""; // THÊM BỘ NHỚ ĐỆM Ở ĐÂY

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                // Cộng dồn gói tin mới vào bộ đệm thay vì xử lý ngay
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split(/\r?\n/); 
                
                // Giữ lại dòng cuối cùng (có thể là dòng bị cắt dở) trong bộ đệm
                buffer = lines.pop(); 
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.substring(6);
                        if (dataStr.trim() === "[DONE]") continue; 
                        
                        try {
                            const dataObj = JSON.parse(dataStr);
                            
                            if (dataObj.candidates && dataObj.candidates[0].content && dataObj.candidates[0].content.parts) {
                                const textPart = dataObj.candidates[0].content.parts[0].text;
                                fullText += textPart;
                                
                                if (fullText.trim()) {
                                    streamingContent.innerHTML = window.marked ? marked.parse(fullText) : fullText;
                                }
                                chatContainer.scrollTop = chatContainer.scrollHeight;
                            }
                        } catch (e) { 
                            console.log("Đợi mẩu dữ liệu tiếp theo...");
                        }
                    }
                }
            }

            // 3. Kết thúc gõ: Gỡ khung tạm và lưu lịch sử
            streamMsgDiv.remove();
            
            const cleanUserParts = userParts.filter(part => !part.inlineData); 
            currentSession.history[currentSession.history.length - 1].parts = cleanUserParts; 
            
            currentSession.history.push({ role: "model", parts: [{ text: fullText }] });
            saveSessions(); 

            // Vẽ lại khung chuẩn xác với Highlight code và nút Copy
            appendMessage('ai', fullText, true, "", true);
            // --- KẾT THÚC ĐOẠN DÁN ---

        } catch (error) {
            removeLoading(loadingId);
            if (error.name === 'AbortError') {
                appendMessage('ai', `> 🛑 *Đã dừng tạo câu trả lời...*`, true, "", false);
            } else {
                appendMessage('ai', `**Lỗi:** ${error.message}`, true, "", false);
            }
        } finally {
            isGenerating = false; 
            if (btnSend) {
                btnSend.style.display = 'flex'; // Hiển thị lại nút gửi
                btnSend.disabled = false; 
                btnSend.style.opacity = '1'; 
                btnSend.style.cursor = 'pointer';
            }
            if (btnStop) {
                btnStop.style.display = 'none'; // Ẩn nút dừng
            }
            abortController = null;
        }
    }

    // ==========================================
    // 7. HÀM VẼ GIAO DIỆN TIN NHẮN
    // ==========================================
    function appendMessage(sender, text, isMarkdown = false, attachmentHTML = "", doSave = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${sender}-message`;
        const avatarStr = sender === 'user' ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-robot"></i>';
        
        let contentHTML = isMarkdown && window.marked ? marked.parse(text) : text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
        if (attachmentHTML) contentHTML += attachmentHTML;

        msgDiv.innerHTML = `<div class="message-avatar">${avatarStr}</div><div class="message-content">${contentHTML}</div>`;
        chatContainer.appendChild(msgDiv);
        
        if (isMarkdown && window.MathJax && typeof MathJax.typesetPromise === 'function') {
            MathJax.typesetPromise([msgDiv]).catch(err => console.log('Lỗi MathJax:', err));
        }
        
        if (isMarkdown) {
            msgDiv.querySelectorAll('pre').forEach((preBlock, index) => {
                // --- BƯỚC 1: PHẢI KHAI BÁO BIẾN NÀY ĐẦU TIÊN ---
                const codeBlock = preBlock.querySelector('code');

                // --- BƯỚC 2: THÊM NHÃN NGÔN NGỮ (LANGUAGE BADGE) ---
                let langName = "CODE"; 
                if (codeBlock && codeBlock.className) {
                    const match = codeBlock.className.match(/language-(\w+)/);
                    if (match) langName = match[1];
                }

                // Nếu bạn đã thêm code tạo langBadge, hãy đảm bảo nó nằm dưới dòng khai báo codeBlock
                const langBadge = document.createElement('div');
                langBadge.className = 'code-lang-badge';
                langBadge.innerHTML = `<i class="fa-solid fa-code" style="margin-right: 8px; color: var(--primary-color);"></i> ${langName}`;
                preBlock.insertBefore(langBadge, preBlock.firstChild);

                // --- BƯỚC 3: HIGHLIGHT VÀ LẤY TEXT ---
                if (codeBlock && window.hljs) hljs.highlightElement(codeBlock);
                const codeText = codeBlock ? codeBlock.innerText : preBlock.innerText;

                // --- BƯỚC 4: TẠO CÁC NÚT COPY & WORKSPACE ---
                const copyBtn = document.createElement('button');
                // --- THÊM NÚT LƯU CODE (BOOKMARK) ---
                const bookmarkBtn = document.createElement('button');
                bookmarkBtn.className = 'copy-code-btn'; 
                // Căn chỉnh tạm thời (bạn có thể CSS lại sau nếu nó bị đè lên nút copy)
                bookmarkBtn.style.right = '90px'; 
                bookmarkBtn.innerHTML = '<i class="fa-regular fa-bookmark"></i> Lưu';
                
                bookmarkBtn.addEventListener('click', () => {
                    // Gọi hàm lưu code (Sẽ viết ở Bước 3)
                    window.saveSnippetToLibrary(langName, codeText);
                    
                    // Hiệu ứng bấm nút
                    bookmarkBtn.innerHTML = '<i class="fa-solid fa-bookmark"></i> Đã lưu';
                    bookmarkBtn.style.color = 'var(--primary-color)';
                    setTimeout(() => { 
                        bookmarkBtn.innerHTML = '<i class="fa-regular fa-bookmark"></i> Lưu'; 
                        bookmarkBtn.style.color = '';
                    }, 2000);
                });
                preBlock.appendChild(bookmarkBtn);
                copyBtn.className = 'copy-code-btn';
                copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
                copyBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(codeText).then(() => {
                        copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Đã chép';
                        setTimeout(() => { copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy'; }, 2000);
                    });
                });
                preBlock.appendChild(copyBtn);

                const workspaceBtn = document.createElement('button');
                workspaceBtn.className = 'btn-open-workspace';
                workspaceBtn.innerHTML = '<i class="fa-solid fa-laptop-code"></i> Workspace';
                preBlock.appendChild(workspaceBtn);

                // --- BƯỚC 5: ĐỊNH NGHĨA HÀM PUSH (Sử dụng codeBlock an toàn ở đây) ---
                const pushToWorkspace = (titleIcon, titleText) => {
                    if(codeViewerTitle && codeViewerContent && codePanel) {
                        codeViewerTitle.innerHTML = `<i class="${titleIcon}"></i> ${titleText}`;
                        codeViewerContent.textContent = codeText;
                        
                        // Lúc này codeBlock chắc chắn đã tồn tại
                        if(codeBlock) codeViewerContent.className = codeBlock.className;
                        
                        codeViewerContent.removeAttribute('data-highlighted');
                        if(window.hljs) hljs.highlightElement(codeViewerContent);
                        
                        codePanel.style.display = 'flex'; 
                       // --- HIỆN THANH KÉO VÀ CHIA ĐÔI MÀN HÌNH ---
                        const splitter = document.getElementById('drag-splitter');
                        if (splitter && window.innerWidth > 900) {
                            splitter.style.display = 'block';
                            const leftPanel = document.querySelector('.chat-wrapper');
                            // Nếu khung chat đang full màn hình, ép nó về 50%
                            if (leftPanel && (!leftPanel.style.width || leftPanel.style.width === '100%')) {
                                leftPanel.style.flex = 'none';
                                leftPanel.style.width = 'calc(50% - 15px)';
                            }
                        }
                    }
                };

                workspaceBtn.addEventListener('click', () => pushToWorkspace('fa-solid fa-laptop-code', 'Mã nguồn tùy chọn'));
                if (sender === 'ai' && index === 0 && doSave) pushToWorkspace('fa-solid fa-robot', 'HBio AI tạo');
            });
        }
        chatContainer.scrollTop = chatContainer.scrollHeight;
        // --- THÊM NÚT SỬA & TẠO LẠI BÊN DƯỚI TIN NHẮN ---
        
        // 1. Nút Sửa (Dành cho User)
        if (sender === 'user') {
            const editBtn = document.createElement('button');
            editBtn.style.cssText = 'margin-top: 10px; font-size: 0.8rem; padding: 4px 10px; border-radius: 6px; background: transparent; color: #94a3b8; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); transition: 0.3s;';
            editBtn.innerHTML = '<i class="fa-solid fa-pen"></i> Chép lại để sửa';
            editBtn.onmouseover = () => { editBtn.style.color = '#fff'; editBtn.style.background = 'rgba(255,255,255,0.1)'; };
            editBtn.onmouseout = () => { editBtn.style.color = '#94a3b8'; editBtn.style.background = 'transparent'; };
            
            // Logic khi bấm: Đẩy text về khung input
            editBtn.onclick = () => {
                const inputElement = document.getElementById('chat-input');
                if(inputElement) {
                    inputElement.value = text;
                    inputElement.focus();
                }
            };
            
            const contentDiv = msgDiv.querySelector('.message-content');
            if(contentDiv) contentDiv.appendChild(editBtn);
        } 
        // 2. Nút Tạo lại (Dành cho AI)
        else if (sender === 'ai' && !msgDiv.classList.contains('streaming-active')) {
            const regenBtn = document.createElement('button');
            regenBtn.style.cssText = 'margin-top: 15px; font-size: 0.8rem; padding: 4px 10px; border-radius: 6px; background: rgba(16, 185, 129, 0.05); color: var(--primary-color); cursor: pointer; border: 1px solid rgba(16, 185, 129, 0.2); transition: 0.3s;';
            regenBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Tạo lại câu trả lời';
            regenBtn.onmouseover = () => regenBtn.style.background = 'rgba(16, 185, 129, 0.2)';
            regenBtn.onmouseout = () => regenBtn.style.background = 'rgba(16, 185, 129, 0.05)';
            
            // Logic khi bấm: Xóa câu cũ và gọi hàm triggerRegenerate
            regenBtn.onclick = () => {
                if(confirm("Bạn có chắc muốn AI tạo lại câu trả lời này? (Câu hiện tại sẽ bị xóa)")) {
                    msgDiv.remove(); // Xóa UI
                    
                    // --- BỔ SUNG DÒNG NÀY ĐỂ JS BIẾT CURRENT SESSION LÀ GÌ ---
                    const currentSession = chatSessions.find(s => s.id === currentSessionId);
                    
                    // Xóa data cũ trong History an toàn
                    if(currentSession && currentSession.history.length > 0 && currentSession.history[currentSession.history.length-1].role === 'model') {
                        currentSession.history.pop();
                        saveSessions();
                    }
                    
                    // Gọi AI làm lại
                    window.triggerRegenerate();
                }
            };
            
            const contentDiv = msgDiv.querySelector('.message-content');
            if(contentDiv) contentDiv.appendChild(regenBtn);
        }
    }

    function appendLoading() {
        const id = 'loading-' + Date.now();
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ai-message`; msgDiv.id = id;
        msgDiv.innerHTML = `<div class="message-avatar"><i class="fa-solid fa-robot"></i></div><div class="message-content" style="background: transparent; border: none; padding: 15px 0;"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
        chatContainer.appendChild(msgDiv); chatContainer.scrollTop = chatContainer.scrollHeight;
        return id;
    }

    function removeLoading(id) { const el = document.getElementById(id); if (el) el.remove(); }

    // ==========================================
    // 8. NHẬN DIỆN GIỌNG NÓI
    // ==========================================
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let isRecording = false;

    if (SpeechRecognition && btnMic) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'vi-VN'; recognition.continuous = false; recognition.interimResults = true; 
        recognition.onstart = () => { isRecording = true; btnMic.classList.add('recording'); if(chatInput) chatInput.placeholder = "Đang nghe... Hãy nói gì đó."; };
        recognition.onresult = (event) => {
            let currentTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) currentTranscript += event.results[i][0].transcript;
            if(chatInput) { chatInput.value = currentTranscript; chatInput.style.height = 'auto'; chatInput.style.height = (chatInput.scrollHeight) + 'px'; }
        };
        recognition.onerror = () => stopRecording(); recognition.onend = () => stopRecording();
        function stopRecording() { isRecording = false; btnMic.classList.remove('recording'); if(chatInput) chatInput.placeholder = "Nhập câu hỏi hoặc đính kèm file..."; }
        btnMic.addEventListener('click', () => { isRecording ? recognition.stop() : recognition.start(); });
    } else if (btnMic) { btnMic.style.display = 'none'; }
    // ==========================================
    // 9. XỬ LÝ THANH KÉO THẢ (SPLITTER)
    // ==========================================
    const splitter = document.getElementById('drag-splitter');
    const leftPanel = document.querySelector('.chat-wrapper');
    const mainLayoutDOM = document.querySelector('.main-layout');
    let isDragging = false;

    if (splitter && leftPanel) {
        splitter.addEventListener('mousedown', () => {
            isDragging = true;
            document.body.classList.add('is-dragging');
            splitter.classList.add('active');
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const containerWidth = mainLayoutDOM.offsetWidth;
            let newWidth = (e.clientX / containerWidth) * 100;
            
            if (newWidth < 30) newWidth = 30;
            if (newWidth > 70) newWidth = 70;

            leftPanel.style.flex = 'none';
            leftPanel.style.width = `calc(${newWidth}% - 15px)`; // Đã sửa ở đây
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                document.body.classList.remove('is-dragging');
                splitter.classList.remove('active');
            }
        });
    }

    // Tích hợp Splitter vào nút Đóng/Mở Workspace
    // Tìm nút đóng panel và thêm sự kiện ẩn splitter
    if (btnCloseCode) {
        btnCloseCode.addEventListener('click', () => {
            if(splitter) splitter.style.display = 'none';
        });
    }
    // GHI CHÚ: Mọi nơi trong code có lệnh "codePanel.style.display = 'flex';" 
    // Bạn hãy bổ sung thêm lệnh: "if(document.getElementById('drag-splitter')) document.getElementById('drag-splitter').style.display = 'block';" nhé!
    // ==========================================
    // 11. XUẤT ĐOẠN CHAT (EXPORT CHAT)
    // ==========================================
    const btnExportChat = document.getElementById('btn-export-chat');
    
    if (btnExportChat) {
        btnExportChat.addEventListener('click', () => {
            // Lấy dữ liệu của phiên chat hiện tại
            const currentSession = chatSessions.find(s => s.id === currentSessionId);
            
            if (!currentSession || currentSession.history.length === 0) {
                alert("Đoạn chat đang trống, chưa có gì để xuất cả!");
                return;
            }

            // Tạo tiêu đề và thông tin file
            let markdownContent = `# ${currentSession.title}\n\n`;
            markdownContent += `> *Được xuất từ HBio AI lúc: ${new Date().toLocaleString('vi-VN')}*\n\n---\n\n`;

            // Lặp qua từng tin nhắn để format thành chuẩn Markdown
            currentSession.history.forEach(msg => {
                const roleName = msg.role === 'user' ? '👤 **Bạn:**' : '🤖 **HBio AI:**';
                const text = msg.parts.map(p => p.text || '').join('\n');
                
                if (text) {
                    markdownContent += `${roleName}\n\n${text}\n\n---\n\n`;
                }
            });

            // Tạo file và kích hoạt tải về máy
            const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            a.href = url;
            // Làm sạch tên file (bỏ các ký tự đặc biệt)
            const safeTitle = currentSession.title.replace(/[^a-z0-9A-Z_À-ỹ]/g, '_');
            a.download = `CodeZen_${safeTitle}.md`;
            
            a.click();
            URL.revokeObjectURL(url);
        });
    }
    // ==========================================
    // 12. HÀM TẠO LẠI CÂU TRẢ LỜI CỦA AI
    // ==========================================
    window.triggerRegenerate = async function() {
        // 1. ĐỊNH NGHĨA LẠI PHIÊN CHAT (Sửa lỗi không tìm thấy currentSession)
        const currentSession = chatSessions.find(s => s.id === currentSessionId);
        if (!currentSession || currentSession.history.length === 0) return;
        
        // 2. Xác định nhân vật AI
        let systemInstruction = "Bạn là HBioAI, một AI hỗ trợ trả lời thắc mắc về Công nghệ Sinh học, Di truyền học, Hóa sinh và Sinh học phân tử. Nhiệm vụ của bạn là giải đáp các thắc mắc chuyên sâu về sinh học một cách khoa học, chính xác. Nếu người dùng hỏi vấn đề không liên quan đến sinh học, y học hay khoa học sự sống, hãy lịch sự từ chối và hướng họ quay lại chủ đề Sinh học.";
        const personaSelect = document.getElementById('ai-persona-select');

        // 3. Bật khóa UI và hiện nút Dừng
        isGenerating = true;
        if (btnSend) btnSend.style.display = 'none';
        if (btnStop) btnStop.style.display = 'flex';
        abortController = new AbortController();

        // Gọi đúng tên hàm loading
        const loadingId = appendLoading(); 

        let fullText = "";
        let streamMsgDiv = null;

        try {
            // 4. Fetch API y hệt như lúc gửi tin nhắn mới
            const response = await fetch(getApiUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    systemInstruction: { parts: [{ text: sysInstr }] }, 
                    contents: currentSession.history 
                }),
                signal: abortController.signal // Tích hợp khả năng ngắt
            });

            removeLoading(loadingId);

            if (!response.ok) throw new Error('Lỗi kết nối API');

            // 5. Hiệu ứng Streaming (Gõ chữ)
            streamMsgDiv = document.createElement('div');
            streamMsgDiv.className = `chat-message ai-message streaming-active`;
            streamMsgDiv.innerHTML = `
                <div class="message-avatar"><i class="fa-solid fa-robot"></i></div>
                <div class="message-content streaming-content" id="streaming-content">
                    <span style="color: var(--text-muted); font-style: italic;">Đang suy nghĩ lại...</span>
                </div>
            `;
            chatContainer.appendChild(streamMsgDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;

            const streamingContent = streamMsgDiv.querySelector('#streaming-content');
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = ""; 

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split(/\r?\n/); 
                buffer = lines.pop(); 
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.substring(6);
                        if(dataStr.trim() === "[DONE]") continue; 
                        try {
                            const dataObj = JSON.parse(dataStr);
                            if (dataObj.candidates && dataObj.candidates[0].content && dataObj.candidates[0].content.parts) {
                                fullText += dataObj.candidates[0].content.parts[0].text;
                                if (fullText.trim()) streamingContent.innerHTML = window.marked ? marked.parse(fullText) : fullText;
                                chatContainer.scrollTop = chatContainer.scrollHeight;
                            }
                        } catch (e) {} 
                    }
                }
            }

            // 6. Lưu lại lịch sử mới và vẽ giao diện chính thức
            streamMsgDiv.remove();
            currentSession.history.push({ role: "model", parts: [{ text: fullText }] });
            saveSessions(); 
            appendMessage('ai', fullText, true, "", true);

        } catch (error) {
            removeLoading(loadingId);
            
            if (error.name === 'AbortError') {
                if (streamMsgDiv) streamMsgDiv.remove();
                const finalText = fullText.trim() ? fullText + "\n\n> 🛑 *Đã ngắt câu trả lời*" : "> 🛑 *Đã ngắt câu trả lời*";
                currentSession.history.push({ role: "model", parts: [{ text: finalText }] });
                saveSessions();
                appendMessage('ai', finalText, true, "", true);
            } else {
                appendMessage('ai', `**Lỗi khi tạo lại:** ${error.message}`, true, "", false);
            }
            
        } finally {
            // 7. Mở khóa UI
            isGenerating = false; 
            if (btnSend) {
                btnSend.style.display = 'flex'; 
                btnSend.disabled = false; 
                btnSend.style.opacity = '1'; 
                btnSend.style.cursor = 'pointer';
            }
            if (btnStop) btnStop.style.display = 'none';
            abortController = null;
        }
    };
    // ==========================================
    // 13. HỆ THỐNG THƯ VIỆN CODE (SNIPPETS)
    // ==========================================
    window.saveSnippetToLibrary = function(language, code) {
        let snippets = JSON.parse(localStorage.getItem('codezen_snippets') || '[]');
        snippets.push({
            id: Date.now(), // Tạo ID độc nhất
            language: language || 'code',
            code: code,
            date: new Date().toLocaleString('vi-VN')
        });
        localStorage.setItem('codezen_snippets', JSON.stringify(snippets));
    };

    const btnOpenLib = document.getElementById('btn-open-library');
    const btnCloseLib = document.getElementById('btn-close-library');
    const libModal = document.getElementById('library-modal');
    const libContainer = document.getElementById('library-snippets-container');

    if (btnOpenLib && btnCloseLib && libModal) {
        // Mở Modal
        btnOpenLib.addEventListener('click', () => {
            renderLibrary();
            libModal.style.opacity = '1';
            libModal.style.visibility = 'visible';
        });
        
        // Đóng Modal
        btnCloseLib.addEventListener('click', () => {
            libModal.style.opacity = '0';
            libModal.style.visibility = 'hidden';
        });
        
        // Bấm ra ngoài rìa để đóng
        libModal.addEventListener('click', (e) => {
            if (e.target === libModal) {
                libModal.style.opacity = '0';
                libModal.style.visibility = 'hidden';
            }
        });
    }

    function renderLibrary() {
        if (!libContainer) return;
        let snippets = JSON.parse(localStorage.getItem('codezen_snippets') || '[]');
        
        if (snippets.length === 0) {
            libContainer.innerHTML = '<div style="text-align:center; color:#94a3b8; margin-top: 50px; font-size: 1.1rem;"><i class="fa-solid fa-box-open" style="font-size: 3rem; opacity: 0.5; display:block; margin-bottom: 15px;"></i>Kho lưu trữ đang trống.<br>Hãy nhờ AI viết code rồi bấm "Lưu" nhé!</div>';
            return;
        }
        
        libContainer.innerHTML = '';
        // Đảo ngược mảng để hiện code mới lưu lên trên cùng
        snippets.reverse().forEach(snippet => {
            const card = document.createElement('div');
            card.className = 'lib-card'; // Thêm class này để tìm kiếm
            card.style.cssText = 'background: #1e293b; border-radius: 8px; padding: 0; border: 1px solid #334155; position: relative; overflow: hidden; flex-shrink: 0;';
            const safeCode = snippet.code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            
            // Thay thế đoạn card.innerHTML cũ bằng đoạn này:
            card.innerHTML = `
                <div style="padding: 12px 15px; background: rgba(0,0,0,0.2); border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
                    <div style="color: #94a3b8; font-size: 0.85rem;">
                        <span style="color: var(--primary-color); font-weight: bold; padding: 2px 8px; background: rgba(16,185,129,0.1); border-radius: 4px; margin-right: 10px;">${snippet.language.toUpperCase()}</span>
                        <i class="fa-regular fa-clock"></i> ${snippet.date}
                    </div>
                    <div id="lib-actions-${snippet.id}" style="display: flex; gap: 8px;"></div>
                </div>
                
                <div style="padding: 15px; max-height: 350px; overflow-y: auto; overflow-x: auto; background: #0d1117;">
                    <pre style="margin: 0 !important; background: transparent !important; border: none; box-shadow: none; overflow: visible !important;">
                        <code class="language-${snippet.language}" style="white-space: pre !important; word-break: normal !important; display: block; overflow-wrap: normal !important;">${safeCode}</code>
                    </pre>
                </div>
            `;
            libContainer.appendChild(card);
            
            // Render Nút Copy (Trực tiếp bằng JS để tránh lỗi String)
            const copyBtn = document.createElement('button');
            copyBtn.style.cssText = 'background: rgba(255,255,255,0.1); color: #e2e8f0; border: none; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; transition: 0.2s;';
            copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
            copyBtn.onmouseover = () => copyBtn.style.background = 'rgba(255,255,255,0.2)';
            copyBtn.onmouseout = () => copyBtn.style.background = 'rgba(255,255,255,0.1)';
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(snippet.code);
                copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> OK';
                setTimeout(() => copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy', 2000);
            };
            
            // Render Nút Xóa
            const delBtn = document.createElement('button');
            delBtn.style.cssText = 'background: rgba(239, 68, 68, 0.15); color: #ef4444; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; transition: 0.2s;';
            delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
            delBtn.onmouseover = () => delBtn.style.background = '#ef4444';
            delBtn.onmouseout = () => delBtn.style.background = 'rgba(239, 68, 68, 0.15)';
            delBtn.onmouseover = () => delBtn.style.color = '#fff';
            delBtn.onmouseout = () => delBtn.style.color = '#ef4444';
            delBtn.onclick = () => window.deleteSnippet(snippet.id);
            
            const actionsDiv = card.querySelector(`#lib-actions-${snippet.id}`);
            actionsDiv.appendChild(copyBtn);
            actionsDiv.appendChild(delBtn);
        });
        
        // Kích hoạt HighlightJS cho mượt mà
        if (window.hljs) {
            libContainer.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        }
    }

    window.deleteSnippet = function(id) {
        if(confirm('Bạn có chắc muốn xóa đoạn code này khỏi thư viện vĩnh viễn?')) {
            let snippets = JSON.parse(localStorage.getItem('codezen_snippets') || '[]');
            snippets = snippets.filter(s => s.id !== id);
            localStorage.setItem('codezen_snippets', JSON.stringify(snippets));
            renderLibrary(); // Chạy lại hàm vẽ để UI cập nhật ngay lập tức
        }
    };
    // === TÍNH NĂNG TÌM KIẾM THƯ VIỆN CODE ===
    const libSearchInput = document.getElementById('lib-search-input');
    if (libSearchInput) {
        libSearchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const cards = libContainer.querySelectorAll('.lib-card'); // Sẽ thêm class này ở Bước 3
            
            cards.forEach(card => {
                const textContent = card.innerText.toLowerCase();
                if (textContent.includes(searchTerm)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }
    // === HỆ THỐNG PHÍM TẮT (KEYBOARD SHORTCUTS) ===
    document.addEventListener('keydown', (e) => {
        // Bấm Esc để đóng các modal và cửa sổ code
        if (e.key === 'Escape') {
            // Đóng thư viện code
            if (libModal && libModal.style.visibility === 'visible') {
                libModal.style.opacity = '0';
                libModal.style.visibility = 'hidden';
            }
            // Đóng workspace (cột code bên phải)
            if (codePanel && codePanel.style.display !== 'none') {
                if(btnCloseCode) btnCloseCode.click();
            }
        }

        // Bấm Ctrl + L để mở nhanh Thư viện Code
        if (e.ctrlKey && e.key.toLowerCase() === 'l') {
            e.preventDefault(); // Chống bôi đen đường dẫn trình duyệt
            if (btnOpenLib) btnOpenLib.click();
        }
    });

    // ==========================================
    // 14. BIẾN WORKSPACE THÀNH TRÌNH SOẠN THẢO (LIVE EDITOR)
    // ==========================================
    if (codeViewerContent) {
        // 1. Xử lý phím gõ (Tab & Enter)
        codeViewerContent.addEventListener('keydown', function(e) {
            // Khi bấm phím Tab -> Thụt lề 4 dấu cách thay vì chuyển focus
            if (e.key === 'Tab') {
                e.preventDefault();
                document.execCommand('insertText', false, '    ');
            }
            // Khi bấm phím Enter -> Xuống dòng chuẩn bằng \n thay vì tạo thẻ <div>
            if (e.key === 'Enter') {
                e.preventDefault();
                document.execCommand('insertText', false, '\n');
            }
        });

        // 2. Cập nhật lại màu sắc sau khi gõ xong (Blur)
        // Khi người dùng click chuột ra chỗ khác, hệ thống sẽ tự động tô màu lại các từ khóa mới gõ
        codeViewerContent.addEventListener('blur', function() {
            const currentText = this.textContent; 
            this.removeAttribute('data-highlighted'); // Reset trạng thái của thư viện màu
            this.textContent = currentText; // Xóa sạch các thẻ HTML rác do trình duyệt sinh ra lúc gõ
            if (window.hljs) hljs.highlightElement(this); // Gọi thư viện tô màu lại từ đầu
        });
    }
});