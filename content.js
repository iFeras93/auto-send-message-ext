// Content script for Kick.com with Lexical Editor Support

// Variables
let messageInterval = null;
let currentMessages = [];
let currentIntervalMs = 30000; // 30 seconds

// Initialize
console.log('Kick Chat Auto Sender! By iFeras93');

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  switch(request.action) {
    case 'sendMessage':
      sendKickMessage(request.message);
      break;
    case 'startAuto':
      startRandomMessages(request.interval, request.messages);
      break;
    case 'stopAuto':
      stopRandomMessages();
      break;
    case 'getStatus':
      sendResponse({
        running: messageInterval !== null,
        interval: currentIntervalMs
      });
      break;
  }
});

// Enhanced function to detect and handle Lexical editor
function findLexicalEditor() {
  // Look for Lexical editor root elements
  const lexicalRoot = document.querySelector('[data-lexical-editor="true"]') ||
                     document.querySelector('.lexical-editor') ||
                     document.querySelector('[contenteditable="true"][data-lexical-editor]') ||
                     document.querySelector('[role="textbox"][data-lexical-editor]');
  
  if (lexicalRoot) {
    return { type: 'lexical', element: lexicalRoot };
  }
  
  // Look for contenteditable elements that might be Lexical
  const contentEditables = document.querySelectorAll('[contenteditable="true"]');
  for (const el of contentEditables) {
    // Check if element has Lexical-specific attributes or classes
    if (el.hasAttribute('data-lexical-editor') || 
        el.classList.contains('lexical-editor') ||
        el.querySelector('[data-lexical-text="true"]') ||
        el.__lexicalEditor) {
      return { type: 'lexical', element: el };
    }
  }
  
  return null;
}

// Function to insert text into Lexical editor
function insertTextIntoLexical(lexicalElement, text) {
  try {
    // Method 1: Try to access Lexical editor instance directly
    const editorInstance = lexicalElement.__lexicalEditor;
    if (editorInstance) {
      editorInstance.update(() => {
        const { $getRoot, $createTextNode, $createParagraphNode } = window.lexical;
        if ($getRoot && $createTextNode) {
          const root = $getRoot();
          root.clear();
          const paragraph = $createParagraphNode();
          paragraph.append($createTextNode(text));
          root.append(paragraph);
          return true;
        }
      });
      return true;
    }
    
    // Method 2: Try using execCommand if available
    lexicalElement.focus();
    
    // Clear existing content
    if (document.execCommand) {
      document.execCommand('selectAll', false, null);
      document.execCommand('delete', false, null);
      document.execCommand('insertText', false, text);
      return true;
    }
    
    // Method 3: Direct DOM manipulation as fallback
    lexicalElement.focus();
    
    // Find or create text node
    let textNode = lexicalElement.querySelector('[data-lexical-text="true"]');
    if (!textNode) {
      // Create Lexical-compatible structure
      lexicalElement.innerHTML = `<p data-lexical-text="true">${text}</p>`;
    } else {
      textNode.textContent = text;
    }
    
    // Trigger input events
    lexicalElement.dispatchEvent(new Event('input', { bubbles: true }));
    lexicalElement.dispatchEvent(new Event('change', { bubbles: true }));
    
    return true;
    
  } catch (error) {
    console.error('Error inserting text into Lexical:', error);
    return false;
  }
}

// Enhanced send message function with Lexical support
function sendKickMessage(message) {
  // First, try to find Lexical editor
  const lexicalEditor = findLexicalEditor();
  
  if (lexicalEditor) {
    // console.log('Lexical editor detected, using enhanced insertion method');
    
    // Insert text into Lexical editor
    const success = insertTextIntoLexical(lexicalEditor.element, message);
    
    if (success) {
      // Try to find and click send button
      const sendButton = findSendButton(lexicalEditor.element);
      if (sendButton) {
        setTimeout(() => {
          sendButton.click();
          console.log('Message sent via Lexical editor:', message);
        }, 550); // Small delay to ensure text is processed
        return true;
      } else {
        // Try Enter key on Lexical editor
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true
        });
        lexicalEditor.element.dispatchEvent(enterEvent);
        console.log('Message sent via Lexical editor (Enter key):', message);
        return true;
      }
    }
  }
  
  // Fallback to original method for non-Lexical inputs
  return sendKickMessageLegacy(message);
}

