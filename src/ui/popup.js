// Manual Connect Button
const connectBtn = document.getElementById("connectBtn");
const connectionStatus = document.getElementById("connectionStatus");
const statusText = document.getElementById("statusText");

// Listen for login success messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'loginSuccess') {
    updateStatus("connected", "Login successful!");
    if (connectBtn.disabled) {
      connectBtn.className = "success";
      connectBtn.textContent = "Connected";
      setTimeout(() => {
        connectBtn.disabled = false;
        connectBtn.className = "";
        connectBtn.textContent = "Connect Now";
        checkConnectionStatus();
      }, 2000);
    }
  }
});

connectBtn.addEventListener("click", async () => {
  // Check if credentials are saved
  const settings = await chrome.storage.local.get({ username: "", password: "" });
  
  if (!settings.username || !settings.password) {
    updateStatus("error", "Please save credentials first");
    return;
  }
  
  // Disable button and show connecting state
  connectBtn.disabled = true;
  connectBtn.className = "connecting";
  connectBtn.textContent = "Connecting...";
  updateStatus("connecting", "Attempting login...");
  
  try {
    // Trigger background login (uses background tab that auto-closes)
    const response = await chrome.runtime.sendMessage({
      action: 'backgroundLogin',
      currentUrl: 'popup-manual-trigger',
      priority: 'instant',
      manual: true
    });
    
    if (response && response.success) {
      connectBtn.className = "success";
      connectBtn.textContent = "Logging In";
      updateStatus("connecting", "Login in progress...");
      
      // Wait for login to complete, then check status
      setTimeout(async () => {
        await checkConnectionStatus();
        connectBtn.disabled = false;
        connectBtn.className = "";
        connectBtn.textContent = "Connect Now";
      }, 4000);
    } else {
      connectBtn.className = "error";
      connectBtn.textContent = "Failed";
      updateStatus("error", response?.message || "Connection failed");
      
      setTimeout(() => {
        connectBtn.disabled = false;
        connectBtn.className = "";
        connectBtn.textContent = "Connect Now";
      }, 2000);
    }
  } catch (error) {
    connectBtn.className = "error";
    connectBtn.textContent = "Error";
    updateStatus("error", "Error: " + error.message);
    
    setTimeout(() => {
      connectBtn.disabled = false;
      connectBtn.className = "";
      connectBtn.textContent = "Connect Now";
    }, 2000);
  }
});

function updateStatus(state, message) {
  connectionStatus.className = "connection-status " + state;
  statusText.textContent = message;
}

// Check current connection status
async function checkConnectionStatus() {
  // Don't check if button is in connecting state
  if (connectBtn.disabled) {
    return;
  }
  
  try {
    // Try to fetch a known endpoint to check connectivity
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache',
      signal: controller.signal
    });
    
    updateStatus("connected", "Connected to internet");
  } catch (error) {
    // Only show disconnected if button is not in use
    if (!connectBtn.disabled) {
      updateStatus("disconnected", "No internet connection");
    }
  }
}

// Save Settings Button
document.getElementById("save").addEventListener("click", async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const autoSubmit = document.getElementById("autoSubmit").checked;

  await chrome.storage.local.set({ username, password, autoSubmit });

  document.getElementById("status").textContent = "Saved!";
  setTimeout(() => {
    document.getElementById("status").textContent = "";
  }, 2000);
});

// Load saved values when popup opens
(async () => {
  const settings = await chrome.storage.local.get({ username: "", password: "", autoSubmit: true });
  document.getElementById("username").value = settings.username;
  document.getElementById("password").value = settings.password;
  document.getElementById("autoSubmit").checked = settings.autoSubmit;
  
  // Check initial connection status
  checkConnectionStatus();
})();
