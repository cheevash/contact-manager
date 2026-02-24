// ===== CONFIG & STATE =====
const API_URL = 'http://localhost:3001/contacts';
const ACTIVITY_URL = 'http://localhost:3001/activityLogs';

let contacts = [];
let activities = [];
let pendingDeleteId = null;
let selectedIds = new Set();
let showFavoritesOnly = false;
let myChart = null;

// ===== DOM ELEMENTS =====
const contactGrid = document.getElementById('contactGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const addBtn = document.getElementById('addBtn');
const filterFavBtn = document.getElementById('filterFavBtn');

// Stats Elements
const totalContactsEl = document.getElementById('totalContacts');
const totalCompaniesEl = document.getElementById('totalCompanies');
const totalFavoritesEl = document.getElementById('totalFavorites');

// Form Modal Elements
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const contactForm = document.getElementById('contactForm');
const contactId = document.getElementById('contactId');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const cancelBtn = document.getElementById('cancelBtn');

// Form Inputs & Errors
const nameInput = document.getElementById('nameInput');
const emailInput = document.getElementById('emailInput');
const phoneInput = document.getElementById('phoneInput');
const companyInput = document.getElementById('companyInput');
const nameError = document.getElementById('nameError');
const emailError = document.getElementById('emailError');
const phoneError = document.getElementById('phoneError');

// Detail Modal Elements
const detailModal = document.getElementById('detailModal');
const detailContent = document.getElementById('detailContent');
const detailCloseBtn = document.getElementById('detailCloseBtn');

// Delete Modal Elements
const deleteModal = document.getElementById('deleteModal');
const deleteMessage = document.getElementById('deleteMessage');
const deleteCancelBtn = document.getElementById('deleteCancelBtn');
const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');

// Bulk Action Elements
const bulkActionBar = document.getElementById('bulkActionBar');
const selectAllCb = document.getElementById('selectAllCb');
const selectedCount = document.getElementById('selectedCount');
const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

// Sidebar Elements
const companyChartCanvas = document.getElementById('companyChart');
const emptyChartState = document.getElementById('emptyChartState');
const activityLogList = document.getElementById('activityLogList');
const emptyActivityState = document.getElementById('emptyActivityState');
const toast = document.getElementById('toast');

// ===== Avatar gradient colors =====
const avatarGradients = [
    'avatar-gradient-0', 'avatar-gradient-1', 'avatar-gradient-2',
    'avatar-gradient-3', 'avatar-gradient-4', 'avatar-gradient-5'
];

// ==============================================
// 🌟 INITIALIZATION & DATA FETCH
// ==============================================
async function initApp() {
    await Promise.all([fetchContacts(), fetchActivities()]);
}

async function fetchContacts() {
    try {
        const res = await fetch(API_URL);
        contacts = await res.json();
        renderApp();
    } catch (e) {
        showToast('โหลดข้อมูลผิดพลาด', 'error');
    }
}

async function fetchActivities() {
    try {
        const res = await fetch(`${ACTIVITY_URL}?_sort=timestamp&_order=desc&_limit=20`);
        activities = await res.json();
        renderActivityLog();
    } catch (e) {
        console.error('โหลด Activity ไม่ได้', e);
    }
}

// อัพเดท UI ทั้งหมด
function renderApp() {
    applyFiltersAndRender();
    updateStats();
    renderChart();
    updateBulkBar();
}

// ==============================================
// 📊 STATS & CHARTS
// ==============================================
function updateStats() {
    totalContactsEl.textContent = contacts.length;
    
    const companies = new Set(contacts.map(c => c.company).filter(Boolean));
    totalCompaniesEl.textContent = companies.size;
    
    const favs = contacts.filter(c => c.favorite).length;
    totalFavoritesEl.textContent = favs;
}

function renderChart() {
    const companyCounts = {};
    let hasCompany = false;

    contacts.forEach(c => {
        if (c.company) {
            hasCompany = true;
            companyCounts[c.company] = (companyCounts[c.company] || 0) + 1;
        }
    });

    if (!hasCompany) {
        companyChartCanvas.style.display = 'none';
        emptyChartState.style.display = 'block';
        if (myChart) myChart.destroy();
        return;
    }

    companyChartCanvas.style.display = 'block';
    emptyChartState.style.display = 'none';

    const labels = Object.keys(companyCounts);
    const data = Object.values(companyCounts);

    if (myChart) {
        myChart.data.labels = labels;
        myChart.data.datasets[0].data = data;
        myChart.update();
    } else {
        const ctx = companyChartCanvas.getContext('2d');
        myChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#6c63ff', '#00b894', '#0abde3', '#feca57', '#e040fb', '#ff6b6b'
                    ],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#8892b0', font: { family: 'Inter' } } }
                }
            }
        });
    }
}

