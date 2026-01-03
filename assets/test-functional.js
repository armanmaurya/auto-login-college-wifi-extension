// Externalized script for test-functional.html to comply with strict CSP (no inline JS)
// Provides test harness UI behavior without inline handlers

// Global log collector
window.testLogs = [];

function addLog(message) {
  const timestamp = new Date().toLocaleTimeString();
  const logMessage = `[${timestamp}] ${message}`;
  window.testLogs.push(logMessage);

  const logsDiv = document.getElementById('logs');
  if (logsDiv) {
    logsDiv.innerHTML = '<strong>🔍 Real-time Logs:</strong><br>' +
      window.testLogs.slice(-20).join('<br>');
    logsDiv.scrollTop = logsDiv.scrollHeight;
  }
}

function updateResults(content) {
  const el = document.getElementById('results');
  if (!el) return;
  el.innerHTML = '<h3>📊 Test Results:</h3>' + content;
}

// Test functions
async function testCredentials() {
  addLog('🔑 Testing stored credentials...');
  updateResults(`
      <div style="background: #fff3cd; padding: 15px; border-radius: 4px;">
          <h4>ℹ️ Credentials Test Not Available</h4>
          <p><strong>Reason:</strong> Test page cannot access extension storage directly</p>
          <p><strong>How to check:</strong> Click the extension icon in Chrome toolbar and verify your username/password are saved there</p>
          <p><strong>Alternative:</strong> Open Chrome DevTools → Application tab → Storage → Extensions → Check if credentials are stored</p>
      </div>
  `);
  addLog('ℹ️ Credentials must be checked via extension popup');
}

async function testConnectivity() {
  addLog('🌐 Testing internet connectivity...');
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 8000);

    const startTime = Date.now();
    await fetch('https://clients3.google.com/generate_204', {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-cache',
      signal: controller.signal
    });
    const endTime = Date.now();

    const result = `
          <div style="background: #e8f5e8; padding: 15px; border-radius: 4px;">
              <h4>✅ Internet Connection OK</h4>
              <p><strong>Response Time:</strong> ${endTime - startTime}ms</p>
              <p><strong>Endpoint:</strong> Google connectivity check</p>
              <p><strong>Status:</strong> Extension should be able to detect WiFi issues</p>
          </div>
      `;
    updateResults(result);
    addLog(`✅ Internet connectivity confirmed (${endTime - startTime}ms)`);
  } catch (error) {
    const result = `
          <div style="background: #ffeaea; padding: 15px; border-radius: 4px;">
              <h4>❌ No Internet Connection</h4>
              <p><strong>Error:</strong> ${error.name}</p>
              <p><strong>Details:</strong> ${error.message}</p>
              <p><strong>Note:</strong> This simulates what the extension detects</p>
          </div>
      `;
    updateResults(result);
    addLog(`❌ Internet connectivity failed: ${error.name}`);
  }
}

