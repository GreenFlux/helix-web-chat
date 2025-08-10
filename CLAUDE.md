# Pinecone Web Chat Browser Extension

A Chrome browser extension that enables intelligent chat with web pages using Pinecone Assistant with RAG (Retrieval-Augmented Generation) capabilities.

## Project Overview

This extension provides a chat interface on every web page that allows users to:
- Ask questions about the current page content using a Pinecone Assistant
- Upload page content to the assistant's knowledge base for RAG
- Maintain chat history per domain
- Get intelligent responses powered by Pinecone's assistant technology

## Architecture

- **Chrome Extension (Manifest V3)**: Modern browser extension architecture
- **Pinecone Assistant Integration**: Uses Pinecone SDK to communicate with assistant API
- **RAG Support**: Upload page content to enhance assistant's knowledge
- **Per-domain Chat History**: Maintains conversation context per website

## Key Files

- `content.js`: Injects chat UI, extracts page content, handles user interactions
- `background.js`: Service worker managing Pinecone API communications
- `popup.js/popup.html`: Settings and connection status UI
- `manifest.json`: Extension configuration and permissions

## Configuration

Configure your Pinecone credentials through the extension settings:

1. Click the extension icon in your browser toolbar
2. Enter your Pinecone credentials:
   - **API Key**: Your Pinecone API key (starts with `pcsk_`)
   - **Host URL**: Your Pinecone assistant host URL
   - **Assistant ID**: Your Pinecone assistant identifier
3. Click "Test Connection" to verify your settings
4. Click "Save Settings" to store your configuration

The extension securely stores your credentials in browser storage and uses them for all API communications.

## Features

### Chat Interface
- Resizable sidebar with chat history
- Streaming responses from Pinecone Assistant  
- Markdown formatting support
- Per-domain conversation persistence

### RAG Integration
- Automatic upload of page content to assistant's knowledge base
- Intelligent content change detection and updates
- Automatic text extraction from web pages  
- Progress indication and status tracking
- Metadata tagging with URL, title, timestamp, and content hash

### Connection Management
- Real-time connection status to Pinecone Assistant
- Error handling and user feedback
- Automatic retry mechanisms

## Development Notes

- Uses Pinecone SDK for browser extensions
- Implements streaming chat responses
- Handles file uploads via multipart form data
- Maintains backward compatibility for chat history storage

## Security Considerations

- API credentials stored securely in browser extension storage
- No sensitive data logging
- Secure communication with Pinecone API over HTTPS
- User content processed through Pinecone's secure infrastructure
- Deterministic file IDs for reliable content management