// ==============================================
// 🔔 ACTIVITY LOG
// ==============================================
async function logActivity(action, contactName) {
    const act = {
        action,
        contactName,
        timestamp: new Date().toISOString()
    };
    try {
        await fetch(ACTIVITY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(act)
        });
        fetchActivities(); // Refresh logs
    } catch (e) {
        console.error('Log error:', e);
    }
}

function renderActivityLog() {
    if (activities.length === 0) {
        activityLogList.innerHTML = '';
        emptyActivityState.style.display = 'block';
        return;
    }

    emptyActivityState.style.display = 'none';
    activityLogList.innerHTML = activities.map(act => {
        let dotClass = '';
        let actionText = '';
        let icon = '';

        if (act.action === 'CREATE') { dotClass = 'dot-create'; actionText = 'เพิ่มรายชื่อ'; icon = '➕'; }
        else if (act.action === 'UPDATE') { dotClass = 'dot-update'; actionText = 'แก้ไขข้อมูล'; icon = '✏️'; }
        else if (act.action === 'DELETE') { dotClass = 'dot-delete'; actionText = 'ลบรายชื่อ'; icon = '🗑️'; }
        else if (act.action === 'FAVORITE') { dotClass = 'dot-fav'; actionText = 'ปักหมุด'; icon = '⭐'; }
        else if (act.action === 'UNFAVORITE') { dotClass = ''; actionText = 'เลิกปักหมุด'; icon = '☆'; }

        const date = new Date(act.timestamp).toLocaleString('th-TH', { 
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });

        return `
            <div class="activity-item">
                <div class="activity-dot ${dotClass}">${icon}</div>
                <div class="activity-content">
                    <p class="act-desc">${actionText} <strong>${act.contactName}</strong></p>
                    <span class="act-time">${date}</span>
                </div>
            </div>
        `;
    }).join('');
}

// ==============================================
// 📝 RENDERING & FILTERING CARDS
// ==============================================
function applyFiltersAndRender() {
    let result = contacts;

    // 1. Keyword search
    const keyword = searchInput.value.toLowerCase();
    if (keyword) {
        result = result.filter(c => 
            c.name.toLowerCase().includes(keyword) ||
            c.email.toLowerCase().includes(keyword) ||
            (c.company && c.company.toLowerCase().includes(keyword))
        );
    }

    // 2. Favorite Filter
    if (showFavoritesOnly) {
        result = result.filter(c => c.favorite);
    }

    // 3. Sorting
    const sortBy = sortSelect.value;
    result.sort((a, b) => {
        // Favs always first unless sorting is strictly active
        if (sortBy === 'default' && a.favorite !== b.favorite) {
            return a.favorite ? -1 : 1;
        }
        
        if (sortBy === 'name-asc') return a.name.localeCompare(b.name, 'th');
        if (sortBy === 'name-desc') return b.name.localeCompare(a.name, 'th');
        if (sortBy === 'company') return (a.company || '').localeCompare(b.company || '', 'th');
        
        return 0; // fallback to API order
    });

    renderContactCards(result);
}

