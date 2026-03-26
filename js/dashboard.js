// Global Variables
let currentUser = null;
let currentWeekOffset = 0;
let expenseChart = null;
let currentTab = 'daily';
let currentType = 'income';

// DOM Elements
const userNameSpan = document.getElementById('userName');
const currentDateSpan = document.getElementById('currentDate');
const totalIncomeSpan = document.getElementById('totalIncome');
const totalExpenseSpan = document.getElementById('totalExpense');
const balanceSpan = document.getElementById('balance');
const logoutBtn = document.getElementById('logoutBtn');

// Format Rupiah
function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

// Format Date
function formatDate(date) {
    if (!date) return '';
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(date);
}

// Get Current Date
function updateCurrentDate() {
    const now = new Date();
    currentDateSpan.textContent = formatDate(now);
}

// Load User Data
async function loadUserData() {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'pages/login.html';
            return;
        }
        
        currentUser = user;
        
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                userNameSpan.textContent = userDoc.data().fullName || user.email;
            } else {
                userNameSpan.textContent = user.email;
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            userNameSpan.textContent = user.email;
        }
        
        // Load initial data
        updateCurrentDate();
        await loadAllTransactions();
    });
}

// Load All Transactions
async function loadAllTransactions() {
    if (!currentUser) return;
    
    try {
        const snapshot = await db.collection('transactions')
            .where('userId', '==', currentUser.uid)
            .orderBy('date', 'desc')
            .get();
        
        const transactions = [];
        snapshot.forEach(doc => {
            transactions.push({ id: doc.id, ...doc.data() });
        });
        
        calculateTotals(transactions);
        await loadCurrentTabData();
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

// Calculate Totals
function calculateTotals(transactions) {
    let totalIncome = 0;
    let totalExpense = 0;
    
    transactions.forEach(trans => {
        if (trans.type === 'income') {
            totalIncome += trans.amount;
        } else {
            totalExpense += trans.amount;
        }
    });
    
    const balance = totalIncome - totalExpense;
    
    totalIncomeSpan.textContent = formatRupiah(totalIncome);
    totalExpenseSpan.textContent = formatRupiah(totalExpense);
    balanceSpan.textContent = formatRupiah(balance);
    
    // Update balance color
    if (balance < 0) {
        balanceSpan.style.color = '#e74c3c';
    } else {
        balanceSpan.style.color = '#2ecc71';
    }
}

// Get Date Range for Week
function getWeekRange(offset) {
    const now = new Date();
    const currentDay = now.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday + (offset * 7));
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return { start: monday, end: sunday };
}

// Format Week Range
function formatWeekRange(start, end) {
    const startStr = start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    const endStr = end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startStr} - ${endStr}`;
}

// Load Tab Data
async function loadCurrentTabData() {
    const activeTab = document.querySelector('.tab-pane.active');
    if (!activeTab) return;
    const tab = activeTab.id;
    
    if (tab === 'dailyTab') {
        await loadDailyTransactions();
    } else if (tab === 'weeklyTab') {
        await loadWeeklyTransactions();
    } else if (tab === 'monthlyTab') {
        await loadMonthlyTransactions();
    } else if (tab === 'yearlyTab') {
        await loadYearlyTransactions();
    } else if (tab === 'summaryTab') {
        await loadSummary();
    }
}

// Load Daily Transactions
async function loadDailyTransactions() {
    const dateInput = document.getElementById('dailyDate');
    const selectedDate = dateInput ? new Date(dateInput.value) : new Date();
    
    if (!dateInput.value) {
        dateInput.value = selectedDate.toISOString().split('T')[0];
    }
    
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);
    
    await loadTransactionsByDateRange(start, end, 'dailyTransactions');
}

// Load Weekly Transactions
async function loadWeeklyTransactions() {
    const { start, end } = getWeekRange(currentWeekOffset);
    const weekRangeSpan = document.getElementById('weekRange');
    if (weekRangeSpan) {
        weekRangeSpan.textContent = formatWeekRange(start, end);
    }
    
    await loadTransactionsByDateRange(start, end, 'weeklyTransactions');
}

// Load Monthly Transactions
async function loadMonthlyTransactions() {
    const monthInput = document.getElementById('monthlyMonth');
    let selectedDate = monthInput.value ? new Date(monthInput.value) : new Date();
    
    if (!monthInput.value) {
        monthInput.value = selectedDate.toISOString().slice(0, 7);
    }
    
    const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);
    
    await loadTransactionsByDateRange(start, end, 'monthlyTransactions');
}

// Load Yearly Transactions
async function loadYearlyTransactions() {
    const yearInput = document.getElementById('yearlyYear');
    const currentYear = new Date().getFullYear();
    
    // Populate year options
    if (yearInput && yearInput.options.length === 0) {
        for (let i = currentYear - 5; i <= currentYear + 5; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            yearInput.appendChild(option);
        }
        yearInput.value = currentYear;
    }
    
    const year = yearInput ? parseInt(yearInput.value) : currentYear;
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);
    
    await loadTransactionsByDateRange(start, end, 'yearlyTransactions');
}

// Load Transactions by Date Range
async function loadTransactionsByDateRange(start, end, containerId) {
    if (!currentUser) return;
    
    try {
        const snapshot = await db.collection('transactions')
            .where('userId', '==', currentUser.uid)
            .where('date', '>=', start)
            .where('date', '<=', end)
            .orderBy('date', 'desc')
            .get();
        
        const transactions = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            transactions.push({ 
                id: doc.id, 
                ...data,
                date: data.date?.toDate() || new Date(data.date)
            });
        });
        
        renderTransactions(transactions, containerId);
    } catch (error) {
        console.error('Error loading transactions:', error);
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Gagal memuat transaksi</p>
                </div>
            `;
        }
    }
}

