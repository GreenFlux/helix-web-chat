// Pinecone Web Chat Settings Popup

// Default settings
let settings = {
  apiKey: '',
  hostUrl: '',
  assistantId: '',
  darkMode: false
};

// DOM elements
let apiKeyInput;
let hostUrlInput;
let assistantIdInput;
let darkModeToggle;
let saveSettingsButton;
let testConnectionButton;
let statusDot;
let statusText;

// Initialize the popup
document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  apiKeyInput = document.getElementById('api-key');
  hostUrlInput = document.getElementById('host-url');
  assistantIdInput = document.getElementById('assistant-id');
  darkModeToggle = document.getElementById('dark-mode-toggle');
  saveSettingsButton = document.getElementById('save-settings');
  testConnectionButton = document.getElementById('test-connection');
  statusDot = document.getElementById('status-dot');
  statusText = document.getElementById('status-text');

  // Add event listeners
  saveSettingsButton.addEventListener('click', saveSettings);
  testConnectionButton.addEventListener('click', testConnection);
  darkModeToggle.addEventListener('change', toggleDarkMode);
  
  // Add input validation listeners
  apiKeyInput.addEventListener('input', validateInputs);
  hostUrlInput.addEventListener('input', validateInputs);
  assistantIdInput.addEventListener('input', validateInputs);

  // Load saved settings
  loadSettings();
});

// Load settings from storage
async function loadSettings() {
  try {
    const storage = new SimpleSecureStorage();
    const credentials = await storage.getCredentials();
    
    // Update settings object
    settings = { ...settings, ...credentials };
    
    // Update UI with loaded settings
    apiKeyInput.value = settings.apiKey || '';
    hostUrlInput.value = settings.hostUrl || '';
    assistantIdInput.value = settings.assistantId || '';
    darkModeToggle.checked = settings.darkMode || false;
    
    // Update button states
    validateInputs();
  } catch (error) {
    console.error('Failed to load settings:', error);
    
    // Try to fallback to old storage format for migration
    chrome.storage.local.get(['pineconeSettings'], (result) => {
      if (result.pineconeSettings) {
        settings = { ...settings, ...result.pineconeSettings };
        
        // Update UI with loaded settings
        apiKeyInput.value = settings.apiKey || '';
        hostUrlInput.value = settings.hostUrl || '';
        assistantIdInput.value = settings.assistantId || '';
        darkModeToggle.checked = settings.darkMode || false;
      }
      
      // Update button states
      validateInputs();
    });
  }
}

// Save settings to storage
async function saveSettings() {
  // Validate inputs before saving
  if (!validateInputs()) return;
  
  // Get values from form
  const apiKey = apiKeyInput.value.trim();
  const hostUrl = hostUrlInput.value.trim();
  const assistantId = assistantIdInput.value.trim();
  const darkMode = darkModeToggle.checked;
  
  try {
    // Save to secure storage
    const storage = new SimpleSecureStorage();
    await storage.saveCredentials(apiKey, hostUrl, assistantId, darkMode);
    
    // Update settings object
    settings.apiKey = apiKey;
    settings.hostUrl = hostUrl;
    settings.assistantId = assistantId;
    settings.darkMode = darkMode;
    
    // Send settings to background script
    chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings: settings
    }, (response) => {
      if (response && response.success) {
        // Show success feedback
        saveSettingsButton.textContent = 'Saved!';
        saveSettingsButton.disabled = true;
        
        // Reset button after a short delay
        setTimeout(() => {
          saveSettingsButton.textContent = 'Save Settings';
          saveSettingsButton.disabled = false;
        }, 1500);
      } else {
        // Show error feedback
        saveSettingsButton.textContent = 'Error!';
        setTimeout(() => {
          saveSettingsButton.textContent = 'Save Settings';
        }, 1500);
      }
    });
  } catch (error) {
    console.error('Failed to save credentials:', error);
    // Show error feedback
    saveSettingsButton.textContent = 'Error!';
    setTimeout(() => {
      saveSettingsButton.textContent = 'Save Settings';
    }, 1500);
  }
}

// Validate form inputs
function validateInputs() {
  const apiKey = apiKeyInput.value.trim();
  const hostUrl = hostUrlInput.value.trim();
  const assistantId = assistantIdInput.value.trim();
  
  // Check if all required fields are filled
  const allFieldsFilled = apiKey && hostUrl && assistantId;
  
  // Basic API key format validation
  const apiKeyValid = apiKey.startsWith('pcsk_') || apiKey === '';
  
  // Basic URL validation
  let urlValid = true;
  if (hostUrl) {
    try {
      new URL(hostUrl);
    } catch {
      urlValid = false;
    }
  }
  
  // Update input validation states
  apiKeyInput.style.borderColor = apiKeyValid ? '' : '#f56565';
  hostUrlInput.style.borderColor = urlValid ? '' : '#f56565';
  
  // Enable/disable buttons
  const formValid = allFieldsFilled && apiKeyValid && urlValid;
  saveSettingsButton.disabled = !formValid;
  testConnectionButton.disabled = !formValid;
  
  return formValid;
}

// Test connection to Pinecone Assistant
function testConnection() {
  // Validate inputs first
  if (!validateInputs()) return;
  
  // Update UI to show testing status
  updateConnectionStatus('testing');
  
  // Get current form values
  const testSettings = {
    apiKey: apiKeyInput.value.trim(),
    hostUrl: hostUrlInput.value.trim(),
    assistantId: assistantIdInput.value.trim()
  };
  
  // Send message to background script to test connection with current values
  chrome.runtime.sendMessage({ 
    action: 'testConnection',
    settings: testSettings
  }, (response) => {
    if (response) {
      updateConnectionStatus(response.connected ? 'connected' : 'disconnected', response.error);
    } else {
      updateConnectionStatus('disconnected', 'No response from background script');
    }
  });
}

// Update connection status UI
function updateConnectionStatus(status, errorMessage) {
  // Remove all status classes
  statusDot.classList.remove('status-unknown', 'status-connected', 'status-disconnected');
  
  // Update based on status
  switch (status) {
    case 'connected':
      statusDot.classList.add('status-connected');
      statusText.textContent = 'Connection status: Connected to Pinecone Assistant';
      break;
    case 'disconnected':
      statusDot.classList.add('status-disconnected');
      statusText.textContent = 'Connection status: Disconnected';
      if (errorMessage) {
        statusText.textContent += ` (${errorMessage})`;
      }
      break;
    case 'testing':
      statusDot.classList.add('status-unknown');
      statusText.textContent = 'Connection status: Testing...';
      break;
    default:
      statusDot.classList.add('status-unknown');
      statusText.textContent = 'Connection status: Unknown';
  }
}

// Toggle dark mode
async function toggleDarkMode() {
  const isDarkMode = darkModeToggle.checked;
  
  // Update settings
  settings.darkMode = isDarkMode;
  
  try {
    // Save to secure storage
    const storage = new SimpleSecureStorage();
    await storage.saveCredentials(settings.apiKey, settings.hostUrl, settings.assistantId, isDarkMode);
    
    // Send updated settings to background script which will notify content scripts
    chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings: settings
    }, (response) => {
      if (response && response.success) {
        console.log('Dark mode toggled:', isDarkMode);
      } else {
        console.error('Failed to toggle dark mode');
      }
    });
  } catch (error) {
    console.error('Failed to save dark mode setting:', error);
  }
}
