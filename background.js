// Pinecone Assistant API communication and background tasks

// Import secure storage for service worker
importScripts('secure-storage.js');

// Pinecone configuration
let settings = {
  apiTimeout: 60000, // 60 seconds timeout for API calls
  apiKey: '',
  hostUrl: '',
  assistantId: '',
  darkMode: false
};

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Make sure we have a valid response function
  if (!sendResponse) return;

  // Handle different message actions
  switch (message.action) {
    case 'sendMessage':
      handleChatMessage(message, sendResponse);
      break;
    case 'summarize':
      handleSummarize(message, sendResponse);
      break;
    case 'uploadPage':
      handlePageUpload(message, sendResponse);
      break;
    case 'checkPageStatus':
      handleCheckPageStatus(message, sendResponse);
      break;
    case 'updatePage':
      handleUpdatePage(message, sendResponse);
      break;
    case 'checkConnection':
      checkPineconeConnection(sendResponse);
      break;
    case 'testConnection':
      testPineconeConnection(message.settings, sendResponse);
      break;
    case 'updateSettings':
      updateSettings(message, sendResponse);
      break;
    default:
      sendResponse({ error: 'Unknown action' });
  }

  // Return true to indicate we will send a response asynchronously
  return true;
});

// Handle chat message
async function handleChatMessage(message, sendResponse) {
  const { prompt } = message;

  try {
    // Call Pinecone Assistant API
    const response = await callPineconeAssistantAPI(prompt);
    sendResponse({ text: response });
  } catch (error) {
    console.error('Error sending message to Pinecone Assistant:', error);
    sendResponse({ error: error.message || 'Failed to communicate with Pinecone Assistant' });
  }
}

// Handle page summarization
async function handleSummarize(message, sendResponse) {
  const { pageContent } = message;

  try {
    // Format the summarization prompt
    const formattedPrompt = formatSummarizationPrompt(pageContent);

    // Call Pinecone Assistant API
    const response = await callPineconeAssistantAPI(formattedPrompt);
    sendResponse({ text: response });
  } catch (error) {
    console.error('Error summarizing with Pinecone Assistant:', error);
    sendResponse({ error: error.message || 'Failed to summarize with Pinecone Assistant' });
  }
}

// Handle page upload to RAG
async function handlePageUpload(message, sendResponse) {
  const { pageContent, pageTitle, pageUrl } = message;

  try {
    // Upload page content to Pinecone Assistant
    const response = await uploadContentToAssistant(pageContent, pageTitle, pageUrl);
    sendResponse({ success: true, fileId: response.id, uploadDate: new Date().toISOString() });
  } catch (error) {
    console.error('Error uploading page to Pinecone Assistant:', error);
    sendResponse({ error: error.message || 'Failed to upload page to assistant' });
  }
}

// Handle checking page upload status
async function handleCheckPageStatus(message, sendResponse) {
  const { pageUrl, pageContent } = message;

  try {
    // Find existing file by URL
    const result = await findFileByUrl(pageUrl);
    
    if (result.exists) {
      // Compare content hash if we have current content
      let hasChanges = false;
      if (pageContent) {
        const currentHash = await generateContentHash(pageContent);
        const storedHash = result.file.metadata?.contentHash;
        hasChanges = storedHash && currentHash !== storedHash;
      }
      
      sendResponse({ 
        uploaded: true, 
        fileId: result.file.id,
        uploadDate: result.file.metadata?.timestamp,
        hasChanges: hasChanges,
        title: result.file.metadata?.title
      });
    } else {
      sendResponse({ uploaded: false, error: result.error });
    }
  } catch (error) {
    console.error('Error checking page status:', error);
    sendResponse({ uploaded: false, error: error.message });
  }
}

