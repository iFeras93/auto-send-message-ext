// Popup script for the Chrome extension

// Default messages
const defaultMessages = [
  "Hello everyone!",
  "Great stream!",
  "How's everyone doing?",
  "This is awesome!",
  "Keep up the good work!",
  "Amazing content!",
  "Love this stream!",
  "Having a great time here!",
  "This is so cool!",
  "Enjoying the stream!"
];

// Initialize popup
document.addEventListener('DOMContentLoaded', function() {
  loadMessages();
  updateStatus();
  
  // Event listeners
  document.getElementById('sendQuickMessage').addEventListener('click', sendQuickMessage);
  document.getElementById('startAuto').addEventListener('click', startAutoSend);
  document.getElementById('stopAuto').addEventListener('click', stopAutoSend);
  document.getElementById('addMessage').addEventListener('click', addMessage);
  document.getElementById('loadDefaults').addEventListener('click', loadDefaultMessages);
  document.getElementById('clearAll').addEventListener('click', clearAllMessages);
  
  // Enter key for quick message
  document.getElementById('quickMessage').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      sendQuickMessage();
    }
  });
  
  // Enter key for new message
  document.getElementById('newMessage').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addMessage();
    }
  });
});

// Send quick message
function sendQuickMessage() {
  const message = document.getElementById('quickMessage').value.trim();
  if (!message) return;
  
  sendMessageToContent('sendMessage', { message });
  document.getElementById('quickMessage').value = '';
}

// Start auto send
function startAutoSend() {
  const interval = parseInt(document.getElementById('intervalInput').value) * 1000;
  if (interval < 5000) {
    alert('Minimum interval is 5 seconds');
    return;
  }
  
  chrome.storage.local.get(['messages'], function(result) {
    const messages = result.messages || [];
    if (messages.length === 0) {
      alert('Please add some messages first!');
      return;
    }
    
    sendMessageToContent('startAuto', { interval, messages });
    updateStatus();
  });
}

// Stop auto send
function stopAutoSend() {
  sendMessageToContent('stopAuto');
  updateStatus();
}

// Add new message
function addMessage() {
  const message = document.getElementById('newMessage').value.trim();
  if (!message) return;
  
  chrome.storage.local.get(['messages'], function(result) {
    const messages = result.messages || [];
    messages.push(message);
    chrome.storage.local.set({ messages }, function() {
      loadMessages();
      document.getElementById('newMessage').value = '';
    });
  });
}

// Load default messages
function loadDefaultMessages() {
  chrome.storage.local.set({ messages: [...defaultMessages] }, function() {
    loadMessages();
  });
}

// Clear all messages
function clearAllMessages() {
  if (confirm('Are you sure you want to clear all messages?')) {
    chrome.storage.local.set({ messages: [] }, function() {
      loadMessages();
    });
  }
}

// Load messages from storage
function loadMessages() {
  chrome.storage.local.get(['messages'], function(result) {
    const messages = result.messages || [];
    const messageList = document.getElementById('messageList');
    messageList.innerHTML = '';
    
    if (messages.length === 0) {
      messageList.innerHTML = '<p>No messages added yet. Click "Load Default Messages" to start.</p>';
      return;
    }
    
    messages.forEach((message, index) => {
      const messageItem = document.createElement('div');
      messageItem.className = 'message-item';
      messageItem.innerHTML = `
        <span>${message}</span>
        <button class="remove-btn" onclick="removeMessage(${index})">&times;</button>
      `;
      messageList.appendChild(messageItem);
    });
  });
}

// Remove message
function removeMessage(index) {
  chrome.storage.local.get(['messages'], function(result) {
    const messages = result.messages || [];
    messages.splice(index, 1);
    chrome.storage.local.set({ messages }, function() {
      loadMessages();
    });
  });
}

// Update status
function updateStatus() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0] && tabs[0].url && tabs[0].url.includes('kick.com')) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'getStatus'}, function(response) {
        if (response) {
          const statusElement = document.getElementById('status');
          if (response.running) {
            statusElement.textContent = `Running (${response.interval/1000}s interval)`;
            statusElement.className = 'status running';
          } else {
            statusElement.textContent = 'Stopped';
            statusElement.className = 'status stopped';
          }
        }
      });
    } else {
      const statusElement = document.getElementById('status');
      statusElement.textContent = 'Please open a Kick.com stream';
      statusElement.className = 'status stopped';
    }
  });
}

// Send message to content script
function sendMessageToContent(action, data = {}) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0] && tabs[0].url && tabs[0].url.includes('kick.com')) {
      chrome.tabs.sendMessage(tabs[0].id, {action, ...data});
    } else {
      alert('Please open a Kick.com stream page first!');
    }
  });
}

// Make removeMessage available globally
window.removeMessage = removeMessage;