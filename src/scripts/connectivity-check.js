// WiFi Monitor - Zero polling, 100% passive event-driven detection
// Version 4.0.0 (no scheduled checks, no tabs, pure invisible monitoring)
(function () {
  'use strict';

  // Skip captive portal and extension pages
  const host = location.hostname || '';
  const proto = location.protocol || '';
  if (host.includes('192.168.1.254') || host.startsWith('chrome-extension') || proto.startsWith('chrome')) {
    return;
  }

  // Optional lightweight debug: enable with localStorage.setItem('wifiMonitorDebug','1')
  const debug = localStorage.getItem('wifiMonitorDebug') === '1';
  const log = (...a) => { if (debug) console.log('[WiFi-Monitor]', ...a); };

  // Minimal status object for test page compatibility
  window.wifiMonitor = { isActive: true, status: 'starting', failures: 0, lastCheck: null };

  // One-shot runtime recovery: if extension was reloaded, old content scripts lose runtime
  const RELOAD_KEY = '__wifiExtReloadOnce';
  function ensureRuntimeOrRecover() {
    if (chrome && chrome.runtime && chrome.runtime.id) return true;
    // Avoid loops: reload this page only once per tab/session
    if (!sessionStorage.getItem(RELOAD_KEY)) {
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
      updateStatus('extension-invalidated');
      // Small jitter to prevent synchronized reloads across many tabs
      setTimeout(() => { try { location.reload(); } catch (_) {} }, 400 + Math.random() * 400);
    } else {
      updateStatus('extension-invalidated');
    }
    return false;
  }

  // Debounced status update to background for badge
  let statusTimer;
  function updateStatus(status) {
    window.wifiMonitor.status = status;
    if (!chrome?.runtime?.id) return; // avoid invalid context spam
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      try { chrome.runtime.sendMessage({ action: 'statusUpdate', status }); } catch (_) {}
    }, 100);
  }

  // State (100% passive - no polling intervals)
  let lastResultOk = true;
  let failureStreak = 0;
  let loginInProgress = false;
  let lastLoginAttemptTs = 0;
  const MIN_LOGIN_INTERVAL = 10000; // Don't retry login faster than 10s

  // Passive fetch monitoring (learns from real user traffic, no active checks)
  if (!window.__wifiMonitorFetchPatched) {
    const origFetch = window.fetch;
    window.fetch = async function (...args) {
      try {
        const res = await origFetch.apply(this, args);
        // Success on real traffic = connectivity OK
        if (res.ok || res.status < 500) {
          failureStreak = 0;
          lastResultOk = true;
          window.wifiMonitor.failures = 0;
          updateStatus('connected');
        }
        return res;
      } catch (err) {
        // Network failure on real traffic = potential sign-out
        const isNetworkError = err.name === 'TypeError' || err.message.includes('Failed to fetch');
        if (isNetworkError) {
          failureStreak++;
          lastResultOk = false;
          window.wifiMonitor.failures = failureStreak;
          updateStatus('disconnected');
          // After 2 failures from real traffic, try invisible login
          if (failureStreak >= 2) attemptLogin();
        }
        throw err;
      }
    };
    window.__wifiMonitorFetchPatched = true;
  }

  // No active connectivity tests - rely 100% on passive signals

  // No intervals - pure event-driven

  async function attemptLogin() {
    // Prevent rapid login attempts
    const now = Date.now();
    if (loginInProgress || now - lastLoginAttemptTs < MIN_LOGIN_INTERVAL) return;
    
    loginInProgress = true;
    lastLoginAttemptTs = now;
    updateStatus('logging-in');

    try {
      // If extension context is invalid, auto-recover once
      if (!ensureRuntimeOrRecover()) {
        setTimeout(() => { loginInProgress = false; }, 5000);
        return;
      }

      // Single attempt to background worker (it has retry logic)
      const resp = await chrome.runtime.sendMessage({
        action: 'backgroundLogin',
        currentUrl: location.href,
        trigger: 'passive-detection'
      });
      
      if (resp && resp.success) {
        log('Login tab opened invisibly');
        updateStatus('login-requested');
      } else {
        log('Login request failed:', resp?.message);
        updateStatus('login-request-failed');
      }
    } catch (err) {
      log('Login error:', err.message);
      updateStatus('login-request-failed');
    } finally {
      setTimeout(() => { loginInProgress = false; }, 5000);
    }
  }

  // Browser network events (instant, zero-cost detection)
  window.addEventListener('offline', () => {
    log('Browser offline event');
    lastResultOk = false;
    failureStreak = 3; // High confidence from browser
    updateStatus('disconnected');
    attemptLogin(); // Immediate invisible login attempt
  });
  
  window.addEventListener('online', () => {
    log('Browser online event');
    lastResultOk = true;
    failureStreak = 0;
    updateStatus('connected');
  });

  async function init() {
    if (document.readyState === 'loading') {
      await new Promise((r) => document.addEventListener('DOMContentLoaded', r, { once: true }));
    }
    // Clear one-shot reload sentinel if stale (>60s)
    const ts = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (ts && Date.now() - ts > 60000) sessionStorage.removeItem(RELOAD_KEY);
    
    updateStatus('monitoring');
    log('Passive monitoring active - zero polling, event-driven only');
  }

  init();
})();
