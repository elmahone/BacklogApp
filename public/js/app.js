'use strict';
// Welcome page slide elements
const slide1 = document.getElementById('slide1');
const slide2 = document.getElementById('slide2');
const slide3 = document.getElementById('slide3');

// User authentication forms
const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');

// Sign up form password elements
const signupPassword = document.getElementById('signup-password');
const confirmPassword = document.getElementById('confirm-password');

const submitSignup = document.getElementById('submit-signup');
const submitLogin = document.getElementById('submit-login');

if ($('#error-message')) {
    setTimeout(() => {
        $('#error-message').fadeOut();
    }, 3000);
}

// Checks if confirm password and password values are same
const validatePassword = () => {
    if (signupPassword.value !== confirmPassword.value) {
        confirmPassword.setCustomValidity('Password does not match');
    } else {
        confirmPassword.setCustomValidity('');
    }
};

if (signupForm && loginForm) {
    signupForm.addEventListener('submit', () => {
        submitSignup.setAttribute('disabled', 'disabled');
    });
    // Validate password while typing passwords
    signupPassword.onchange = validatePassword;
    confirmPassword.onkeyup = validatePassword;

    loginForm.addEventListener('submit', () => {
        submitLogin.setAttribute('disabled', 'disabled');
    });
}
