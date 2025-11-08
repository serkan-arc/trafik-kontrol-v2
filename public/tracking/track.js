/**
 * Traffic Control Tracking Script
 * Automatically tracks page views and events
 */
(function() {
  'use strict';
  
  // Get config from script tag
  const scriptTag = document.currentScript;
  const SITE_ID = scriptTag?.getAttribute('data-site-id');
  const API_URL = scriptTag?.getAttribute('data-api-url') || window.location.origin;
  
  if (!SITE_ID) {
    console.warn('[TrafficControl] Missing data-site-id attribute');
    return;
  }

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

  // Parse UTM parameters
  function getUTMParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_term: params.get('utm_term'),
      utm_content: params.get('utm_content'),
    };
  }

  // Detect device type
  function getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }

  // Get browser name
  function getBrowserName() {
    const ua = navigator.userAgent;
    if (ua.indexOf('Firefox') > -1) return 'Firefox';
    if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) return 'Opera';
    if (ua.indexOf('Trident') > -1) return 'IE';
    if (ua.indexOf('Edge') > -1) return 'Edge';
    if (ua.indexOf('Chrome') > -1) return 'Chrome';
    if (ua.indexOf('Safari') > -1) return 'Safari';
    return 'Unknown';
  }

  // Get OS name
  function getOSName() {
    const ua = navigator.userAgent;
    if (ua.indexOf('Windows') > -1) return 'Windows';
    if (ua.indexOf('Mac') > -1) return 'MacOS';
    if (ua.indexOf('Linux') > -1) return 'Linux';
    if (ua.indexOf('Android') > -1) return 'Android';
    if (ua.indexOf('iOS') > -1) return 'iOS';
    return 'Unknown';
  }

  // Send tracking event
  function track(eventType, eventData = {}) {
    const trackingData = {
      session_id: getSessionId(),
      visitor_id: getVisitorId(),
      event_type: eventType,
      page_url: window.location.href,
      page_title: document.title,
      referrer: document.referrer,
      ...getUTMParams(),
      user_agent: navigator.userAgent,
      device_type: getDeviceType(),
      browser: getBrowserName(),
      os: getOSName(),
      ...eventData,
    };

    // Send to API
    fetch(`${API_URL}/api/sites/${SITE_ID}/tracking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(trackingData),
      keepalive: true,
    }).catch(err => {
      console.warn('[TrafficControl] Tracking failed:', err);
    });
  }

  // Track page view
  track('pageview');

  // Track form submissions
  document.addEventListener('submit', function(e) {
    const form = e.target;
    if (form.tagName === 'FORM') {
      const formData = new FormData(form);
      const leadData = {
        name: formData.get('name') || formData.get('firstName'),
        email: formData.get('email'),
        phone: formData.get('phone') || formData.get('tel'),
      };

      track('form_submit', {
        event_name: form.id || 'unnamed_form',
        lead_data: leadData,
      });
    }
  });

  // Expose global tracking function
  window.trackEvent = function(eventType, eventData) {
    track(eventType, eventData);
  };

  console.log('[TrafficControl] Tracking initialized for site:', SITE_ID);
})();
