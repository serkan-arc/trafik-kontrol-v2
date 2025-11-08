/**
 * Multi-Domain Traffic Tracking Script
 * Automatically tracks page views for domain-based tracking system
 */
(function() {
  'use strict';
  
  // Get config from script tag or use defaults
  const scriptTag = document.currentScript;
  const API_URL = scriptTag?.getAttribute('data-api-url') || 'http://207.180.204.60:3001';
  const DOMAIN = scriptTag?.getAttribute('data-domain') || window.location.hostname;
  
  console.log('[Traffic Tracker] Initializing for domain:', DOMAIN);
  console.log('[Traffic Tracker] API URL:', API_URL);

  // Generate or retrieve visitor ID
  function getVisitorId() {
    let visitorId = localStorage.getItem('tc_visitor_id');
    if (!visitorId) {
      visitorId = 'VIS-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('tc_visitor_id', visitorId);
    }
    return visitorId;
  }

  // Generate session ID
  function getSessionId() {
    let sessionId = sessionStorage.getItem('tc_session_id');
    if (!sessionId) {
      sessionId = 'SES-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('tc_session_id', sessionId);
    }
    return sessionId;
  }

  // Get location data (if available from IP geolocation services)
  async function getLocationData() {
    try {
      // Try to get location from a free IP geolocation service
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const data = await response.json();
        return {
          country: data.country_name,
          country_code: data.country_code,
          city: data.city,
          ip: data.ip
        };
      }
    } catch (err) {
      console.warn('[Traffic Tracker] Could not get location data:', err);
    }
    return {};
  }

  // Send tracking event
  async function track(eventType, eventData = {}) {
    try {
      const locationData = await getLocationData();
      
      const trackingData = {
        session_id: getSessionId(),
        visitor_id: getVisitorId(),
        event_type: eventType,
        page_url: window.location.href,
        page_title: document.title,
        referrer: document.referrer,
        user_agent: navigator.userAgent,
        ...locationData,
        ...eventData,
        timestamp: new Date().toISOString()
      };

      console.log('[Traffic Tracker] Sending tracking data:', trackingData);

      // Send to API
      const response = await fetch(`${API_URL}/api/track/${DOMAIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trackingData),
        keepalive: true,
      });
      
      if (!response.ok) {
        console.warn('[Traffic Tracker] Tracking failed with status:', response.status);
        const errorData = await response.text();
        console.warn('[Traffic Tracker] Error response:', errorData);
      } else {
        const result = await response.json();
        console.log('[Traffic Tracker] Tracking successful:', result);
      }
    } catch (err) {
      console.error('[Traffic Tracker] Tracking error:', err);
    }
  }

  // Track page view immediately
  track('pageview');

  // Track form submissions
  document.addEventListener('submit', function(e) {
    const form = e.target;
    if (form.tagName === 'FORM') {
      const formData = new FormData(form);
      const data = {};
      for (let [key, value] of formData.entries()) {
        data[key] = value;
      }

      track('form_submit', {
        event_name: form.id || 'unnamed_form',
        form_data: data,
      });
    }
  });

  // Track clicks on important buttons
  document.addEventListener('click', function(e) {
    const target = e.target;
    if (target.tagName === 'BUTTON' || target.tagName === 'A') {
      if (target.getAttribute('data-track') || target.classList.contains('cta')) {
        track('click', {
          element: target.tagName,
          text: target.textContent.trim().substring(0, 50),
          href: target.href || null
        });
      }
    }
  });

  // Expose global tracking function
  window.trackEvent = function(eventType, eventData) {
    track(eventType, eventData);
  };

  console.log('[Traffic Tracker] Initialization complete for domain:', DOMAIN);
})();