// Original send message function (renamed as fallback)
function sendKickMessageLegacy(message) {
  // Try to find the chat input field
  const chatInput = document.querySelector('textarea[placeholder*="chat"]') || 
                   document.querySelector('textarea[placeholder*="message"]') ||
                   document.querySelector('input[placeholder*="chat"]') ||
                   document.querySelector('input[placeholder*="message"]') ||
                   document.querySelector('textarea[data-testid="chat-input"]') ||
                   document.querySelector('input[data-testid="chat-input"]') ||
                   document.querySelector('#chat-input') ||
                   document.querySelector('.chat-input') ||
                   document.querySelector('.editor-paragraph') ||
                   document.querySelector('textarea') ||
                   document.querySelector('input[type="text"]');
  
  if (!chatInput) {
    console.error('Chat input field not found.');
    return false;
  }
  
  // Focus and clear
  chatInput.focus();
  chatInput.value = '';
  
  // Set message
  chatInput.value = message;
  
  // Trigger events
  chatInput.dispatchEvent(new Event('input', { bubbles: true }));
  chatInput.dispatchEvent(new Event('change', { bubbles: true }));
  
  // Try to find send button
  const sendButton = findSendButton(chatInput);
  
  if (sendButton) {
    sendButton.click();
    console.log('Message sent:', message);
    return true;
  } else {
    // Try Enter key
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true
    });
    chatInput.dispatchEvent(enterEvent);
    
    console.log('Message sent via Enter:', message);
    return true;
  }
}

// Enhanced send button finder
function findSendButton(inputElement) {
  const sendButton = document.querySelector('button[type="submit"]') ||
                    document.getElementById("send-message-button") ||
                    document.querySelector('button[aria-label*="send"]') ||
                    document.querySelector('button[data-testid="send-button"]') ||
                    document.querySelector('.send-button') ||
                    document.querySelector('svg[data-lucide="send"]')?.closest('button') ||
                    document.querySelector('button[title*="send"]') ||
                    document.querySelector('button[title*="Send"]') ||
                    inputElement?.closest('form')?.querySelector('button[type="submit"]') ||
                    inputElement?.parentElement?.querySelector('button') ||
                    inputElement?.nextElementSibling;
  
  return sendButton;
}

// Function to wait for Lexical to load
function waitForLexical(callback, maxAttempts = 10) {
  let attempts = 0;
  
  const checkLexical = () => {
    attempts++;
    
    if (window.lexical || findLexicalEditor()) {
      callback();
      return;
    }
    
    if (attempts < maxAttempts) {
      setTimeout(checkLexical, 1000);
    } else {
      console.log('Lexical not detected after maximum attempts, using fallback methods');
      callback();
    }
  };
  
  checkLexical();
}

// Get random message
function getRandomMessage() {
  if (currentMessages.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * currentMessages.length);
  return currentMessages[randomIndex];
}

// Start random messages
function startRandomMessages(intervalMs, messages) {
  if (messageInterval) {
    stopRandomMessages();
  }
  
  currentMessages = messages;
  currentIntervalMs = intervalMs;
  
  console.log(`Starting random messages every ${intervalMs}ms`);
  
  // Wait for Lexical to be ready, then start
  waitForLexical(() => {
    // Send first message immediately
    const firstMessage = getRandomMessage();
    if (firstMessage) {
      sendKickMessage(firstMessage);
    }
    
    // Set up interval
    messageInterval = setInterval(() => {
      const message = getRandomMessage();
      if (message) {
        sendKickMessage(message);
      }
    }, intervalMs);
  });
}

// Stop random messages
function stopRandomMessages() {
  if (messageInterval) {
    clearInterval(messageInterval);
    messageInterval = null;
    console.log('Random messages stopped.');
  }
}

// Clean up when page unloads
window.addEventListener('beforeunload', function() {
  stopRandomMessages();
});

// Observer to detect when Lexical editor is dynamically loaded
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length > 0) {
      // Check if any added nodes contain Lexical editor
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const lexicalEditor = node.querySelector ? 
            (node.querySelector('[data-lexical-editor="true"]') || 
             node.querySelector('[contenteditable="true"]')) : null;
          
          if (lexicalEditor) {
            console.log('Lexical editor detected via mutation observer');
          }
        }
      });
    }
  });
});

// Start observing
observer.observe(document.body, {
  childList: true,
  subtree: true
});