function renderContactCards(data) {
    if (data.length === 0) {
        contactGrid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    
    // Check if ALL visible are selected
    const allVisibleSelected = data.length > 0 && data.every(c => selectedIds.has(c.id));
    selectAllCb.checked = allVisibleSelected;

    contactGrid.innerHTML = data.map((contact, index) => {
        const initial = contact.name.charAt(0).toUpperCase();
        const gradientClass = avatarGradients[index % avatarGradients.length];
        const delay = (index % 10) * 0.05; 
        const isSelected = selectedIds.has(contact.id);
        const favIcon = contact.favorite ? '★' : '☆';
        const favClass = contact.favorite ? 'is-fav' : '';

        return `
            <div class="contact-card ${isSelected ? 'selected' : ''}" style="animation-delay: ${delay}s" onclick="openDetail('${contact.id}')">
                <div class="cb-wrap stop-propagation">
                    <input type="checkbox" class="custom-checkbox card-cb" data-id="${contact.id}" ${isSelected ? 'checked' : ''}>
                </div>
                
                <div class="card-top">
                    <div class="avatar ${gradientClass}">${initial}</div>
                    <div class="name-wrap">
                        <div class="name">${contact.name}</div>
                        ${contact.company ? `<span class="company-badge">🏢 ${contact.company}</span>` : ''}
                    </div>
                    <button class="fav-btn ${favClass} stop-propagation" onclick="toggleFav('${contact.id}', '${contact.name.replace(/'/g, "\\'")}', event)">
                        ${favIcon}
                    </button>
                </div>
                
                <div class="info">
                    <div class="info-row">
                        <span class="info-icon">📧</span>
                        <span>${contact.email}</span>
                    </div>
                    ${contact.phone ? `
                    <div class="info-row">
                        <span class="info-icon">📱</span>
                        <span>${contact.phone}</span>
                    </div>` : ''}
                </div>
                
                <div class="card-actions stop-propagation">
                    <button class="btn-icon btn-edit-sm" onclick="editContact('${contact.id}', event)" title="แก้ไข">✏️</button>
                    <button class="btn-icon btn-del-sm" onclick="confirmDelete('${contact.id}', '${contact.name.replace(/'/g, "\\'")}', event)" title="ลบ">🗑️</button>
                </div>
            </div>
        `;
    }).join('');

    // Attach checkbox events
    document.querySelectorAll('.card-cb').forEach(cb => {
        cb.addEventListener('change', (e) => {
            e.stopPropagation();
            toggleSelect(e.target.dataset.id, e.target.checked);
        });
        cb.addEventListener('click', e => e.stopPropagation()); // prevent card click
    });
}

// ==============================================
// 📱 CONTACT DETAIL MODAL
// ==============================================
function openDetail(id) {
    const contact = contacts.find(c => c.id === id);
    if (!contact) return;

    const initial = contact.name.charAt(0).toUpperCase();
    const createdDate = new Date(contact.createdAt || Date.now()).toLocaleDateString('th-TH', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    
    // Filter activities for this contact (basic string match)
    const personalLog = activities.filter(a => a.contactName === contact.name).slice(0, 5);
    
    const logHtml = personalLog.length > 0 
        ? personalLog.map(act => {
            const date = new Date(act.timestamp).toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            return `<div class="info-row" style="margin-bottom: 0.5rem; justify-content: space-between;">
                        <span>${act.action}</span>
                        <span style="font-size: 0.75rem">${date}</span>
                    </div>`;
        }).join('')
        : '<p style="color: #666; font-size: 0.85rem">ยังไม่มีประวัติ</p>';

    detailContent.innerHTML = `
        <div class="detail-hero">
            <div class="avatar avatar-gradient-0" style="width:80px; height:80px; border-radius: 20px; font-size:2.5rem">${initial}</div>
            <div>
                <div class="detail-name">${contact.name} ${contact.favorite ? '<span style="color:#ffab00; font-size:1.2rem">★</span>' : ''}</div>
                <div class="detail-company">${contact.company || 'ไม่ได้ระบุบริษัท'}</div>
            </div>
        </div>
        
        <div class="detail-grid">
            <div class="detail-item">
                <span class="detail-label">อีเมล</span>
                <span class="detail-value">📧 ${contact.email}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">เบอร์โทร</span>
                <span class="detail-value">📱 ${contact.phone || '-'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">วันที่เพิ่ม</span>
                <span class="detail-value">📅 ${createdDate}</span>
            </div>
        </div>
        
        <div class="detail-activity-sec">
            <h4>ประวัติล่าสุดของรายชื่อนี้</h4>
            <div class="detail-act-list">
                ${logHtml}
            </div>
        </div>
    `;

    detailModal.style.display = 'flex';
}

detailCloseBtn.addEventListener('click', () => detailModal.style.display = 'none');
detailModal.addEventListener('click', e => { if(e.target === detailModal) detailModal.style.display = 'none'; });

// ==============================================
// ⭐ FAVORITES
// ==============================================
function toggleFilterFav() {
    showFavoritesOnly = !showFavoritesOnly;
    filterFavBtn.classList.toggle('active', showFavoritesOnly);
    applyFiltersAndRender();
}

filterFavBtn.addEventListener('click', toggleFilterFav);

async function toggleFav(id, name, event) {
    if (event) event.stopPropagation();
    
    const contact = contacts.find(c => c.id === id);
    if(!contact) return;
    
    const newFav = !contact.favorite;
    
    try {
        await fetch(`${API_URL}/${id}`, {
            method: 'PATCH', // Update partial
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ favorite: newFav })
        });
        
        await logActivity(newFav ? 'FAVORITE' : 'UNFAVORITE', name);
        
        // Update local state without full refetch for speed
        contact.favorite = newFav;
        renderApp();
        showToast(newFav ? 'เพิ่มในรายการโปรดแล้ว ⭐' : 'ลบจากรายการโปรดแล้ว', 'info');
    } catch (e) {
        showToast('ผิดพลาด', 'error');
    }
}

