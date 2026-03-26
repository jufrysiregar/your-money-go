// Register Handler
const registerForm = document.getElementById('registerForm');
const fullNameInput = document.getElementById('fullName');
const emailInput = document.getElementById('email');
const genderInputs = document.querySelectorAll('input[name="gender"]');
const passwordInput = document.getElementById('password');
const countryCodeSelect = document.getElementById('countryCode');
const phoneNumberInput = document.getElementById('phoneNumber');
const hintQuestionSelect = document.getElementById('hintQuestion');
const hintAnswerInput = document.getElementById('hintAnswer');
const termsCheckbox = document.getElementById('termsCheckbox');
const submitBtn = document.getElementById('submitBtn');
const errorDiv = document.getElementById('errorMessage');
const successDiv = document.getElementById('successMessage');
const backToLoginBtn = document.getElementById('backToLogin');

// Modal elements
const modal = document.getElementById('termsModal');
const termsLink = document.getElementById('termsLink');
const modalClose = document.querySelector('.modal-close');
const modalCloseBtn = document.querySelector('.modal-close-btn');

let hideTimeout;

// Fungsi untuk menghilangkan pesan
function hideMessages() {
    if (hideTimeout) clearTimeout(hideTimeout);
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
}

// Fungsi untuk menampilkan pesan error
function showErrorMessage(message) {
    if (hideTimeout) clearTimeout(hideTimeout);
    successDiv.style.display = 'none';
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    hideTimeout = setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Fungsi untuk menampilkan pesan sukses
function showSuccessMessage(message) {
    if (hideTimeout) clearTimeout(hideTimeout);
    errorDiv.style.display = 'none';
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    
    hideTimeout = setTimeout(() => {
        successDiv.style.display = 'none';
    }, 7000);
}

// Validasi password dengan ketentuan LOCK
function validatePassword(password) {
    // Maksimal 8 karakter
    if (password.length > 8) {
        return { valid: false, message: 'Password maksimal 8 karakter' };
    }
    // Minimal 8 karakter
    if (password.length < 8) {
        return { valid: false, message: 'Password harus 8 karakter (minimal 8)' };
    }
    // Harus mengandung 1 huruf besar
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: 'Password harus mengandung 1 huruf kapital (A-Z)' };
    }
    // Harus mengandung 1 simbol
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return { valid: false, message: 'Password harus mengandung 1 simbol (!@#$%^&* dll)' };
    }
    return { valid: true, message: '' };
}

// Event listener untuk real-time validasi password saat diketik
passwordInput?.addEventListener('input', function() {
    const password = this.value;
    const result = validatePassword(password);
    
    // Hapus pesan error sebelumnya
    const existingError = document.getElementById('password-error');
    if (existingError) existingError.remove();
    
    // Tampilkan pesan error jika tidak valid dan password tidak kosong
    if (!result.valid && password.length > 0) {
        const errorMsg = document.createElement('small');
        errorMsg.id = 'password-error';
        errorMsg.style.color = '#ff6b6b';
        errorMsg.style.fontSize = '0.7rem';
        errorMsg.style.display = 'block';
        errorMsg.style.marginTop = '5px';
        errorMsg.textContent = result.message;
        this.parentElement.parentElement.appendChild(errorMsg);
    }
});

// Enable/disable submit button berdasarkan checkbox
termsCheckbox.addEventListener('change', () => {
    submitBtn.disabled = !termsCheckbox.checked;
});

// Modal handlers
termsLink.addEventListener('click', (e) => {
    e.preventDefault();
    modal.style.display = 'block';
});

modalClose.addEventListener('click', () => {
    modal.style.display = 'none';
});

modalCloseBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// Event listener untuk menghilangkan pesan saat user klik input
const inputs = [fullNameInput, emailInput, passwordInput, phoneNumberInput, hintAnswerInput];
inputs.forEach(input => {
    if (input) {
        input.addEventListener('focus', hideMessages);
    }
});

// Submit handler
registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    const gender = document.querySelector('input[name="gender"]:checked')?.value;
    const password = passwordInput.value;
    const countryCode = countryCodeSelect.value;
    const phoneNumber = phoneNumberInput.value.trim();
    const hintQuestion = hintQuestionSelect.value;
    const hintAnswer = hintAnswerInput.value.trim();
    
    // Validasi semua field
    if (!fullName || !email || !gender || !password || !hintQuestion || !hintAnswer) {
        showErrorMessage('Isi semua bagian yang kosong terlebih dahulu');
        return;
    }
    
    // Validasi password dengan LOCK
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
        showErrorMessage(passwordValidation.message);
        return;
    }
    
    if (!termsCheckbox.checked) {
        showErrorMessage('Anda harus menyetujui syarat dan ketentuan');
        return;
    }
    
    try {
        // Create user in Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Save user data to Firestore
        await db.collection('users').doc(user.uid).set({
            fullName: fullName,
            email: email,
            gender: gender,
            phone: countryCode + phoneNumber,
            hintQuestion: hintQuestion,
            hintAnswer: hintAnswer.toLowerCase(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showSuccessMessage('Pendaftaran akun berhasil silahkan login, atau tunggu sebentar');
        
        // Reset form
        registerForm.reset();
        submitBtn.disabled = true;
        
        // Redirect ke login setelah 7 detik
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 7000);
        
    } catch (error) {
        console.error('Registration error:', error);
        if (error.code === 'auth/email-already-in-use') {
            showErrorMessage('Email sudah terdaftar');
        } else if (error.code === 'auth/weak-password') {
            showErrorMessage('Password terlalu lemah. Gunakan minimal 8 karakter, 1 huruf besar dan 1 simbol');
        } else {
            showErrorMessage(error.message);
        }
    }
});

// Back to login
backToLoginBtn?.addEventListener('click', () => {
    window.location.href = 'login.html';
});