// Get Category Icon
function getCategoryIcon(category) {
    const icons = {
        'Gaji': '💰',
        'Bonus': '🎁',
        'THR': '🎉',
        'Investasi': '📈',
        'Makanan': '🍔',
        'Transportasi': '🚗',
        'Belanja': '🛍️',
        'Tagihan': '📄',
        'Hiburan': '🎮',
        'Kesehatan': '💊',
        'Pendidikan': '📚',
        'Lainnya': '📌'
    };
    return icons[category] || '📌';
}

// Render Transactions
function renderTransactions(transactions, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (transactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>Belum ada transaksi</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = transactions.map(trans => `
        <div class="transaction-item">
            <div class="transaction-info">
                <div class="transaction-category">
                    ${getCategoryIcon(trans.category)}
                </div>
                <div class="transaction-details">
                    <h4>${escapeHtml(trans.description || trans.category)}</h4>
                    <p>${trans.category}</p>
                </div>
            </div>
            <div class="transaction-amount">
                <div class="amount ${trans.type}">
                    ${trans.type === 'income' ? '+' : '-'} ${formatRupiah(trans.amount)}
                </div>
                <div class="date">${formatDate(trans.date)}</div>
            </div>
            <button class="delete-transaction" onclick="deleteTransaction('${trans.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Delete Transaction
window.deleteTransaction = async function(transactionId) {
    if (confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
        try {
            await db.collection('transactions').doc(transactionId).delete();
            showToast('Transaksi berhasil dihapus', 'success');
            await loadAllTransactions();
        } catch (error) {
            console.error('Error deleting transaction:', error);
            showToast('Gagal menghapus transaksi', 'error');
        }
    }
};

// Show Toast Notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#2ecc71' : '#e74c3c'};
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 9999;
        animation: slideUp 0.3s ease;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Load Summary
async function loadSummary() {
    if (!currentUser) return;
    
    try {
        const snapshot = await db.collection('transactions')
            .where('userId', '==', currentUser.uid)
            .where('type', '==', 'expense')
            .get();
        
        const categories = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            if (categories[data.category]) {
                categories[data.category] += data.amount;
            } else {
                categories[data.category] = data.amount;
            }
        });
        
        // Sort categories by amount
        const sortedCategories = Object.entries(categories)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        const topCategoriesDiv = document.getElementById('topCategories');
        if (topCategoriesDiv) {
            if (sortedCategories.length === 0) {
                topCategoriesDiv.innerHTML = '<p style="color: rgba(255,255,255,0.5);">Belum ada data pengeluaran</p>';
            } else {
                topCategoriesDiv.innerHTML = sortedCategories.map(([cat, amount]) => `
                    <div class="category-item">
                        <span class="category-name">${getCategoryIcon(cat)} ${cat}</span>
                        <span class="category-amount">${formatRupiah(amount)}</span>
                    </div>
                `).join('');
            }
        }
        
        // Update chart
        updateChart(categories);
        
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

// Update Chart
function updateChart(categories) {
    const ctx = document.getElementById('expenseChart');
    if (!ctx) return;
    
    const canvasCtx = ctx.getContext('2d');
    const labels = Object.keys(categories);
    const data = Object.values(categories);
    
    if (expenseChart) {
        expenseChart.destroy();
    }
    
    if (labels.length === 0) {
        canvasCtx.clearRect(0, 0, ctx.width, ctx.height);
        canvasCtx.fillStyle = 'rgba(255,255,255,0.5)';
        canvasCtx.font = '14px "Plus Jakarta Sans"';
        canvasCtx.textAlign = 'center';
        canvasCtx.fillText('Belum ada data', ctx.width / 2, ctx.height / 2);
        return;
    }
    
    expenseChart = new Chart(canvasCtx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#2ecc71', '#e74c3c', '#3498db', '#f39c12', '#9b59b6',
                    '#1abc9c', '#e67e22', '#2c3e50', '#95a5a6'
                ],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: 'white',
                        font: { size: 11, family: "'Plus Jakarta Sans'" }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${formatRupiah(value)} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '60%'
        }
    });
}

// Update categories based on transaction type
function updateCategories(type) {
    const categorySelect = document.getElementById('category');
    if (!categorySelect) return;
    
    const incomeCategories = [
        { value: "Gaji", icon: "💰", label: "Gaji" },
        { value: "Bonus", icon: "🎁", label: "Bonus" },
        { value: "THR", icon: "🎉", label: "THR" },
        { value: "Investasi", icon: "📈", label: "Investasi" },
        { value: "Lainnya", icon: "📌", label: "Lainnya" }
    ];
    
    const expenseCategories = [
        { value: "Makanan", icon: "🍔", label: "Makanan" },
        { value: "Transportasi", icon: "🚗", label: "Transportasi" },
        { value: "Belanja", icon: "🛍️", label: "Belanja" },
        { value: "Tagihan", icon: "📄", label: "Tagihan" },
        { value: "Hiburan", icon: "🎮", label: "Hiburan" },
        { value: "Kesehatan", icon: "💊", label: "Kesehatan" },
        { value: "Pendidikan", icon: "📚", label: "Pendidikan" },
        { value: "Lainnya", icon: "📌", label: "Lainnya" }
    ];
    
    const categories = type === 'income' ? incomeCategories : expenseCategories;
    
    categorySelect.innerHTML = '<option value="">Pilih Kategori</option>' +
        categories.map(cat => `<option value="${cat.value}">${cat.icon} ${cat.label}</option>`).join('');
}

// Open Transaction Modal
window.openTransactionModal = function(tab) {
    const modal = document.getElementById('transactionModal');
    const dateInput = document.getElementById('transactionDate');
    const form = document.getElementById('transactionForm');
    
    if (!modal) return;
    
    // Reset form
    if (form) form.reset();
    
    // Reset type to income
    currentType = 'income';
    const incomeBtn = document.querySelector('.type-btn.income-btn');
    const expenseBtn = document.querySelector('.type-btn.expense-btn');
    if (incomeBtn) incomeBtn.classList.add('active');
    if (expenseBtn) expenseBtn.classList.remove('active');
    
    // Update categories
    updateCategories('income');
    
    // Set default date
    const now = new Date();
    if (dateInput) {
        dateInput.value = now.toISOString().split('T')[0];
    }
    
    modal.style.display = 'block';
};

// Close Modal
document.querySelector('.modal-close-dashboard')?.addEventListener('click', () => {
    document.getElementById('transactionModal').style.display = 'none';
});

window.addEventListener('click', (e) => {
    const modal = document.getElementById('transactionModal');
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// Type Selector
document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentType = btn.dataset.type;
        updateCategories(currentType);
    });
});

// Save Transaction
document.getElementById('transactionForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const category = document.getElementById('category').value;
    const amount = parseInt(document.getElementById('amount').value);
    const description = document.getElementById('description').value;
    const date = new Date(document.getElementById('transactionDate').value);
    
    if (!category || !amount || amount <= 0) {
        showToast('Mohon isi semua field yang diperlukan dengan benar', 'error');
        return;
    }
    
    try {
        await db.collection('transactions').add({
            userId: currentUser.uid,
            type: currentType,
            category: category,
            amount: amount,
            description: description || (currentType === 'income' ? `Pemasukan ${category}` : `Pengeluaran ${category}`),
            date: date,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        document.getElementById('transactionModal').style.display = 'none';
        document.getElementById('transactionForm').reset();
        
        await loadAllTransactions();
        
        showToast('Transaksi berhasil disimpan!', 'success');
    } catch (error) {
        console.error('Error saving transaction:', error);
        showToast('Gagal menyimpan transaksi', 'error');
    }
});

// Event Listeners
document.getElementById('dailyDate')?.addEventListener('change', loadDailyTransactions);
document.getElementById('monthlyMonth')?.addEventListener('change', loadMonthlyTransactions);
document.getElementById('yearlyYear')?.addEventListener('change', loadYearlyTransactions);

// Week navigation
window.changeWeek = (offset) => {
    currentWeekOffset += offset;
    loadWeeklyTransactions();
};

// Tab navigation
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        const tab = item.dataset.tab;
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        
        if (tab === 'daily') document.getElementById('dailyTab').classList.add('active');
        else if (tab === 'weekly') document.getElementById('weeklyTab').classList.add('active');
        else if (tab === 'monthly') document.getElementById('monthlyTab').classList.add('active');
        else if (tab === 'yearly') document.getElementById('yearlyTab').classList.add('active');
        else if (tab === 'summary') document.getElementById('summaryTab').classList.add('active');
        
        loadCurrentTabData();
    });
});

// Logout
logoutBtn?.addEventListener('click', async () => {
    try {
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Gagal logout', 'error');
    }
});

// Initialize
loadUserData();