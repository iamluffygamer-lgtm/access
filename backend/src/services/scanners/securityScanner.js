import { normalizeSecurityFinding } from '../analysis/findingNormalizer.js';

export function runSecurityScanners(pageData, targetUrl) {
  const findings = [];
  const controls = {
    https: "NOT TESTED",
    csp: "NOT TESTED",
    hsts: "NOT TESTED",
    cookies: "NOT TESTED",
    cors: "NOT TESTED",
    clickjacking: "NOT TESTED"
  };

  try {
    const urlObj = new URL(targetUrl);
    const mainResponse = pageData.responses.find(r => r.url === targetUrl || r.url.replace(/\/$/, '') === targetUrl.replace(/\/$/, ''));
    const headers = mainResponse ? (mainResponse.headers || {}) : {};
    
    // 1. HTTPS / Transport
    if (urlObj.protocol === "http:") {
      findings.push(normalizeSecurityFinding({
        id: `SEC-HTTP-001`,
        subcategory: "transport",
        severity: "high",
        confidence: "confirmed",
        title: "Page is served over HTTP",
        description: "The application does not enforce secure transport.",
        impact: "Network traffic can be intercepted or manipulated in transit.",
        affectedResource: { type: "page", url: targetUrl },
        evidence: { type: "http-response", protocol: "http:", status: mainResponse?.status },
        remediation: { summary: "Enforce HTTPS and use HSTS." }
      }));
      controls.https = "FAIL";
    } else {
      controls.https = "PASS";
    }

    if (mainResponse) {
      // 2. CSP
      const csp = headers['content-security-policy'];
      if (!csp) {
        findings.push(normalizeSecurityFinding({
          id: `SEC-CSP-001`,
          subcategory: "headers",
          severity: "high",
          confidence: "confirmed",
          title: "Content Security Policy is missing",
          description: "The response does not contain a Content-Security-Policy header.",
          impact: "A missing CSP removes an important browser-side mitigation against certain classes of content/script injection.",
          evidence: { type: "http-header", header: "Content-Security-Policy", actualValue: "Not present", status: mainResponse.status, url: targetUrl },
          affectedResource: { type: "page", url: targetUrl },
          remediation: { 
            summary: "Implement a Content-Security-Policy header to restrict resource origins.",
            details: "Example starting policy: default-src 'self'; script-src 'self';. Adapt to your application's requirements. Test in report-only mode first."
          }
        }));
        controls.csp = "FAIL";
      } else {
        controls.csp = "PASS";
      }

      // 3. HSTS
      if (urlObj.protocol === "https:") {
        const hsts = headers['strict-transport-security'];
        if (!hsts) {
           findings.push(normalizeSecurityFinding({
             id: `SEC-HSTS-001`,
             subcategory: "headers",
             severity: "medium",
             confidence: "confirmed",
             title: "Strict-Transport-Security header is missing",
             description: "The application does not enforce HSTS.",
             evidence: { type: "http-header", header: "Strict-Transport-Security", actualValue: "Not present" },
             affectedResource: { type: "page", url: targetUrl },
             remediation: { summary: "Add Strict-Transport-Security: max-age=31536000; includeSubDomains" }
           }));
           controls.hsts = "WARN";
        } else {
           controls.hsts = "PASS";
        }
      }
      
      // Clickjacking (X-Frame-Options OR CSP frame-ancestors)
      const xfo = headers['x-frame-options'];
      const hasFrameAncestors = csp && csp.includes('frame-ancestors');
      if (!xfo && !hasFrameAncestors) {
         findings.push(normalizeSecurityFinding({
           id: `SEC-FRAME-001`,
           subcategory: "headers",
           severity: "medium",
           confidence: "confirmed",
           title: "Missing Clickjacking Protection",
           description: "The application does not use X-Frame-Options or CSP frame-ancestors.",
           impact: "The page can be embedded in a malicious site to perform UI redressing attacks.",
           evidence: { type: "http-header", 'X-Frame-Options': 'Not present', 'CSP frame-ancestors': 'Not present' },
           affectedResource: { type: "page", url: targetUrl },
           remediation: { summary: "Add X-Frame-Options: DENY or SAMEORIGIN, or preferably CSP frame-ancestors 'none'." }
         }));
         controls.clickjacking = "FAIL";
      } else {
         controls.clickjacking = "PASS";
      }
    }

    // 4. Cookies (Context-Aware)
    let cookieControl = "PASS";
    let cookieChecked = false;
    for (const cookie of pageData.cookies) {
      cookieChecked = true;
      const isCsrfToken = cookie.name.toLowerCase().includes('csrf') || cookie.name.toLowerCase().includes('xsrf');
      const isSessionToken = cookie.name.toLowerCase().includes('session') || cookie.name.toLowerCase().includes('token') || cookie.name.toLowerCase().includes('auth') || cookie.name.toLowerCase().includes('sid');
      
      if (!cookie.httpOnly) {
        if (isCsrfToken) {
          findings.push(normalizeSecurityFinding({
             id: `SEC-COOKIE-HTTPONLY-INFO-${cookie.name}`,
             subcategory: "cookies",
             severity: "info",
             confidence: "high",
             title: `CSRF Cookie missing HttpOnly flag`,
             description: `The cookie ${cookie.name} is accessible to client-side scripts.`,
             impact: `This may be intentional for applications that use the cookie as a CSRF token. HttpOnly is therefore not automatically recommended for this cookie.`,
             evidence: { type: "cookie", cookie: cookie.name, flags: "missing HttpOnly", domain: cookie.domain },
             affectedResource: { type: "page", url: targetUrl }
          }));
        } else if (isSessionToken) {
          findings.push(normalizeSecurityFinding({
             id: `SEC-COOKIE-HTTPONLY-HIGH-${cookie.name}`,
             subcategory: "cookies",
             severity: "high",
             confidence: "high",
             title: `Session Cookie missing HttpOnly flag`,
             description: `The session cookie ${cookie.name} is accessible to client-side scripts.`,
             impact: `If XSS is present, attackers can steal this session identifier.`,
             evidence: { type: "cookie", cookie: cookie.name, flags: "missing HttpOnly", domain: cookie.domain },
             affectedResource: { type: "page", url: targetUrl },
             remediation: { summary: "Add the HttpOnly flag to this cookie." }
          }));
          cookieControl = "WARN";
        } else {
          findings.push(normalizeSecurityFinding({
             id: `SEC-COOKIE-HTTPONLY-LOW-${cookie.name}`,
             subcategory: "cookies",
             severity: "low",
             confidence: "high",
             title: `Cookie missing HttpOnly flag`,
             description: `The non-session cookie ${cookie.name} is accessible to client-side scripts.`,
             evidence: { type: "cookie", cookie: cookie.name, flags: "missing HttpOnly", domain: cookie.domain },
             affectedResource: { type: "page", url: targetUrl }
          }));
        }
      }
      if (!cookie.secure && urlObj.protocol === "https:") {
         findings.push(normalizeSecurityFinding({
           id: `SEC-COOKIE-SECURE-${cookie.name}`,
           subcategory: "cookies",
           severity: "medium",
           confidence: "high",
           title: `Cookie missing Secure flag`,
           description: `The cookie ${cookie.name} can be transmitted over unencrypted connections.`,
           evidence: { type: "cookie", cookie: cookie.name, flags: "missing Secure" },
           affectedResource: { type: "page", url: targetUrl },
           remediation: { summary: "Add the Secure flag so the cookie is only sent over HTTPS." }
         }));
         cookieControl = "WARN";
      }
    }
    if (cookieChecked && controls.cookies !== "WARN") controls.cookies = cookieControl;

    // 5. Mixed Content
    if (urlObj.protocol === "https:") {
      for (const req of pageData.requests) {
        if (req.url.startsWith("http://")) {
          findings.push(normalizeSecurityFinding({
            id: `SEC-MIXED-CONTENT-${encodeURIComponent(req.url).slice(0, 50)}`,
            subcategory: "transport",
            severity: req.resourceType === "script" || req.resourceType === "stylesheet" ? "high" : "medium",
            confidence: "confirmed",
            title: "Mixed Content Detected",
            description: `An insecure ${req.resourceType} resource was loaded on a secure page.`,
            evidence: { url: req.url, type: req.resourceType, initiator: req.initiator || "unknown" },
            affectedResource: { type: "resource", url: targetUrl },
            remediation: { summary: "Change the resource URL to use https:// instead of http://." }
          }));
        }
      }
    }

    // CORS
    let corsWarn = false;
    for (const res of pageData.responses) {
       if (res.headers && res.headers['access-control-allow-origin'] === '*') {
           if (res.headers['access-control-allow-credentials'] === 'true') {
               findings.push(normalizeSecurityFinding({
                 id: `SEC-CORS-${encodeURIComponent(res.url).slice(0, 50)}`,
                 subcategory: "cors",
                 severity: "high",
                 confidence: "confirmed",
                 title: "Insecure CORS Configuration",
                 description: "Origin wildcard with credentials enabled.",
                 evidence: { url: res.url, header: "access-control-allow-origin: *" },
                 affectedResource: { type: "resource", url: res.url },
                 remediation: { summary: "Remove wildcard origin if credentials are required, or explicitly reflect the allowed origin." }
               }));
               corsWarn = true;
           }
       }
    }
    if (pageData.responses.length > 0) controls.cors = corsWarn ? "FAIL" : "PASS";

    // 6. Source Map / Secret Exposure
    const secretRegex = /(?:sk_live_|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|AKIA[0-9A-Z]{16})/g;
    for (const res of pageData.responses) {
       // We can only check URLs and headers without downloading bodies again here, 
       // but let's check headers and URLs for leaked tokens
       if (res.url.includes('.map') || res.url.includes('sourceMap')) {
         findings.push(normalizeSecurityFinding({
            id: `SEC-SOURCEMAP-${encodeURIComponent(res.url).slice(0, 30)}`,
            subcategory: "exposure",
            severity: "info",
            confidence: "likely",
            title: "Potential Source Map Exposure",
            description: "A source map file was observed, which may leak internal application structure or source code.",
            evidence: { url: res.url },
            affectedResource: { type: "resource", url: res.url }
         }));
       }

       if (res.url.match(secretRegex) || JSON.stringify(res.headers).match(secretRegex) || (res.text && res.text.match(secretRegex))) {
          findings.push(normalizeSecurityFinding({
            id: `SEC-SECRET-${encodeURIComponent(res.url).slice(0, 30)}`,
            subcategory: "exposure",
            severity: "high",
            confidence: "potential",
            title: "Potential Secret Exposure",
            description: "A string resembling an API key, JWT, or secret was observed in a URL, HTTP header, or JS payload.",
            impact: "If the value is an active credential, it can lead to immediate compromise.",
            evidence: { url: res.url, location: "Headers, URL, or Payload" },
            affectedResource: { type: "resource", url: res.url },
            remediation: { summary: "Verify if the detected string is a sensitive credential. If so, revoke it immediately and pass it via secure POST bodies or server-to-server channels." }
          }));
       }
    }

  } catch (err) {
    console.error("Security scanner error", err);
  }

  return { findings, controls };
}
