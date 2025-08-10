# HELIX - Pinecone Web Chat Browser Extension

A Chrome browser extension that enables intelligent chat with web pages using Pinecone Assistant with RAG (Retrieval-Augmented Generation) capabilities.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![License MIT](https://img.shields.io/badge/License-MIT-yellow)

## 🚀 Features

- **Automatic RAG Integration**: Pages are automatically uploaded to your Pinecone Assistant's knowledge base
- **Intelligent Page Chat**: Ask questions about any web page using AI
- **Smart Content Detection**: Detects when page content changes and offers updates
- **Per-Domain Chat History**: Maintains conversation context for each website
- **Real-time Sync**: Shows upload status and dates for each page
- **Clean UI**: Resizable sidebar that doesn't interfere with web browsing
- **One-Click Summarization**: Instantly summarize any page content

## 📋 Prerequisites

Before installing this extension, you'll need:

1. **A Free Pinecone Account**: Sign up at [pinecone.io](https://pinecone.io)
2. **Pinecone Assistant**: Create an assistant in your Pinecone dashboard
3. **RAG Source Document(s)**: Upload at least one file to the assistant to begin chatting 
3. **API Credentials**: Get your API key, host URL, and assistant ID

### Getting Your Pinecone Credentials

1. **API Key**: 
   - Go to [Pinecone Console](https://app.pinecone.io)
   - Navigate to "API Keys" section
   - Copy your API key (starts with `pcsk_`)

2. **Host URL**:
   - In your Pinecone dashboard, find your assistant
   - Copy the host URL (typically `https://prod-1-data.ke.pinecone.io`)

3. **Assistant ID**:
   - In your assistant settings, copy the Assistant ID

## 📦 Installation

### Step 1: Download the Extension

```bash
git clone https://github.com/yourusername/pinecone-web-chat.git
cd pinecone-web-chat
```

### Step 2: Load in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top right)
3. Click **"Load unpacked"** 
4. Select the `helix-web-chat` folder to install
5. Refresh to see the chat icon appear in bottom right 

### Step 3: Configure Your Settings

1. Click the extension icon in your browser toolbar
2. Enter your Pinecone credentials:
   - **API Key**: Your Pinecone API key
   - **Host URL**: Your Pinecone assistant host URL  
   - **Assistant ID**: Your assistant identifier
3. Click **"Test Connection"** to verify
4. Click **"Save Settings"**

*API Key is stored locally. All web traffic goes to your Pinecone Assistant only.*

## 🎯 How to Use

### Basic Usage

1. **Navigate to any web page** you want to chat about
2. **Click the chat bubble icon** in the bottom-right corner
3. **Wait for auto-upload** - the page content will be automatically uploaded to your assistant (first time only)
4. **Start chatting** - ask questions about the page content
5. **View status** - see upload date and sync status in the sidebar header

### Key Features Explained

- **🔄 Auto-Upload**: When you first open the chat sidebar on a page, the content is automatically analyzed and uploaded
- **⚡ Change Detection**: If you reload a page and the content has changed, you'll see an "Update" button
- **💬 Chat History**: Conversations are saved per domain and restored when you revisit
- **📊 Page Status**: Shows "uploaded" with date, or "page changed" if content differs
- **🗑️ Clear Chat**: Reset the conversation while keeping the page upload

### Example Conversations

```
You: "What is the main topic of this article?"
Assistant: "Based on the uploaded page content, this article discusses..."

You: "Summarize the key points in bullet format"  
Assistant: "Here are the key points: • Point 1... • Point 2..."

You: "What does the author say about machine learning?"
Assistant: "According to the article, the author states..."
```

### Keyboard Shortcuts

- **Enter**: Send message
- **Shift + Enter**: New line in message
- **Escape**: Close sidebar

## ⚙️ Settings & Configuration

### Extension Settings Panel

Click the extension icon in your browser toolbar to access:

- **API Key**: Your Pinecone API key (securely stored)
- **Host URL**: Your Pinecone instance URL  
- **Assistant ID**: Your specific assistant ID
- **Test Connection**: Verify your settings work
- **Connection Status**: Real-time status indicator

### Status Indicators

- 🟢 **Connected**: Ready to chat
- 🔴 **Disconnected**: Check your credentials
- 🟡 **Unknown**: Testing connection...


## 🏗️ Technical Details

### Architecture

- **Manifest V3**: Modern Chrome extension architecture
- **Content Script**: Injects chat UI and handles page interaction  
- **Background Service Worker**: Manages Pinecone API communications
- **Storage API**: Persists chat history and settings securely
- **Pinecone Assistant**: Provides AI-powered responses with RAG

### Core Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension configuration and permissions |
| `content.js` | Chat UI, page content extraction, user interactions |
| `background.js` | Pinecone API communication, file management |
| `popup.html/js` | Settings interface and connection status |
| `styles.css` | Isolated UI styling (prefixed classes) |

### API Integration

The extension integrates with Pinecone Assistant API:
- **Chat Completions**: Real-time conversations
- **File Management**: Upload/delete/list files for RAG
- **Content Processing**: Automatic text extraction and metadata tagging
- **Change Detection**: Content hashing for smart updates

### Supported Content Types

- ✅ **Articles & Blogs**: News sites, Medium, personal blogs
- ✅ **Documentation**: Technical docs, API references, wikis  
- ✅ **E-commerce**: Product pages, reviews, specifications
- ✅ **Academic**: Research papers, educational content
- ✅ **Forums**: Reddit, Stack Overflow, discussion threads
- ❌ **Dynamic Content**: Single Page Apps may need manual refresh
- ❌ **Restricted Sites**: Some sites block content extraction

### Privacy & Security

- 🔒 **Local Storage**: Credentials stored securely in Chrome extension storage
- 🔐 **HTTPS Only**: All API communications use secure connections  
- 🚫 **No Data Collection**: Your conversations stay between you and Pinecone
- 🛡️ **Content Security**: Only uploads to your private Pinecone assistant
- 🔑 **API Key Safety**: Keys never logged or transmitted to third parties

## 🤝 Contributing

Thank you for your interest in contributing to the Pinecone Web Chat browser extension. This app was build using Claude Code (vibe coded) and future updates will continue to be made through Claude, as opposed to creating PRs. However, you can contribute by submitting feature requests or bug reports. 


---

**Made with 🫶 for the Pinecone Community **

*This extension is not officially associated with Pinecone. It's an open-source tool that integrates with Pinecone's public APIs.*

---

## 🚀 What's Next?

Planned features and improvements:
- [ ] Browse/resume chat history
- [ ] Settings/controls for auto-upload per domain  
- [ ] Dark mode theme support


Have ideas? Open an issue or contribute!