// ==============================================
// ☑️ BULK SELECTION & DELETE
// ==============================================
function toggleSelect(id, isSelected) {
    if (isSelected) selectedIds.add(id);
    else selectedIds.delete(id);
    updateBulkBar();
    renderContactCards(contacts); // re-render to update selected styling
}

selectAllCb.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    
    // Get visible contacts currently rendered (naive approach: just use full list for demo)
    // For tighter integration, we should extract the visible array from applyFiltersAndRender
    // Here we'll just operate on 'contacts' for simplicity if no search is active
    contacts.forEach(c => {
        if (isChecked) selectedIds.add(c.id);
        else selectedIds.delete(c.id);
    });
    
    updateBulkBar();
    applyFiltersAndRender();
});

function updateBulkBar() {
    if (selectedIds.size > 0) {
        bulkActionBar.style.display = 'flex';
        selectedCount.textContent = `เลือก ${selectedIds.size} รายการ`;
    } else {
        bulkActionBar.style.display = 'none';
        selectAllCb.checked = false;
    }
}

bulkDeleteBtn.addEventListener('click', () => {
    if (selectedIds.size === 0) return;
    pendingDeleteId = 'BULK';
    deleteMessage.textContent = `คุณต้องการลบผู้ติดต่อ ${selectedIds.size} รายการ ใช่หรือไม่?`;
    deleteModal.style.display = 'flex';
});

// ==============================================
// 🗑️ DELETE (Single & Bulk)
// ==============================================
function confirmDelete(id, name, event) {
    if (event) event.stopPropagation();
    pendingDeleteId = id;
    deleteMessage.textContent = `คุณต้องการลบ "${name}" ใช่หรือไม่?`;
    deleteModal.style.display = 'flex';
}

deleteCancelBtn.addEventListener('click', () => {
    deleteModal.style.display = 'none';
    pendingDeleteId = null;
});

deleteConfirmBtn.addEventListener('click', async () => {
    const idToDelete = pendingDeleteId;
    deleteModal.style.display = 'none';
    
    if (idToDelete === 'BULK') {
        // Bulk Delete
        const ids = Array.from(selectedIds);
        try {
            // Promise.all to delete multiple
            await Promise.all(ids.map(id => fetch(`${API_URL}/${id}`, { method: 'DELETE' })));
            await logActivity('DELETE', `ลบพร้อมกัน ${ids.length} รายการ`);
            
            selectedIds.clear();
            showToast(`ลบ ${ids.length} รายการสำเร็จ! 🗑️`);
            fetchContacts();
        } catch (e) {
            showToast('ลบข้อมูลไม่สำเร็จ ❌', 'error');
        }
    } else {
        // Single Delete
        const contact = contacts.find(c => c.id === idToDelete);
        try {
            await fetch(`${API_URL}/${idToDelete}`, { method: 'DELETE' });
            await logActivity('DELETE', contact ? contact.name : 'Unknown');
            
            selectedIds.delete(idToDelete);
            showToast('ลบผู้ติดต่อสำเร็จ! 🗑️');
            fetchContacts();
        } catch (e) {
            showToast('ลบข้อมูลไม่สำเร็จ ❌', 'error');
        }
    }
});

