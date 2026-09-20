export async function waitForReadiness(page, pageData, maxWaitMs = 30000) {
  const start = Date.now();
  let readinessState = "UNKNOWN";
  let timedOut = false;

  const signals = {
    domContentLoaded: true, // We wait for this before calling this func
    loadEvent: false,
    networkQuiet: false,
    domStable: false,
    loadingIndicatorsVisible: true,
    meaningfulContent: false
  };

  // 1. Inject DOM Mutation and Loading Indicator Tracker
  await page.evaluateOnNewDocument(() => {
    window.__accesslens_mutations = 0;
    window.__accesslens_last_mutation = Date.now();
    const observer = new MutationObserver(() => {
      window.__accesslens_mutations++;
      window.__accesslens_last_mutation = Date.now();
    });
    document.addEventListener("DOMContentLoaded", () => {
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    });
  });

  // Track if window.onload fired
  page.once('load', () => { signals.loadEvent = true; });

  const checkReadiness = async () => {
    const domInfo = await page.evaluate(() => {
      const timeSinceMutation = Date.now() - (window.__accesslens_last_mutation || Date.now());
      
      // Loading Indicators Check
      const spinners = document.querySelectorAll(
        '[aria-busy="true"], [role="progressbar"], [aria-label*="loading" i], [class*="loading" i], [class*="spinner" i], [data-testid*="loading" i]'
      );
      let isVisibleSpinner = false;
      for (const el of spinners) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && getComputedStyle(el).opacity !== "0" && getComputedStyle(el).visibility !== "hidden") {
          isVisibleSpinner = true;
          break;
        }
      }
      const textMatches = document.body ? document.body.innerText.match(/loading\.\.\.|please wait|initializing\.\.\.|fetching\.\.\./i) : null;
      if (textMatches) isVisibleSpinner = true;

      // Meaningful content
      const textLength = document.body ? document.body.innerText.length : 0;
      const links = document.querySelectorAll('a, button, input, form').length;
      const isMeaningful = textLength > 50 || links > 2;

      // Login page check
      const passwordInputs = document.querySelectorAll('input[type="password"]').length;
      const isLogin = passwordInputs > 0 || (document.body && document.body.innerText.match(/sign in|log in/i));

      return {
        timeSinceMutation,
        isVisibleSpinner,
        isMeaningful,
        isLogin
      };
    }).catch(() => ({ timeSinceMutation: 0, isVisibleSpinner: false, isMeaningful: false, isLogin: false }));

    signals.loadingIndicatorsVisible = domInfo.isVisibleSpinner;
    signals.meaningfulContent = domInfo.isMeaningful;
    signals.domStable = domInfo.timeSinceMutation > 1500;

    const timeSinceLastNetwork = Date.now() - pageData.lastNetworkActivity;
    signals.networkQuiet = pageData.activeRequests === 0 || timeSinceLastNetwork > 2000;

    if (domInfo.isLogin) {
      readinessState = "LOGIN";
      return true; // Stop waiting if it's a login page
    }

    // Ready Condition
    if (signals.domStable && signals.networkQuiet && !signals.loadingIndicatorsVisible && signals.meaningfulContent) {
      readinessState = "READY";
      return true;
    }

    return false;
  };

  // Polling loop
  while (Date.now() - start < maxWaitMs) {
    const isReady = await checkReadiness();
    if (isReady) break;
    await new Promise(r => setTimeout(r, 500));
  }

  if (readinessState === "UNKNOWN") {
    timedOut = true;
    // Do one final check, maybe it's just never strictly quiet
    const finalCheck = await page.evaluate(() => {
      const textLength = document.body ? document.body.innerText.length : 0;
      return textLength > 100;
    }).catch(() => false);
    if (finalCheck && !signals.loadingIndicatorsVisible) {
      readinessState = "READY"; // degraded readiness
    }
  }

  return {
    state: readinessState,
    waitedMs: Date.now() - start,
    confidence: timedOut ? "LOW" : "HIGH",
    timedOut,
    signals
  };
}
