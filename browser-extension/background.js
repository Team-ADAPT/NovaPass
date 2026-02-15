// NovaPass Browser Extension - Background Service Worker

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'loginFormDetected') {
        console.log('Login form detected on:', request.url);
        // Could show notification or badge
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#007bff' });
    }
});

// Listen for authentication events
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'saveToken') {
        chrome.storage.local.set({ authToken: request.token }, () => {
            console.log('Token saved');
            sendResponse({ success: true });
        });
        return true; // Keep channel open for async response
    }
    
    if (request.action === 'logout') {
        chrome.storage.local.remove('authToken', () => {
            console.log('Token removed');
            sendResponse({ success: true });
        });
        return true;
    }
});
