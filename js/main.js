// Redirect to login page
document.getElementById('continueBtn')?.addEventListener('click', () => {
    window.location.href = 'pages/login.html';
});

// Check if user is already logged in
auth.onAuthStateChanged((user) => {
    if (user && window.location.pathname.includes('login.html')) {
        window.location.href = '../dashboard.html';
    }
});