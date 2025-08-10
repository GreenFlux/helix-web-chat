// State management
let sidebarVisible = false;
let pageContent = null;
let chatHistory = [];
let currentDomain = window.location.hostname;
let pineconeStatus = 'unknown'; // 'connected', 'disconnected', 'unknown'
let isFirstPrompt = true;
let pageUploadStatus = 'not-uploaded'; // 'not-uploaded', 'uploading', 'uploaded', 'error', 'has-changes'
let pageUploadDate = null;
let hasPageChanges = false;
let isDarkMode = false;

// Create and inject the chat bubble
function createChatBubble() {
  const bubble = document.createElement('div');
  bubble.className = 'pinecone-chat-bubble';
  bubble.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  `;
  
  bubble.addEventListener('click', toggleSidebar);
  document.body.appendChild(bubble);
  
  // Add styles for the chat bubble
  const style = document.createElement('style');
  style.textContent = `
    .pinecone-chat-bubble {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4f25c1 0%, #c027f5 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 9999;
      box-shadow: 0 8px 24px rgba(31, 95, 91, 0.3), 0 4px 8px rgba(0, 0, 0, 0.1);
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      border: 2px solid rgba(255, 255, 255, 0.1);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    
    .pinecone-chat-bubble:hover {
      background: linear-gradient(135deg, #4f25c1 0%, #c027f5 100%);
      transform: scale(1.1);
      box-shadow: 0 12px 32px rgba(31, 95, 91, 0.4), 0 6px 12px rgba(0, 0, 0, 0.15);
    }
    
    .pinecone-chat-bubble:active {
      transform: scale(0.95);
      transition: transform 0.1s ease;
    }
  `;
  document.head.appendChild(style);
}

// Create the sidebar
function createSidebar() {
  const sidebar = document.createElement('div');
  sidebar.className = 'pinecone-sidebar';
  sidebar.id = 'pinecone-sidebar';
  
  sidebar.innerHTML = `
    <div class="pinecone-sidebar-header">
      <div class="pinecone-connection-status ${pineconeStatus}">
        <span class="pinecone-status-dot"></span>
        <span class="pinecone-status-text">Pinecone: ${pineconeStatus}</span>
      </div>
      <div class="pinecone-upload-status ${pageUploadStatus}">
        <span class="pinecone-sync-icon">⟲</span>
        <span class="pinecone-upload-text">Page: ${getUploadStatusText()}</span>
        ${hasPageChanges ? '<button class="pinecone-update-button" title="Click to update">Update</button>' : ''}
      </div>
      <button class="pinecone-close-button">×</button>
    </div>
    <div class="pinecone-chat-container" id="pinecone-chat-container"></div>
    <div class="pinecone-input-container">
      <div class="pinecone-action-buttons">
        <button class="pinecone-summarize-button">Summarize Page</button>
        <button class="pinecone-clear-chat-button">Clear Chat</button>
      </div>
      <div class="pinecone-input-wrapper">
        <textarea class="pinecone-input" placeholder="Ask about this page..."></textarea>
        <button class="pinecone-send-button">Send</button>
      </div>
    </div>
    <div class="pinecone-resize-handle"></div>
  `;
  
  document.body.appendChild(sidebar);
  
  // Add styles for the sidebar
  const style = document.createElement('style');
  style.textContent = `
    .pinecone-sidebar {
      position: fixed;
      top: 0;
      right: -400px;
      width: 380px;
      height: 100vh;
      background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
      z-index: 10000;
      box-shadow: -8px 0 32px rgba(0, 0, 0, 0.12), -2px 0 8px rgba(0, 0, 0, 0.08);
      display: flex;
      flex-direction: column;
      transition: right 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      color: #2d3748;
      border-left: 1px solid rgba(0, 0, 0, 0.05);
    }
    
    .pinecone-sidebar.visible {
      right: 0;
    }
    
    /* Mobile responsive design */
    @media (max-width: 768px) {
      .pinecone-sidebar {
        width: 100vw;
        right: -100vw;
      }
      
      .pinecone-chat-bubble {
        bottom: 20px;
        right: 20px;
        width: 52px;
        height: 52px;
      }
      
      .pinecone-sidebar-header {
        padding: 16px;
      }
      
      .pinecone-action-buttons {
        flex-direction: column;
        gap: 8px;
      }
      
      .pinecone-input-wrapper {
        flex-direction: column;
        gap: 12px;
      }
      
      .pinecone-input {
        height: 80px;
      }
      
      .pinecone-send-button {
        width: 100%;
        padding: 14px 20px;
      }
    }
    
    @media (max-width: 480px) {
      .pinecone-sidebar-header {
        padding: 12px;
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
      
      .pinecone-connection-status,
      .pinecone-upload-status {
        font-size: 11px;
      }
      
      .pinecone-close-button {
        align-self: flex-end;
        margin-top: -8px;
      }
    }
    
    .pinecone-sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
      backdrop-filter: blur(10px);
    }
    
    .pinecone-connection-status {
      display: flex;
      align-items: center;
      font-size: 12px;
    }
    
    .pinecone-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;
    }
    
    .pinecone-connection-status.connected .pinecone-status-dot {
      background: linear-gradient(135deg, #4f25c1 0%, #c027f5 100%);
      box-shadow: 0 0 8px rgba(72, 187, 120, 0.4);
    }
    
    .pinecone-connection-status.disconnected .pinecone-status-dot {
      background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
      box-shadow: 0 0 8px rgba(245, 101, 101, 0.4);
    }
    
    .pinecone-connection-status.unknown .pinecone-status-dot {
      background: linear-gradient(135deg, #ed8936 0%, #dd7724 100%);
      box-shadow: 0 0 8px rgba(237, 137, 54, 0.4);
    }
    
    .pinecone-upload-status {
      display: flex;
      align-items: center;
      font-size: 11px;
      color: #666;
    }
    
    .pinecone-upload-status.uploaded {
      color: #4f25c1;
    }
    
    .pinecone-upload-status.uploading {
      color: #ed8936;
    }
    
    .pinecone-upload-status.error {
      color: #f56565;
    }
    
    .pinecone-upload-status.has-changes {
      color: #ed8936;
    }
    
    .pinecone-sync-icon {
      margin-right: 4px;
      font-size: 12px;
      opacity: 0.7;
    }
    
    .pinecone-update-button {
      margin-left: 6px;
      padding: 2px 6px;
      font-size: 10px;
      background-color: #ed8936;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
    }
    
    .pinecone-update-button:hover {
      background-color: #dd7724;
    }
    
    .pinecone-close-button {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #718096;
    }
    
    .pinecone-chat-container {
      flex: 1;
      overflow-y: auto;
      padding: 15px;
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    
    .pinecone-message {
      padding: 10px 15px;
      border-radius: 10px;
      max-width: 80%;
      word-break: break-word;
    }
    
    .pinecone-user-message {
      align-self: flex-end;
      background-color: #4f25c1;
      color: white;
    }
    
    .pinecone-assistant-message {
      align-self: flex-start;
      background-color: #edf2f7;
    }
    
    .pinecone-input-container {
      padding: 15px;
      border-top: 1px solid #eaeaea;
    }
    
    
    .pinecone-action-buttons {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .pinecone-summarize-button {
      flex: 1;
      padding: 12px 16px;
      background: linear-gradient(135deg, #4f25c1 0%, #c027f5 100%);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      font-size: 13px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 4px rgba(72, 187, 120, 0.2);
    }
    
    .pinecone-summarize-button:hover {
      background: linear-gradient(135deg, #c027f5 0%, #4f25c1 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(72, 187, 120, 0.3);
    }
    
    .pinecone-clear-chat-button {
      flex: 1;
      padding: 12px 16px;
      background: linear-gradient(135deg, #718096 0%, #4a5568 100%);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      font-size: 13px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 4px rgba(113, 128, 150, 0.2);
    }
    
    .pinecone-clear-chat-button:hover {
      background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(113, 128, 150, 0.3);
    }
    
    .pinecone-input-wrapper {
      display: flex;
      gap: 10px;
    }
    
    .pinecone-input {
      flex: 1;
      padding: 12px 16px;
      border: 2px solid rgba(0, 0, 0, 0.08);
      border-radius: 8px;
      resize: none;
      height: 60px;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.4;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(10px);
    }
    
    .pinecone-input:focus {
      outline: none;
      border-color: #4f25c1;
      box-shadow: 0 0 0 3px rgba(31, 95, 91, 0.1);
      background: rgba(255, 255, 255, 1);
    }
    
    .pinecone-send-button {
      padding: 12px 20px;
      background: linear-gradient(135deg, #4f25c1 0%, #c027f5 100%);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      font-size: 13px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 4px rgba(31, 95, 91, 0.2);
      min-width: 60px;
    }
    
    .pinecone-send-button:hover {
      background: linear-gradient(135deg, #4f25c1 0%, #c027f5 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(31, 95, 91, 0.3);
    }
    
    .pinecone-resize-handle {
      position: absolute;
      left: 0;
      top: 0;
      width: 5px;
      height: 100%;
      cursor: ew-resize;
      background-color: transparent;
    }
    
    .pinecone-thinking {
      align-self: flex-start;
      background-color: #edf2f7;
      padding: 10px 15px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .pinecone-thinking-dots {
      display: flex;
      gap: 4px;
    }
    
    .pinecone-thinking-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #718096;
      animation: pinecone-thinking-animation 1.4s infinite ease-in-out;
    }
    
    .pinecone-thinking-dot:nth-child(1) {
      animation-delay: 0s;
    }
    
    .pinecone-thinking-dot:nth-child(2) {
      animation-delay: 0.2s;
    }
    
    .pinecone-thinking-dot:nth-child(3) {
      animation-delay: 0.4s;
    }
    
    @keyframes pinecone-thinking-animation {
      0%, 100% {
        transform: scale(0.7);
        opacity: 0.5;
      }
      50% {
        transform: scale(1);
        opacity: 1;
      }
    }
    
    /* Dark Mode Styles - Only for chat area */
    .pinecone-sidebar.dark-mode {
      background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%) !important;
      color: #e5e7eb !important;
      border-left: 1px solid rgba(255, 255, 255, 0.1) !important;
    }
    
    .pinecone-sidebar.dark-mode .pinecone-sidebar-header {
      background: linear-gradient(135deg, #1f1f1f 0%, #2a2a2a 100%) !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
    }
    
    .pinecone-sidebar.dark-mode .pinecone-chat-container {
      background: transparent !important;
    }
    
    .pinecone-sidebar.dark-mode .pinecone-assistant-message {
      background-color: #2d3748 !important;
      color: #e5e7eb !important;
    }
    
    .pinecone-sidebar.dark-mode .pinecone-input-container {
      background: linear-gradient(135deg, #1f1f1f 0%, #2a2a2a 100%) !important;
      border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
    }
    
    .pinecone-sidebar.dark-mode .pinecone-input {
      background: rgba(45, 55, 72, 0.8) !important;
      color: #e5e7eb !important;
      border: 2px solid rgba(255, 255, 255, 0.15) !important;
    }
    
    .pinecone-sidebar.dark-mode .pinecone-input:focus {
      background: rgba(45, 55, 72, 1) !important;
      border-color: #4f25c1 !important;
      box-shadow: 0 0 0 3px rgba(79, 37, 193, 0.2) !important;
    }
    
    .pinecone-sidebar.dark-mode .pinecone-input::placeholder {
      color: #9ca3af !important;
    }
    
    .pinecone-sidebar.dark-mode .pinecone-thinking {
      background-color: #2d3748 !important;
      color: #e5e7eb !important;
    }
    
    .pinecone-sidebar.dark-mode .pinecone-thinking-dot {
      background-color: #9ca3af !important;
    }
    
    /* Status text - white in dark mode for better readability */
    .pinecone-sidebar.dark-mode .pinecone-connection-status {
      color: #ffffff !important;
    }
    
    .pinecone-sidebar.dark-mode .pinecone-upload-status {
      color: #ffffff !important;
    }
    
    .pinecone-sidebar.dark-mode .pinecone-status-text {
      color: #ffffff !important;
    }
    
    .pinecone-sidebar.dark-mode .pinecone-upload-text {
      color: #ffffff !important;
    }
  `;
  document.head.appendChild(style);
  
  // Add event listeners
  document.querySelector('.pinecone-close-button').addEventListener('click', toggleSidebar);
  document.querySelector('.pinecone-send-button').addEventListener('click', sendMessage);
  document.querySelector('.pinecone-summarize-button').addEventListener('click', summarizePage);
  document.querySelector('.pinecone-clear-chat-button').addEventListener('click', clearChat);
  document.querySelector('.pinecone-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // Add update button listener if it exists
  const updateButton = document.querySelector('.pinecone-update-button');
  if (updateButton) {
    updateButton.addEventListener('click', updatePageContent);
  }
  
  // Setup resize functionality
  setupResizeFunctionality();
}

// Setup resize functionality for the sidebar
function setupResizeFunctionality() {
  const resizeHandle = document.querySelector('.pinecone-resize-handle');
  const sidebar = document.getElementById('pinecone-sidebar');
  let startX, startWidth;
  
  resizeHandle.addEventListener('mousedown', (e) => {
    startX = e.clientX;
    startWidth = parseInt(getComputedStyle(sidebar).width, 10);
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
  });
  
  function resize(e) {
    const width = startWidth - (e.clientX - startX);
    if (width > 300 && width < 800) {
      sidebar.style.width = `${width}px`;
    }
  }
  
  function stopResize() {
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);
  }
}

// Get upload status text with date
function getUploadStatusText() {
  const statusTexts = {
    'not-uploaded': 'not uploaded',
    'uploading': 'uploading...',
    'uploaded': pageUploadDate ? `uploaded<br><small>${formatDate(pageUploadDate)}</small>` : 'uploaded',
    'error': 'upload failed',
    'has-changes': pageUploadDate ? `uploaded - page changed<br><small>${formatDate(pageUploadDate)}</small>` : 'uploaded - page changed'
  };
  return statusTexts[pageUploadStatus] || 'unknown';
}

// Format date for display
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// Toggle sidebar visibility
function toggleSidebar() {
  const sidebar = document.getElementById('pinecone-sidebar');
  sidebarVisible = !sidebarVisible;
  
  if (sidebarVisible) {
    sidebar.classList.add('visible');
    // Check Pinecone connection status when sidebar is opened
    checkPineconeConnection();
    // Check page upload status and auto-upload if needed
    checkAndAutoUploadPage();
  } else {
    sidebar.classList.remove('visible');
  }
}

// Extract text content from the page
function extractPageContent() {
  // Clone the document body to avoid modifying the original
  const bodyClone = document.body.cloneNode(true);
  
  // Remove script, style, svg, and other non-content elements
  const elementsToRemove = [
    'script', 'style', 'svg', 'iframe', 'noscript', 'nav',
    'footer', 'header', 'aside', 'form', 'meta', 'link'
  ];
  
  elementsToRemove.forEach(tag => {
    const elements = bodyClone.querySelectorAll(tag);
    elements.forEach(element => element.remove());
  });
  
  // Remove elements that are likely to be navigation, ads, etc.
  const classesToRemove = [
    'nav', 'navbar', 'navigation', 'menu', 'sidebar', 'footer', 'header',
    'ad', 'ads', 'advertisement', 'banner', 'cookie', 'popup', 'modal'
  ];
  
  classesToRemove.forEach(className => {
    const elements = bodyClone.querySelectorAll(`[class*="${className}"], [id*="${className}"]`);
    elements.forEach(element => element.remove());
  });
  
  // Get all text nodes and their visible text
  let text = '';
  
  // Get title
  const title = document.title;
  if (title) {
    text += `# ${title}\n\n`;
  }
  
  // Get headings
  const headings = bodyClone.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach(heading => {
    const headingText = heading.textContent.trim();
    if (headingText) {
      const level = heading.tagName.charAt(1);
      text += `${'#'.repeat(parseInt(level))} ${headingText}\n\n`;
    }
  });
  
  // Get paragraphs and other text elements
  const textElements = bodyClone.querySelectorAll('p, li, td, th, div, span, article, section, main');
  textElements.forEach(element => {
    // Skip if element is hidden
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return;
    }
    
    const elementText = element.textContent.trim();
    if (elementText && !text.includes(elementText)) {
      text += `${elementText}\n\n`;
    }
  });
  
  // Clean up the text
  text = text
    .replace(/[ \t]+/g, ' ')  // Replace multiple spaces/tabs with a single space (preserve newlines)
    .replace(/\n\s*\n/g, '\n\n')  // Replace multiple newlines with two newlines
    .trim();
  
  return text;
}

// Send a message to the Pinecone Assistant API
function sendMessage() {
  const inputElement = document.querySelector('.pinecone-input');
  const userMessage = inputElement.value.trim();
  
  if (!userMessage) return;
  
  // Clear input
  inputElement.value = '';
  
  // Add user message to chat
  addMessageToChat('user', userMessage);
  
  // Show thinking indicator
  const thinkingElement = document.createElement('div');
  thinkingElement.className = 'pinecone-thinking';
  thinkingElement.innerHTML = `
    <span>Thinking</span>
    <div class="pinecone-thinking-dots">
      <div class="pinecone-thinking-dot"></div>
      <div class="pinecone-thinking-dot"></div>
      <div class="pinecone-thinking-dot"></div>
    </div>
  `;
  document.getElementById('pinecone-chat-container').appendChild(thinkingElement);
  
  // Prepare the message to send to the background script
  const message = {
    action: 'sendMessage',
    prompt: userMessage
  };
  
  // Send message to background script
  chrome.runtime.sendMessage(message, (response) => {
    // Remove thinking indicator
    thinkingElement.remove();
    
    if (response.error) {
      addMessageToChat('assistant', `Error: ${response.error}`);
      return;
    }
    
    // Add assistant response to chat
    addMessageToChat('assistant', response.text);
    
    // Save chat history
    saveChatHistory();
  });
  
  // Add to chat history
  chatHistory.push({ role: 'user', content: userMessage });
}

// Check page status and auto-upload if needed
function checkAndAutoUploadPage() {
  // Extract page content
  pageContent = extractPageContent();
  
  // Update status to show we're checking
  pageUploadStatus = 'uploading';
  updateUploadStatus();
  
  // Check if page is already uploaded
  const message = {
    action: 'checkPageStatus',
    pageUrl: window.location.href,
    pageContent: pageContent
  };
  
  chrome.runtime.sendMessage(message, (response) => {
    if (response.uploaded) {
      pageUploadStatus = 'uploaded';
      pageUploadDate = response.uploadDate;
      hasPageChanges = response.hasChanges;
      
      if (hasPageChanges) {
        pageUploadStatus = 'has-changes';
      }
      
      updateUploadStatus();
    } else {
      // Page not uploaded, auto-upload it
      autoUploadPage();
    }
  });
}

// Auto-upload page content
function autoUploadPage() {
  pageUploadStatus = 'uploading';
  updateUploadStatus();
  
  const message = {
    action: 'uploadPage',
    pageContent: pageContent,
    pageTitle: document.title,
    pageUrl: window.location.href
  };
  
  chrome.runtime.sendMessage(message, (response) => {
    if (response.error) {
      pageUploadStatus = 'error';
      console.error('Auto-upload failed:', response.error);
    } else {
      pageUploadStatus = 'uploaded';
      pageUploadDate = response.uploadDate;
      hasPageChanges = false;
    }
    
    updateUploadStatus();
  });
}

// Update existing page content
function updatePageContent() {
  pageUploadStatus = 'uploading';
  updateUploadStatus();
  
  const message = {
    action: 'updatePage',
    pageContent: pageContent,
    pageTitle: document.title,
    pageUrl: window.location.href
  };
  
  chrome.runtime.sendMessage(message, (response) => {
    if (response.error) {
      pageUploadStatus = 'error';
      addMessageToChat('assistant', `Update Error: ${response.error}`);
    } else {
      pageUploadStatus = 'uploaded';
      pageUploadDate = response.uploadDate;
      hasPageChanges = false;
      addMessageToChat('assistant', 'Page successfully updated! The new content is now available for questions.');
    }
    
    updateUploadStatus();
  });
}

// Clear chat history
function clearChat() {
  // Clear chat history array
  chatHistory = [];
  
  // Clear chat container UI
  const chatContainer = document.getElementById('pinecone-chat-container');
  chatContainer.innerHTML = '';
  
  // Save empty chat history to storage
  saveChatHistory();
  
  // Add confirmation message
  addMessageToChat('assistant', 'Chat history cleared! You can start a new conversation.');
}

// Summarize the page
function summarizePage() {
  // Extract page content if needed
  if (!pageContent) {
    pageContent = extractPageContent();
  }
  
  // Show thinking indicator
  const thinkingElement = document.createElement('div');
  thinkingElement.className = 'pinecone-thinking';
  thinkingElement.innerHTML = `
    <span>Summarizing</span>
    <div class="pinecone-thinking-dots">
      <div class="pinecone-thinking-dot"></div>
      <div class="pinecone-thinking-dot"></div>
      <div class="pinecone-thinking-dot"></div>
    </div>
  `;
  document.getElementById('pinecone-chat-container').appendChild(thinkingElement);
  
  // Prepare the message
  const message = {
    action: 'summarize',
    pageContent: pageContent
  };
  
  // Send message to background script
  chrome.runtime.sendMessage(message, (response) => {
    // Remove thinking indicator
    thinkingElement.remove();
    
    if (response.error) {
      addMessageToChat('assistant', `Error: ${response.error}`);
      return;
    }
    
    // Add summary to chat
    addMessageToChat('assistant', response.text);
    
    // Save chat history
    saveChatHistory();
  });
  
  // Add to chat history
  chatHistory.push({ role: 'user', content: 'Please summarize this page.' });
}

// Add a message to the chat
function addMessageToChat(role, content) {
  const chatContainer = document.getElementById('pinecone-chat-container');
  const messageElement = document.createElement('div');
  
  messageElement.className = `pinecone-message pinecone-${role}-message`;
  
  // Format message content (handle markdown)
  const formattedContent = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
    .replace(/\*(.*?)\*/g, '<em>$1</em>')  // Italic
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')  // Code blocks
    .replace(/`([^`]+)`/g, '<code style="color: #4f25c1; background-color: #f5f5f5;">$1</code>')  // Inline code
    .replace(/\n/g, '<br>');  // Line breaks
  
  messageElement.innerHTML = formattedContent;
  chatContainer.appendChild(messageElement);
  
  // Scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;
  
  // Add to chat history
  if (!chatHistory.some(msg => msg.role === role && msg.content === content)) {
    chatHistory.push({ role, content });
  }
}

// Check Pinecone connection status
function checkPineconeConnection() {
  chrome.runtime.sendMessage({ action: 'checkConnection' }, (response) => {
    pineconeStatus = response.connected ? 'connected' : 'disconnected';
    updateConnectionStatus();
  });
}

// Update connection status in UI
function updateConnectionStatus() {
  const statusElement = document.querySelector('.pinecone-connection-status');
  if (statusElement) {
    statusElement.className = `pinecone-connection-status ${pineconeStatus}`;
    statusElement.querySelector('.pinecone-status-text').textContent = `Pinecone: ${pineconeStatus}`;
  }
}

// Update upload status in UI
function updateUploadStatus() {
  const statusElement = document.querySelector('.pinecone-upload-status');
  if (statusElement) {
    statusElement.className = `pinecone-upload-status ${pageUploadStatus}`;
    statusElement.querySelector('.pinecone-upload-text').innerHTML = `Page: ${getUploadStatusText()}`;
    
    // Update the update button visibility
    const existingUpdateButton = statusElement.querySelector('.pinecone-update-button');
    if (existingUpdateButton) {
      existingUpdateButton.remove();
    }
    
    if (hasPageChanges && pageUploadStatus === 'has-changes') {
      const updateButton = document.createElement('button');
      updateButton.className = 'pinecone-update-button';
      updateButton.title = 'Click to update';
      updateButton.textContent = 'Update';
      updateButton.addEventListener('click', updatePageContent);
      statusElement.appendChild(updateButton);
    }
  }
}

// Save chat history to storage
function saveChatHistory() {
  chrome.storage.local.set({
    [`chat_${currentDomain}`]: chatHistory
  });
}

// Load chat history from storage
function loadChatHistory() {
  chrome.storage.local.get([`chat_${currentDomain}`], (result) => {
    const savedChat = result[`chat_${currentDomain}`];
    if (savedChat && Array.isArray(savedChat)) {
      chatHistory = savedChat;
      
      // Display loaded messages
      const chatContainer = document.getElementById('pinecone-chat-container');
      chatContainer.innerHTML = '';
      
      chatHistory.forEach(message => {
        addMessageToChat(message.role, message.content);
      });
    }
  });
}

// Save settings to storage
function saveSettings() {
  chrome.storage.local.set({
    pineconeSettings: {
      // No specific settings needed for Pinecone (credentials are in background)
    }
  });
}

// Load settings from storage
function loadSettings() {
  chrome.storage.local.get(['pineconeSettings'], (result) => {
    if (result.pineconeSettings) {
      // Load any future settings if needed
    }
  });
}

// Toggle dark mode
function toggleDarkMode(darkMode) {
  console.log('Toggling dark mode:', darkMode);
  isDarkMode = darkMode;
  const sidebar = document.getElementById('pinecone-sidebar');
  
  if (sidebar) {
    if (isDarkMode) {
      sidebar.classList.add('dark-mode');
      console.log('Dark mode class added to sidebar');
    } else {
      sidebar.classList.remove('dark-mode');
      console.log('Dark mode class removed from sidebar');
    }
  } else {
    console.error('Sidebar element not found when toggling dark mode');
  }
}

// Load dark mode setting
function loadDarkMode() {
  console.log('Loading dark mode setting from storage...');
  chrome.storage.local.get(['pineconeSettings'], (result) => {
    console.log('Storage result:', result);
    if (result.pineconeSettings) {
      const darkMode = result.pineconeSettings.darkMode || false;
      console.log('Dark mode setting found:', darkMode);
      toggleDarkMode(darkMode);
    } else {
      console.log('No pineconeSettings found in storage, defaulting to light mode');
      toggleDarkMode(false);
    }
  });
}

// Listen for messages from background script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  if (message.action === 'settingsUpdated') {
    console.log('Settings updated, reloading settings and dark mode');
    loadSettings();
    loadDarkMode();
  } else if (message.action === 'toggleDarkMode') {
    console.log('Direct dark mode toggle message received:', message.darkMode);
    toggleDarkMode(message.darkMode);
  }
});

// Initialize the extension
function init() {
  console.log('Initializing Helix Web Chat extension...');
  createChatBubble();
  createSidebar();
  loadSettings();
  loadChatHistory();
  loadDarkMode();
  
  // Clear chat history when navigating to a new page (but not on same domain)
  const currentUrl = window.location.href;
  chrome.storage.local.get(['lastUrl'], (result) => {
    const lastUrl = result.lastUrl;
    
    if (lastUrl) {
      const lastUrlDomain = new URL(lastUrl).hostname;
      if (lastUrlDomain !== currentDomain) {
        chatHistory = [];
        isFirstPrompt = true;
        pageContent = null;
        pageUploadStatus = 'not-uploaded';
      }
    }
    
    // Save current URL
    chrome.storage.local.set({ lastUrl: currentUrl });
  });
}

// Run the initialization
init();
