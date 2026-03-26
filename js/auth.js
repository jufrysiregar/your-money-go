// Helper Functions
function showError(elementId, message) {
    const errorDiv = document.getElementById(elementId);
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }
}

function showSuccess(elementId, message) {
    const successDiv = document.getElementById(elementId);
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
    }
}

function validatePassword(password) {
    const regex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    return regex.test(password);
}

function checkPasswordRequirements(password) {
    if (password.length < 8) {
        return { valid: false, message: 'Password minimal 8 karakter' };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: 'Password harus mengandung 1 huruf kapital' };
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return { valid: false, message: 'Password harus mengandung 1 simbol (!@#$%^&* dll)' };
    }
    return { valid: true, message: '' };
}

function shakeElement(element) {
    if (element) {
        element.classList.add('shake-animation');
        setTimeout(() => {
            element.classList.remove('shake-animation');
        }, 300);
    }
}

// ==================== REGISTER HANDLER ====================
if (document.getElementById('registerForm')) {
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fullName = document.getElementById('fullName').value;
        const email = document.getElementById('email').value;
        const gender = document.querySelector('input[name="gender"]:checked')?.value;
        const password = document.getElementById('password').value;
        const countryCode = document.getElementById('countryCode').value;
        const phoneNumber = document.getElementById('phoneNumber').value;
        const hintQuestion = document.getElementById('hintQuestion').value;
        const hintAnswer = document.getElementById('hintAnswer').value;
        
        // Validation checks
        if (!fullName || !email || !gender || !password || !hintQuestion || !hintAnswer) {
            showError('errorMessage', 'Isi semua bagian yang kosong terlebih dahulu');
            shakeElement(document.querySelector('.card'));
            return;
        }
        
        if (!validatePassword(password)) {
            showError('errorMessage', 'Password tidak sesuai ketentuan (min 8 karakter, 1 huruf besar, 1 simbol)');
            shakeElement(document.querySelector('.card'));
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
            
            showSuccess('errorMessage', 'Akun berhasil dibuat!');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } catch (error) {
            console.error('Registration error:', error);
            showError('errorMessage', error.message);
        }
    });
    
    document.getElementById('backToLogin')?.addEventListener('click', () => {
        window.location.href = 'login.html';
    });
}

// ==================== LOGIN HANDLER ====================
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        if (!email || !password) {
            showError('errorMessage', 'Isi email dan password');
            return;
        }
        
        try {
            await auth.signInWithEmailAndPassword(email, password);
            window.location.href = '../dashboard.html';
        } catch (error) {
            console.error('Login error:', error);
            showError('errorMessage', 'Email atau password salah');
        }
    });
    
    document.getElementById('forgotPasswordBtn')?.addEventListener('click', () => {
        window.location.href = 'forgot-password.html';
    });
    
    document.getElementById('registerBtn')?.addEventListener('click', () => {
        window.location.href = 'register.html';
    });
}

// ==================== FORGOT PASSWORD HANDLER ====================
if (document.getElementById('forgotForm')) {
    document.getElementById('forgotForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('resetEmail').value;
        
        if (!email) {
            showError('message', 'Masukkan email terlebih dahulu');
            return;
        }
        
        try {
            await auth.sendPasswordResetEmail(email);
            showSuccess('message', 'Link reset password telah dikirim ke email Anda');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);
        } catch (error) {
            console.error('Reset password error:', error);
            showError('message', 'Email tidak terdaftar');
        }
    });
    
    document.getElementById('backToLogin')?.addEventListener('click', () => {
        window.location.href = 'login.html';
    });
}

// ==================== VERIFY HINT FUNCTION ====================
async function verifyHint(email, question, answer) {
    try {
        // Cari user berdasarkan email
        const usersRef = db.collection('users');
        const querySnapshot = await usersRef.where('email', '==', email).get();
        
        if (querySnapshot.empty) {
            return false;
        }
        
        let userData = null;
        querySnapshot.forEach(doc => {
            userData = doc.data();
        });
        
        // Verifikasi hint
        if (userData && userData.hintQuestion === question && 
            userData.hintAnswer === answer.toLowerCase()) {
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error verifying hint:', error);
        return false;
    }
}

// ==================== RESET PASSWORD HANDLER (After Email Link) ====================
if (document.getElementById('resetPasswordForm')) {
    // Get email from URL parameter if exists
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email') || '';
    if (email) {
        document.getElementById('email').value = email;
    }
    
    document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userEmail = document.getElementById('email').value;
        const hintQuestion = document.getElementById('hintQuestion').value;
        const hintAnswer = document.getElementById('hintAnswer').value;
        const newPassword = document.getElementById('newPassword').value;
        
        // Check if all fields are filled
        if (!userEmail || !hintQuestion || !hintAnswer || !newPassword) {
            showError('errorMessage', 'Isi semua bagian yang kosong terlebih dahulu');
            shakeElement(document.querySelector('.card'));
            return;
        }
        
        // Validate password
        if (!validatePassword(newPassword)) {
            showError('errorMessage', 'Password baru tidak sesuai ketentuan (min 8 karakter, 1 huruf besar, 1 simbol)');
            shakeElement(document.querySelector('.card'));
            return;
        }
        
        // Verify hint from Firestore
        const isValidHint = await verifyHint(userEmail, hintQuestion, hintAnswer);
        
        if (!isValidHint) {
            showError('errorMessage', 'Hint salah');
            shakeElement(document.querySelector('.card'));
            return;
        }
        
        try {
            // Send password reset email
            await auth.sendPasswordResetEmail(userEmail);
            showSuccess('successMessage', 'Link reset password telah dikirim ke email Anda. Silakan cek email untuk mengatur password baru.');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 5000);
        } catch (error) {
            console.error('Reset password error:', error);
            showError('errorMessage', error.message);
        }
    });
}

// ==================== CHECK AUTH STATE ====================
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('User logged in:', user.email);
        // Redirect if on login/register page
        const currentPage = window.location.pathname;
        if (currentPage.includes('login.html') || currentPage.includes('register.html')) {
            window.location.href = '../dashboard.html';
        }
    }
});