(function() {
  "use strict";

  // Check if we're embedded in an iframe
  var isEmbedded = function() {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  };

  // Check URL params for embedded mode
  var urlParams = new URLSearchParams(window.location.search);
  var embeddedMode = urlParams.get('embedded') === 'true' || isEmbedded();

  // Token wait mechanism for embedded mode
  var tokenReceived = !embeddedMode; // In standalone mode, don't wait
  var tokenWaitTimeout = 5000; // Max wait time for token (5 seconds)
  var tokenWaitCallbacks = [];

  function notifyTokenReceived() {
    tokenReceived = true;
    var callbacks = tokenWaitCallbacks.slice();
    tokenWaitCallbacks = [];
    callbacks.forEach(function(cb) { cb(); });
  }

  function waitForToken() {
    return new Promise(function(resolve) {
      if (tokenReceived || getTokenSync()) {
        resolve();
        return;
      }

      var resolved = false;
      var callback = function() {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };

      tokenWaitCallbacks.push(callback);

      // Timeout fallback - don't wait forever
      setTimeout(function() {
        if (!resolved) {
          resolved = true;
          console.warn("[D2E AuthHelper] Token wait timeout, proceeding without token");
          resolve();
        }
      }, tokenWaitTimeout);
    });
  }

  // Synchronous token check (for immediate availability)
  function getTokenSync() {
    return localStorage.getItem("bearerToken") ||
           localStorage.getItem("bearer_token") ||
           localStorage.getItem("token") ||
           sessionStorage.getItem("bearerToken") ||
           null;
  }

  var getToken = function() {
    // First check our own localStorage
    var token = getTokenSync();

    // If embedded and no token, try to get from parent window (same origin)
    if (!token && embeddedMode) {
      try {
        if (window.parent && window.parent !== window && window.parent.localStorage) {
          token = window.parent.localStorage.getItem("bearerToken") ||
                  window.parent.localStorage.getItem("bearer_token") ||
                  window.parent.localStorage.getItem("token");
          if (token) {
            // Cache it locally for future requests
            localStorage.setItem("bearerToken", token);
            console.log("[D2E AuthHelper] Got token from parent localStorage");
            notifyTokenReceived();
          }
        }
      } catch (e) {
        // Cross-origin or other error, ignore
      }
    }

    return token || null;
  };

  var shouldAddAuth = function(url) {
    return url && (
      url.includes("/system-portal/") ||
      url.includes("/d2e/") ||
      url.includes("/resources/") ||
      url.includes("/jobplugins/") ||
      url.includes("/jupyter/") ||
      url.includes("/prefect/") ||
      url.includes("/starboard-notebook-base/") ||
      url.includes("/WebAPI/") ||
      url.includes("/d2e-webapi/")
    );
  };

  // Expose auth service globally
  window.__d2eAuthService = {
    getToken: getToken,
    isAuthenticated: function() {
      return !!localStorage.getItem("bearerToken");
    },
    isEmbedded: function() {
      return embeddedMode;
    }
  };
  window.getToken = getToken;

  // Portal Bridge - Listen for auth messages from parent (portal wrapper)
  if (embeddedMode) {
    console.log("[D2E AuthHelper] Running in embedded mode, listening for portal messages");

    window.addEventListener("message", function(event) {
      // Verify origin (same origin)
      if (event.origin !== window.location.origin) {
        return;
      }

      if (!event.data) return;

      // Handle existing portal SETUP_ATLAS message format
      if (event.data.type === "SETUP_ATLAS") {
        console.log("[D2E AuthHelper] Received SETUP_ATLAS message");
        if (event.data.token) {
          localStorage.setItem("bearerToken", event.data.token);
          console.log("[D2E AuthHelper] Token stored from SETUP_ATLAS");

          // Notify waiting requests that token is available
          notifyTokenReceived();

          if (event.data.username) {
            localStorage.setItem("portalUsername", event.data.username);
          }
          if (event.data.datasetId) {
            localStorage.setItem("selectedVocabulary", event.data.datasetId);
          }

          // Dispatch synthetic storage event for Atlas3 auth store
          try {
            var storageEvent = new StorageEvent("storage", {
              key: "bearerToken",
              oldValue: null,
              newValue: event.data.token,
              storageArea: localStorage,
              url: window.location.href
            });
            window.dispatchEvent(storageEvent);
          } catch (e) {
            console.warn("[D2E AuthHelper] Failed to dispatch storage event:", e);
          }

          window.dispatchEvent(new CustomEvent("portal-auth-update", {
            detail: { token: event.data.token, username: event.data.username }
          }));
        }
        return;
      }

      // Check for portal bridge messages (new format)
      if (event.data.source !== "portal-bridge") {
        return;
      }

      var message = event.data;
      console.log("[D2E AuthHelper] Received portal message:", message.type);

      switch (message.type) {
        case "auth":
          // Store the token from portal
          if (message.payload && message.payload.token) {
            var oldToken = localStorage.getItem("bearerToken");
            localStorage.setItem("bearerToken", message.payload.token);
            console.log("[D2E AuthHelper] Token received from portal");

            // Store username if provided
            if (message.payload.username) {
              localStorage.setItem("portalUsername", message.payload.username);
            }
            if (message.payload.idpUserId) {
              localStorage.setItem("portalIdpUserId", message.payload.idpUserId);
            }

            // Dispatch synthetic storage event for Atlas3 auth store
            // (storage events don't fire in the same window, only cross-tab)
            try {
              var storageEvent = new StorageEvent("storage", {
                key: "bearerToken",
                oldValue: oldToken,
                newValue: message.payload.token,
                storageArea: localStorage,
                url: window.location.href
              });
              window.dispatchEvent(storageEvent);
              console.log("[D2E AuthHelper] Dispatched storage event for auth sync");
            } catch (e) {
              console.warn("[D2E AuthHelper] Failed to dispatch storage event:", e);
            }

            // Dispatch event so Atlas3 can react
            window.dispatchEvent(new CustomEvent("portal-auth-update", {
              detail: message.payload
            }));
          }
          break;

        case "dataset":
          // Dataset change from portal
          if (message.payload && message.payload.datasetId) {
            localStorage.setItem("selectedVocabulary", message.payload.datasetId);
            window.dispatchEvent(new CustomEvent("alp-dataset-change", {
              detail: message.payload
            }));
          }
          break;

        case "locale":
          // Locale change from portal
          if (message.payload && message.payload.locale) {
            document.documentElement.lang = message.payload.locale;
            window.dispatchEvent(new CustomEvent("locale-change", {
              detail: message.payload
            }));
          }
          break;

        case "route":
          // Route change from portal
          if (message.payload && message.payload.path) {
            // Navigate within Atlas3
            var newPath = "/atlas" + message.payload.path;
            if (window.location.pathname !== newPath) {
              window.history.pushState(null, "", newPath);
              window.dispatchEvent(new PopStateEvent("popstate"));
            }
          }
          break;
      }
    });

    // Request auth from parent immediately (don't wait)
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        source: "atlas-bridge",
        type: "request-auth",
        payload: {}
      }, window.location.origin);
      console.log("[D2E AuthHelper] Requested auth from portal");
    }

    // Also signal ready after a short delay
    setTimeout(function() {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          source: "atlas-bridge",
          type: "ready",
          payload: {}
        }, window.location.origin);
        console.log("[D2E AuthHelper] Sent ready signal to portal");
      }
    }, 100);
  }

  // XHR interceptor
  var origOpen = XMLHttpRequest.prototype.open;
  var origSend = XMLHttpRequest.prototype.send;
  var origSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.open = function(method, url) {
    // In embedded mode, redirect plugins.json to portal version
    if (embeddedMode && url && url.includes("/config/plugins.json")) {
      url = url.replace("/config/plugins.json", "/config/plugins.portal.json");
      console.log("[D2E AuthHelper] XHR: Redirecting to portal plugins config");
    }
    this._url = url;
    this._hasAuthHeader = false;
    return origOpen.call(this, method, url);
  };

  XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
    if (name.toLowerCase() === "authorization") {
      this._hasAuthHeader = true;
    }
    return origSetRequestHeader.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function() {
    var token = getToken();
    if (token && shouldAddAuth(this._url) && !this._hasAuthHeader) {
      origSetRequestHeader.call(this, "Authorization", "Bearer " + token);
    }
    return origSend.apply(this, arguments);
  };

  // Fetch interceptor
  var origFetch = window.fetch;
  window.fetch = async function(input, init) {
    var url = typeof input === "string" ? input : input.url;

    // In embedded mode, redirect plugins.json to portal version
    if (embeddedMode && url && url.includes("/config/plugins.json")) {
      url = url.replace("/config/plugins.json", "/config/plugins.portal.json");
      if (typeof input === "string") {
        input = url;
      } else {
        input = new Request(url, input);
      }
      console.log("[D2E AuthHelper] Redirecting to portal plugins config");
    }

    // In embedded mode, wait for token if this URL needs auth
    if (embeddedMode && shouldAddAuth(url) && !getTokenSync()) {
      console.log("[D2E AuthHelper] Waiting for token before:", url);
      await waitForToken();
    }

    var token = getToken();
    if (token && shouldAddAuth(url)) {
      init = init || {};
      init.headers = new Headers(init.headers || {});
      if (!init.headers.has("Authorization")) {
        init.headers.set("Authorization", "Bearer " + token);
      }
    }
    return origFetch.call(this, input, init);
  };

  console.log("[D2E AuthHelper] Auth service with XHR+fetch interceptor installed" +
              (embeddedMode ? " (embedded mode)" : ""));

  // In standalone mode, trigger auth state rehydration if token exists
  // Atlas3 only loads user info on specific paths (like /openid/callback)
  // We dispatch a synthetic storage event to trigger its cross-tab sync handler
  if (!embeddedMode) {
    var existingToken = getTokenSync();
    if (existingToken) {
      console.log("[D2E AuthHelper] Standalone mode: found existing token, triggering auth rehydration");
      // Delay slightly to ensure Atlas3's auth store is initialized
      setTimeout(function() {
        try {
          var storageEvent = new StorageEvent("storage", {
            key: "bearerToken",
            oldValue: null,
            newValue: existingToken,
            storageArea: localStorage,
            url: window.location.href
          });
          window.dispatchEvent(storageEvent);
          console.log("[D2E AuthHelper] Dispatched storage event for auth rehydration");
        } catch (e) {
          console.warn("[D2E AuthHelper] Failed to dispatch storage event:", e);
        }
      }, 500);
    }
  }
})();
