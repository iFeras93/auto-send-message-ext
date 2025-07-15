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
  document.getElementById('startRandomAuto').addEventListener('click', startRandomAutoSend);
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

// Start auto send with random intervals
function startRandomAutoSend() {
  console.log('startRandomAutoSend called');
  
  const minIntervalInput = document.getElementById('minIntervalInput');
  const maxIntervalInput = document.getElementById('maxIntervalInput');
  
  if (!minIntervalInput || !maxIntervalInput) {
    console.error('Random interval inputs not found');
    alert('Random interval inputs not found. Please check the HTML structure.');
    return;
  }
  
  const minInterval = parseInt(minIntervalInput.value) * 1000;
  const maxInterval = parseInt(maxIntervalInput.value) * 1000;
  
  console.log('Min interval:', minInterval, 'Max interval:', maxInterval);
  
  // Validation
  if (minInterval < 5000) {
    alert('Minimum interval must be at least 5 seconds');
    return;
  }
  
  if (maxInterval < minInterval) {
    alert('Maximum interval must be greater than minimum interval');
    return;
  }
  
  if (maxInterval < 5000) {
    alert('Maximum interval must be at least 5 seconds');
    return;
  }

  chrome.storage.local.get(['messages'], function(result) {
    const messages = result.messages || [];
    if (messages.length === 0) {
      alert('Please add some messages first!');
      return;
    }
    
    console.log('Sending startRandomAuto to content script');
    sendMessageToContent('startRandomAuto', { minInterval, maxInterval, messages });
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
        <button class="remove-btn" data-index="${index}">&times;</button>
      `;
      messageList.appendChild(messageItem);
    });
    
    // Add event listeners to remove buttons after they're created
    const removeButtons = messageList.querySelectorAll('.remove-btn');
    removeButtons.forEach(button => {
      button.addEventListener('click', function() {
        const index = parseInt(this.getAttribute('data-index'));
        removeMessage(index);
      });
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
        if (chrome.runtime.lastError) {
          console.log('Error getting status:', chrome.runtime.lastError);
          const statusElement = document.getElementById('status');
          statusElement.textContent = 'Content script not ready';
          statusElement.className = 'status stopped';
          return;
        }
        
        if (response) {
          const statusElement = document.getElementById('status');
          if (response.running) {
            if (response.isRandom) {
              statusElement.textContent = `Running Random Mode (${response.minInterval/1000}s - ${response.maxInterval/1000}s)`;
            } else {
              statusElement.textContent = `Running Fixed Mode (${response.interval/1000}s interval)`;
            }
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

// Update status periodically
setInterval(updateStatus, 2000);


// Make removeMessage available globally
window.removeMessage = removeMessage;