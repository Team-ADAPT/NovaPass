// NovaPass Browser Extension - Content Script

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'autofill') {
        autofillForm(request.username, request.password);
    }
});

function autofillForm(username, password) {
    // Find username/email fields
    const usernameFields = document.querySelectorAll(
        'input[type="text"][name*="user"], input[type="text"][name*="email"], ' +
        'input[type="email"], input[autocomplete="username"]'
    );
    
    // Find password fields
    const passwordFields = document.querySelectorAll(
        'input[type="password"]'
    );
    
    // Fill username
    if (usernameFields.length > 0) {
        usernameFields[0].value = username;
        usernameFields[0].dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // Fill password
    if (passwordFields.length > 0) {
        passwordFields[0].value = password;
        passwordFields[0].dispatchEvent(new Event('input', { bubbles: true }));
    }
}

// Detect login forms on page load
window.addEventListener('load', () => {
    const passwordFields = document.querySelectorAll('input[type="password"]');
    
    if (passwordFields.length > 0) {
        // Notify background script that a login form was detected
        chrome.runtime.sendMessage({
            action: 'loginFormDetected',
            url: window.location.href
        });
    }
});
