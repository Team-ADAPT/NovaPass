// NovaPass Browser Extension - Popup Script

const API_URL = 'http://localhost:8080/api';

document.addEventListener('DOMContentLoaded', async () => {
    const token = await getStoredToken();
    
    if (token) {
        loadVault(token);
    } else {
        showLogin();
    }
});

async function getStoredToken() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['authToken'], (result) => {
            resolve(result.authToken);
        });
    });
}

function showLogin() {
    document.getElementById('loginBtn').addEventListener('click', () => {
        // Open login page in new tab
        chrome.tabs.create({ url: 'http://localhost:8080/login' });
    });
}

async function loadVault(token) {
    try {
        const response = await fetch(`${API_URL}/vault`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const vaultItems = await response.json();
            displayVaultItems(vaultItems);
        }
    } catch (error) {
        console.error('Failed to load vault:', error);
    }
}

function displayVaultItems(items) {
    const vaultList = document.getElementById('vaultList');
    vaultList.innerHTML = '';
    
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'vault-item';
        div.textContent = item.title;
        div.addEventListener('click', () => autofillCredentials(item));
        vaultList.appendChild(div);
    });
}

function autofillCredentials(item) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: 'autofill',
            username: item.username,
            password: item.password
        });
    });
}