// Handle updating existing page
async function handleUpdatePage(message, sendResponse) {
  const { pageContent, pageTitle, pageUrl } = message;

  try {
    // Find existing file by URL
    const existingFile = await findFileByUrl(pageUrl);
    
    if (existingFile.exists) {
      // Delete existing file using actual file ID
      const deleteResult = await deleteFile(existingFile.file.id);
      if (!deleteResult.success) {
        console.warn('Could not delete existing file:', deleteResult.error);
        // Continue anyway - maybe file was already deleted
      }
    }
    
    // Upload new content (Pinecone will assign new file ID)
    const response = await uploadContentToAssistant(pageContent, pageTitle, pageUrl);
    sendResponse({ success: true, fileId: response.id, uploadDate: new Date().toISOString() });
  } catch (error) {
    console.error('Error updating page:', error);
    sendResponse({ error: error.message || 'Failed to update page' });
  }
}

// Call Pinecone Assistant API
async function callPineconeAssistantAPI(prompt) {
  const url = `${settings.hostUrl}/assistant/chat/${settings.assistantId}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), settings.apiTimeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': settings.apiKey,
        'X-Pinecone-API-Version': '2025-01'
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: prompt }
        ],
        stream: false,
        model: "gpt-4o"
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pinecone Assistant error payload:', errorText);
      throw new Error(
        `Pinecone Assistant API error (${response.status}) – ${response.statusText}: ${errorText}`
      );
    }

    const data = await response.json();
    // Pinecone Assistant returns the response in a different format
    return data.message?.content || data.choices?.[0]?.message?.content || 'No response received';
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Pinecone Assistant might be taking too long to respond.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Upload content to Pinecone Assistant
async function uploadContentToAssistant(content, title, url) {
  // Generate content hash for change detection
  const contentHash = await generateContentHash(content);
  
  // Create metadata for query parameter
  const metadata = {
    url: url,
    title: title,
    timestamp: new Date().toISOString(),
    source: 'web-page-upload',
    contentHash: contentHash
  };
  
  // Construct URL with metadata as query parameter (no custom file_id)
  const metadataParam = encodeURIComponent(JSON.stringify(metadata));
  const uploadUrl = `${settings.hostUrl}/assistant/files/${settings.assistantId}?metadata=${metadataParam}`;
  
  console.log('Upload URL:', uploadUrl);
  console.log('Upload metadata:', metadata);
  
  // Create a blob from the content
  const blob = new Blob([content], { type: 'text/plain' });
  const formData = new FormData();
  formData.append('file', blob, `${title || 'page'}.txt`);
  
  console.log('Upload form data file size:', blob.size, 'bytes');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), settings.apiTimeout);

  try {
    console.log('Starting file upload request...');
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Api-Key': settings.apiKey
      },
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    console.log('Upload response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pinecone file upload error:', errorText);
      console.error('Full response:', response);
      throw new Error(
        `File upload error (${response.status}) – ${response.statusText}: ${errorText}`
      );
    }

    const data = await response.json();
    console.log('Upload successful:', data);
    return data;
  } catch (error) {
    console.error('Upload error caught:', error);
    if (error.name === 'AbortError') {
      throw new Error('Upload timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Check Pinecone Assistant connection using stored settings
async function checkPineconeConnection(sendResponse) {
  try {
    // Check if we have the required settings
    if (!settings.apiKey || !settings.hostUrl || !settings.assistantId) {
      sendResponse({ connected: false, error: 'Missing configuration. Please configure your settings first.' });
      return;
    }
    
    // Try to make a simple request to verify the assistant is accessible
    const url = `${settings.hostUrl}/assistant/chat/${settings.assistantId}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for connection check

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': settings.apiKey,
        'X-Pinecone-API-Version': '2025-01'
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'test connection' }],
        stream: false,
        model: "gpt-4o"
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    
    if (response.ok) {
      sendResponse({ connected: true });
    } else {
      sendResponse({ connected: false, error: `HTTP error: ${response.status}` });
    }
  } catch (error) {
    console.error('Error checking Pinecone Assistant connection:', error);
    sendResponse({ connected: false, error: error.message });
  }
}

