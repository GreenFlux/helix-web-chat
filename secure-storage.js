// Simple Secure Storage for Chrome Extensions
// Encrypts sensitive data using Web Crypto API

class SimpleSecureStorage {
  constructor() {
    this.keyName = 'sss_key';
    this.dataName = 'sss_data';
  }

  // Generate a new encryption key
  async generateKey() {
    return await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Get or create encryption key
  async getOrCreateKey() {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.keyName], async (result) => {
        if (result[this.keyName]) {
          try {
            const keyData = result[this.keyName];
            const key = await crypto.subtle.importKey(
              'jwk',
              keyData,
              { name: 'AES-GCM' },
              true,
              ['encrypt', 'decrypt']
            );
            resolve(key);
          } catch (error) {
            console.error('Error importing existing key, generating new one:', error);
            const newKey = await this.generateKey();
            await this.storeKey(newKey);
            resolve(newKey);
          }
        } else {
          const newKey = await this.generateKey();
          await this.storeKey(newKey);
          resolve(newKey);
        }
      });
    });
  }

  // Store encryption key
  async storeKey(key) {
    const exportedKey = await crypto.subtle.exportKey('jwk', key);
    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.keyName]: exportedKey }, () => {
        resolve();
      });
    });
  }

  // Encrypt data
  async encrypt(data, key) {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(JSON.stringify(data));
    const iv = crypto.getRandomValues(new Uint8Array(12)); // AES-GCM needs 12 bytes IV
    
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encodedData
    );

    return {
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encryptedData)),
    };
  }

  // Decrypt data
  async decrypt(encryptedObject, key) {
    const iv = new Uint8Array(encryptedObject.iv);
    const data = new Uint8Array(encryptedObject.data);
    
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      data
    );

    const decoder = new TextDecoder();
    const decryptedText = decoder.decode(decryptedData);
    return JSON.parse(decryptedText);
  }

  // Save credentials (encrypted)
  async saveCredentials(apiKey, hostUrl, assistantId, darkMode = false) {
    try {
      const key = await this.getOrCreateKey();
      const credentials = {
        apiKey,
        hostUrl,
        assistantId,
        darkMode,
      };
      
      const encrypted = await this.encrypt(credentials, key);
      
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [this.dataName]: encrypted }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    } catch (error) {
      throw new Error(`Failed to save credentials: ${error.message}`);
    }
  }

  // Get credentials (decrypted)
  async getCredentials() {
    try {
      const key = await this.getOrCreateKey();
      
      return new Promise((resolve, reject) => {
        chrome.storage.local.get([this.dataName], async (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          if (!result[this.dataName]) {
            // No encrypted data found, return empty credentials
            resolve({
              apiKey: '',
              hostUrl: '',
              assistantId: '',
              darkMode: false,
            });
            return;
          }
          
          try {
            const decrypted = await this.decrypt(result[this.dataName], key);
            resolve({
              apiKey: decrypted.apiKey || '',
              hostUrl: decrypted.hostUrl || '',
              assistantId: decrypted.assistantId || '',
              darkMode: decrypted.darkMode || false,
            });
          } catch (error) {
            console.error('Failed to decrypt credentials:', error);
            // Return empty credentials if decryption fails
            resolve({
              apiKey: '',
              hostUrl: '',
              assistantId: '',
              darkMode: false,
            });
          }
        });
      });
    } catch (error) {
      throw new Error(`Failed to get credentials: ${error.message}`);
    }
  }

  // Clear all credentials
  async clearCredentials() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove([this.keyName, this.dataName], () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  // Check if credentials exist
  async hasCredentials() {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.dataName], (result) => {
        resolve(!!result[this.dataName]);
      });
    });
  }
}

// Make it available globally for the extension
if (typeof window !== 'undefined') {
  window.SimpleSecureStorage = SimpleSecureStorage;
}