async function checkStatus() {
  addLog('📊 Checking if extension is monitoring this page...');

  // Direct check first
  addLog('🔍 Direct check: typeof window.wifiMonitor = ' + typeof window.wifiMonitor);

  if (window.wifiMonitor) {
    addLog('🎯 Found window.wifiMonitor object!');
    console.log('Extension object:', window.wifiMonitor);
  } else {
    addLog('❌ window.wifiMonitor is undefined');
  }

  // Wait a moment for extension to load if needed
  let retries = 5;
  let monitor = null;

  for (let i = 0; i < retries; i++) {
    addLog(`⏳ Check attempt ${i + 1}/${retries}...`);

    if (typeof window.wifiMonitor !== 'undefined' && window.wifiMonitor !== null) {
      monitor = window.wifiMonitor;
      addLog(`✅ Extension found on attempt ${i + 1}!`);
      break;
    }

    if (i < retries - 1) {
      addLog('⏳ Extension not ready yet, waiting 2 seconds...');
      // eslint-disable-next-line no-await-in-loop
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Check if extension injected the WiFi monitor
  if (monitor && typeof monitor === 'object') {
    const result = `
          <div style="background: #e8f5e8; padding: 15px; border-radius: 4px;">
              <h4>✅ Extension is Active on This Page!</h4>
              <p><strong>Monitor Active:</strong> ${monitor.isActive ? '✅ Yes' : '❌ No'}</p>
              <p><strong>Last Check:</strong> ${monitor.lastCheck ? monitor.lastCheck.toLocaleTimeString() : 'Not yet'}</p>
              <p><strong>Status:</strong> ${monitor.status}</p>
              <p><strong>Failures:</strong> ${monitor.failures}</p>
              <p><strong>Monitoring:</strong> Extension is watching this page for WiFi disconnections</p>
          </div>
      `;
    updateResults(result);
    addLog(`✅ Extension monitor detected - Status: ${monitor.status}`);
  } else {
    const result = `
          <div style="background: #fff3cd; padding: 15px; border-radius: 4px;">
              <h4>⚠️ Extension Monitor Not Detected</h4>
              <p><strong>Possible reasons:</strong></p>
              <ul>
                  <li>Extension not loaded or enabled</li>
                  <li>Extension didn't inject into this page yet</li>
                  <li>Page loaded before extension was ready</li>
              </ul>
              <p><strong>Try:</strong> Refresh this page and check again in 5 seconds</p>
          </div>
      `;
    updateResults(result);
    addLog('⚠️ Extension monitor not found - extension may not be active');
  }
}

async function triggerLogin() {
  addLog('🚨 Testing extension communication...');
  updateResults(`
      <div style="background: #fff3cd; padding: 15px; border-radius: 4px;">
          <h4>ℹ️ Manual Login Trigger Not Available</h4>
          <p><strong>Reason:</strong> Test page cannot directly communicate with extension background script</p>
          <p><strong>How extension works:</strong></p>
          <ol>
              <li>Extension monitors connectivity every 15 seconds</li>
              <li>When WiFi disconnects, extension detects it automatically</li>
              <li>Background login tab opens to http://192.168.1.254:8090/</li>
              <li>Auto-fill and submit happens</li>
              <li>Login tab closes automatically</li>
          </ol>
          <p><strong>To test:</strong> Disconnect your WiFi and wait 30 seconds - login should happen automatically</p>
      </div>
  `);
  addLog('ℹ️ Manual trigger not available - use real WiFi disconnect to test');
}

function clearLogs() {
  window.testLogs = [];
  const logs = document.getElementById('logs');
  if (logs) logs.innerHTML = '<strong>🔍 Real-time Logs:</strong><br>Logs cleared...';
  addLog('🧹 Logs cleared');
}

function addRefreshHelper() {
  const helpDiv = document.createElement('div');
  helpDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #ff9800; color: white; padding: 10px; border-radius: 4px; z-index: 1000; max-width: 300px;';

  const title = document.createElement('strong');
  title.textContent = '🔄 Extension Not Detected';
  helpDiv.appendChild(title);
  helpDiv.appendChild(document.createElement('br'));

  const small = document.createElement('small');
  small.textContent = 'If you just loaded the extension, try:';
  helpDiv.appendChild(small);
  helpDiv.appendChild(document.createElement('br'));

  const refreshBtn = document.createElement('button');
  refreshBtn.textContent = 'Refresh Page';
  refreshBtn.style.cssText = 'margin: 5px; padding: 5px 10px; background: white; color: #ff9800; border: none; border-radius: 3px; cursor: pointer;';
  refreshBtn.addEventListener('click', () => location.reload());

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.cssText = 'margin: 5px; padding: 5px 10px; background: #d32f2f; color: white; border: none; border-radius: 3px; cursor: pointer;';
  closeBtn.addEventListener('click', () => helpDiv.remove());

  helpDiv.appendChild(refreshBtn);
  helpDiv.appendChild(closeBtn);

  document.body.appendChild(helpDiv);

  setTimeout(() => {
    if (typeof window.wifiMonitor === 'undefined') {
      helpDiv.style.background = '#d32f2f';
      helpDiv.innerHTML = '';

      const title2 = document.createElement('strong');
      title2.textContent = '❌ Extension Issue';
      helpDiv.appendChild(title2);
      helpDiv.appendChild(document.createElement('br'));

      const steps = document.createElement('small');
      steps.innerHTML = 'Steps to fix:<br>1. Check chrome://extensions/<br>2. Make sure extension is enabled<br>3. Try reloading the extension<br>4. Refresh this page';
      helpDiv.appendChild(steps);
      helpDiv.appendChild(document.createElement('br'));

      const close2 = document.createElement('button');
      close2.textContent = 'Close';
      close2.style.cssText = 'margin: 5px; padding: 5px 10px; background: white; color: #d32f2f; border: none; border-radius: 3px; cursor: pointer;';
      close2.addEventListener('click', () => helpDiv.remove());
      helpDiv.appendChild(close2);
    }
  }, 10000);
}

function wireUIActions() {
  document.querySelectorAll('[data-action]').forEach(button => {
    button.addEventListener('click', (e) => {
      const action = e.currentTarget.getAttribute('data-action');
      switch (action) {
        case 'testCredentials':
          testCredentials();
          break;
        case 'testConnectivity':
          testConnectivity();
          break;
        case 'checkStatus':
          checkStatus();
          break;
        case 'triggerLogin':
          triggerLogin();
          break;
        case 'clearLogs':
          clearLogs();
          break;
        case 'debugCheck':
          console.log('window.wifiMonitor:', window.wifiMonitor);
          alert('Check console for window.wifiMonitor object');
          break;
        default:
          break;
      }
    });
  });
}

// Init
(function init() {
  addLog('🚀 Test page script loaded successfully');

  document.addEventListener('DOMContentLoaded', () => {
    addLog('📄 Test page loaded and ready');
    wireUIActions();

    // Monitor for extension activity
    let extensionCheckCount = 0;
    setInterval(() => {
      extensionCheckCount++;
      if (typeof window.wifiMonitor !== 'undefined') {
        if (extensionCheckCount === 1) addLog('🎯 WiFi monitor detected on page');
      } else if (extensionCheckCount === 1) {
        addLog('⚠️ Extension monitor not found - may need refresh');
      }
    }, 2000);

    // Check for extension after page loads
    setTimeout(() => {
      if (typeof window.wifiMonitor === 'undefined') {
        addRefreshHelper();
      }
    }, 3000);
  });
})();