// Test connection with provided settings (from popup)
async function testPineconeConnection(testSettings, sendResponse) {
  try {
    // Validate test settings
    if (!testSettings.apiKey || !testSettings.hostUrl || !testSettings.assistantId) {
      sendResponse({ connected: false, error: 'Missing required settings' });
      return;
    }
    
    // Try to make a simple request to verify the assistant is accessible
    const url = `${testSettings.hostUrl}/assistant/chat/${testSettings.assistantId}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for test

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': testSettings.apiKey,
        'X-Pinecone-API-Version': '2025-01'
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'connection test' }],
        stream: false,
        model: "gpt-4o"
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    
    if (response.ok) {
      sendResponse({ connected: true });
    } else {
      const errorText = await response.text();
      sendResponse({ 
        connected: false, 
        error: `HTTP ${response.status}: ${response.statusText}${errorText ? ' - ' + errorText : ''}` 
      });
    }
  } catch (error) {
    console.error('Error testing Pinecone Assistant connection:', error);
    sendResponse({ connected: false, error: error.message });
  }
}

// Update settings
async function updateSettings(message, sendResponse) {
  if (message.settings) {
    settings = { ...settings, ...message.settings };
    
    try {
      // Save settings to secure storage
      const storage = new SimpleSecureStorage();
      await storage.saveCredentials(
        settings.apiKey, 
        settings.hostUrl, 
        settings.assistantId, 
        settings.darkMode
      );
      
      // Notify content scripts about updated settings
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { action: 'settingsUpdated' })
            .catch(err => console.log(`Could not update tab ${tab.id}: ${err.message}`));
        });
      });
      
      sendResponse({ success: true, settings });
    } catch (error) {
      console.error('Failed to save settings to secure storage:', error);
      sendResponse({ error: 'Failed to save settings securely' });
    }
  } else {
    sendResponse({ error: 'No settings provided' });
  }
}

// Format the first prompt with page content (now handled by RAG)
function formatFirstPrompt(prompt, pageContent) {
  // With RAG, we don't need to include page content in the prompt
  // The assistant will have access to uploaded content automatically
  return prompt;
}


// Find existing file by URL using list files API
async function findFileByUrl(targetUrl) {
  const url = `${settings.hostUrl}/assistant/files/${settings.assistantId}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Api-Key': settings.apiKey,
        'X-Pinecone-API-Version': '2025-01'
      }
    });

    if (response.ok) {
      const data = await response.json();
      
      // Search through files for one with matching URL in metadata
      if (data.files && Array.isArray(data.files)) {
        for (const file of data.files) {
          if (file.metadata && file.metadata.url === targetUrl) {
            return { exists: true, file: file };
          }
        }
      }
      
      return { exists: false };
    } else {
      console.error('Error listing files:', response.status, response.statusText);
      return { exists: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.error('Error listing files:', error);
    return { exists: false, error: error.message };
  }
}

// Delete file by ID
async function deleteFile(fileId) {
  const url = `${settings.hostUrl}/assistant/files/${settings.assistantId}/${fileId}`;
  
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Api-Key': settings.apiKey,
        'X-Pinecone-API-Version': '2025-01'
      }
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorText = await response.text();
      console.error('Error deleting file:', errorText);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    return { success: false, error: error.message };
  }
}

// Generate content hash for change detection
async function generateContentHash(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Format the summarization prompt
function formatSummarizationPrompt(pageContent) {
  // For summarization, we still include the content directly since it's a one-time operation
  return `Please provide a concise summary of the following web page content. Focus on the main points, key information, and overall message:

${pageContent}

Summary:`;
}

// Load settings from storage on startup
async function loadStartupSettings() {
  try {
    const storage = new SimpleSecureStorage();
    const credentials = await storage.getCredentials();
    settings = { ...settings, ...credentials };
    console.log('Loaded encrypted settings on startup');
  } catch (error) {
    console.error('Failed to load encrypted settings on startup:', error);
    
    // Fallback to old storage format for migration
    chrome.storage.local.get(['pineconeSettings'], (result) => {
      if (result.pineconeSettings) {
        settings = { ...settings, ...result.pineconeSettings };
        console.log('Loaded legacy settings for migration');
      }
    });
  }
}

// Initialize settings
loadStartupSettings();