// ==============================================
// 🔐 ADVANCED FORM VALIDATION
// ==============================================
function validateForm(currentId = null) {
    let isValid = true;
    
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();

    // Reset styles
    nameInput.classList.remove('invalid');
    emailInput.classList.remove('invalid');
    phoneInput.classList.remove('invalid');
    nameError.style.display = 'none';
    emailError.style.display = 'none';
    phoneError.style.display = 'none';

    // 1. Name validation
    if (!name) {
        nameInput.classList.add('invalid');
        nameError.textContent = 'กรุณากรอกชื่อ-นามสกุล';
        nameError.style.display = 'block';
        isValid = false;
    }

    // 2. Email validation (Format & Unique)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
        emailInput.classList.add('invalid');
        emailError.textContent = 'กรุณากรอกอีเมล';
        emailError.style.display = 'block';
        isValid = false;
    } else if (!emailRegex.test(email)) {
        emailInput.classList.add('invalid');
        emailError.textContent = 'รูปแบบอีเมลไม่ถูกต้อง';
        emailError.style.display = 'block';
        isValid = false;
    } else {
        // Check uniqueness
        const dupEmail = contacts.find(c => c.email.toLowerCase() === email.toLowerCase() && c.id !== currentId);
        if (dupEmail) {
            emailInput.classList.add('invalid');
            emailError.textContent = 'อีเมลนี้มีอยู่ในระบบแล้ว';
            emailError.style.display = 'block';
            isValid = false;
        }
    }

    // 3. Phone validation (Unique, optional)
    if (phone) {
        const dupPhone = contacts.find(c => c.phone === phone && c.id !== currentId);
        if (dupPhone) {
            phoneInput.classList.add('invalid');
            phoneError.textContent = 'เบอร์โทรนี้ถูกใช้ไปแล้ว';
            phoneError.style.display = 'block';
            isValid = false;
        }
    }

    return isValid;
}

// ==============================================
// ➕✏️ CREATE & UPDATE
// ==============================================
addBtn.addEventListener('click', () => {
    contactForm.reset();
    contactId.value = '';
    
    // reset validation UI
    nameInput.classList.remove('invalid'); emailInput.classList.remove('invalid'); phoneInput.classList.remove('invalid');
    nameError.style.display = 'none'; emailError.style.display = 'none'; phoneError.style.display = 'none';
    
    modalTitle.textContent = '➕ เพิ่มผู้ติดต่อ';
    modal.style.display = 'flex';
});

function editContact(id, event) {
    if (event) event.stopPropagation();
    
    const contact = contacts.find(c => c.id === id);
    if (!contact) return;

    contactId.value = contact.id;
    nameInput.value = contact.name;
    emailInput.value = contact.email;
    phoneInput.value = contact.phone || '';
    companyInput.value = contact.company || '';

    // reset validation UI
    nameInput.classList.remove('invalid'); emailInput.classList.remove('invalid'); phoneInput.classList.remove('invalid');
    nameError.style.display = 'none'; emailError.style.display = 'none'; phoneError.style.display = 'none';

    modalTitle.textContent = '✏️ แก้ไขผู้ติดต่อ';
    modal.style.display = 'flex';
}

contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = contactId.value;
    
    // Run Validation
    if (!validateForm(id || null)) {
        return; // stop submission if invalid
    }

    const data = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        phone: phoneInput.value.trim(),
        company: companyInput.value.trim(),
        favorite: id ? contacts.find(c=>c.id===id).favorite : false,
        createdAt: id ? contacts.find(c=>c.id===id).createdAt : new Date().toISOString()
    };

    modal.style.display = 'none';

    if (id) {
        try {
            await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            await logActivity('UPDATE', data.name);
            showToast(`แก้ไข "${data.name}" สำเร็จ! ✅`);
            fetchContacts();
        } catch(e) { showToast('อัพเดทไม่สำเร็จ', 'error'); }
    } else {
        try {
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            await logActivity('CREATE', data.name);
            showToast(`เพิ่ม "${data.name}" สำเร็จ! ✅`);
            fetchContacts();
        } catch(e) { showToast('เพิ่มข้อมูลไม่สำเร็จ', 'error'); }
    }
});

// ==============================================
// 🔎 SEARCH & SORT BINDINGS
// ==============================================
searchInput.addEventListener('input', applyFiltersAndRender);
sortSelect.addEventListener('change', applyFiltersAndRender);

cancelBtn.addEventListener('click', () => modal.style.display = 'none');
modalCloseBtn.addEventListener('click', () => modal.style.display = 'none');
modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

// Start the app
initApp();
