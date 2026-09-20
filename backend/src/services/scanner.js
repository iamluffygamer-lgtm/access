import puppeteer from 'puppeteer';
import { runAxeScanner } from './scanners/axeScanner.js';
import { runSecurityScanners } from './scanners/securityScanner.js';
import { waitForReadiness } from './scanners/core/applicationReadiness.js';

const SCAN_TIMEOUT_MS = 60000;
const MAX_PAGES = 10; // Capped for hackathon safety

function isSafeUrl(targetUrl) {
    try {
        const u = new URL(targetUrl);
        const forbiddenHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
        if (forbiddenHosts.includes(u.hostname)) return false;
        if (u.hostname.endsWith('.internal') || u.hostname.endsWith('.local')) return false;
        return true;
    } catch {
        return false;
    }
}

export async function scanUrl(targetUrl, isDemo = false, mode = "quick", onProgress = () => {}) {
    if (!isDemo && !isSafeUrl(targetUrl)) {
        throw new Error("Target URL is restricted (SSRF protection).");
    }

    onProgress("Initializing browser", {});

    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setBypassCSP(true);
        await page.setViewport({ width: 1280, height: 800 });

        const pageData = {
            requests: [],
            responses: [],
            cookies: [],
            activeRequests: 0,
            lastNetworkActivity: Date.now(),
            consoleErrors: [],
            pageErrors: []
        };

        await page.setRequestInterception(true);
        page.on('console', msg => { if (msg.type() === 'error') pageData.consoleErrors.push(msg.text()); });
        page.on('pageerror', err => pageData.pageErrors.push(err.toString()));

        page.on('request', (req) => {
            pageData.activeRequests++;
            pageData.lastNetworkActivity = Date.now();
            if (!isDemo) {
                try {
                    const reqUrl = new URL(req.url());
                    if (['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254'].includes(reqUrl.hostname)) {
                        req.abort();
                        return;
                    }
                } catch {}
            }
            pageData.requests.push({ url: req.url(), method: req.method(), resourceType: req.resourceType() });
            req.continue();
        });

        page.on('response', async (res) => {
            pageData.activeRequests = Math.max(0, pageData.activeRequests - 1);
            pageData.lastNetworkActivity = Date.now();
            try {
                const req = res.request();
                const resourceType = req.resourceType();
                let text = "";
                if (resourceType === "script" && res.ok()) {
                    text = await res.text().catch(() => "");
                }
                pageData.responses.push({
                    url: res.url(),
                    status: res.status(),
                    headers: res.headers(),
                    resourceType,
                    text
                });
            } catch (e) {}
        });

        page.on('requestfailed', () => {
            pageData.activeRequests = Math.max(0, pageData.activeRequests - 1);
        });

        const client = await page.createCDPSession();
        await client.send('Profiler.enable');
        await client.send('Profiler.startPreciseCoverage', { callCount: false, detailed: true });

        const scannedUrls = new Set();
        const urlsToScan = [targetUrl];
        
        let aggregatedAxeFindings = [];
        let readinessMetadata = null;
        let mainScreenshot = null;
        let stackFingerprint = {};
        let exposedInputs = [];

        while (urlsToScan.length > 0 && scannedUrls.size < (mode === "deep" ? MAX_PAGES : 1)) {
            const currentUrl = urlsToScan.shift();
            if (scannedUrls.has(currentUrl)) continue;
            scannedUrls.add(currentUrl);

            try {
                onProgress("Loading application", { url: currentUrl, scanned: scannedUrls.size, total: urlsToScan.length + scannedUrls.size });
                // Navigate
                const response = await page.goto(currentUrl, { waitUntil: "domcontentloaded", timeout: SCAN_TIMEOUT_MS });
                
                // Track HTTP errors
                if (response && response.status() >= 400) {
                    if (currentUrl === targetUrl) {
                        readinessMetadata = { state: "ERROR", status: response.status() };
                        continue; // Still analyze security headers but DOM is broken
                    }
                }

                onProgress("Waiting for readiness", { url: currentUrl });
                const readiness = await waitForReadiness(page, pageData, 15000); // 15s max per page
                if (currentUrl === targetUrl) {
                    readinessMetadata = readiness;
                    const imgBuffer = await page.screenshot({ type: "jpeg", quality: 60 });
                    mainScreenshot = `data:image/jpeg;base64,${Buffer.from(imgBuffer).toString('base64')}`;
                    
                    stackFingerprint = await page.evaluate(() => ({
                        react: !!window.React || !!document.querySelector('[data-reactroot], [data-reactid]'),
                        vue: !!window.Vue || !!window.__VUE__,
                        nextjs: !!window.__NEXT_DATA__,
                        angular: !!window.angular || !!document.querySelector('[ng-version], [ng-app]')
                    }));

                    exposedInputs = await page.evaluate(() => 
                        Array.from(document.querySelectorAll('form, input[type="password"], input[type="file"]')).map(el => el.outerHTML.slice(0, 100))
                    );
                }

                onProgress("Analyzing accessibility", { url: currentUrl });
                const axeResult = await runAxeScanner(page, currentUrl);
                aggregatedAxeFindings = [...aggregatedAxeFindings, ...axeResult];

                if (mode === "deep") {
                    onProgress("Discovering pages", { url: currentUrl });
                    const links = await page.evaluate(() => {
                        return Array.from(document.querySelectorAll('a[href]'))
                            .map(a => a.href)
                            .filter(href => href.startsWith('http') && !href.includes('mailto:') && !href.includes('javascript:'));
                    });

                    const targetObj = new URL(targetUrl);
                    for (const link of links) {
                        try {
                            const lObj = new URL(link);
                            lObj.hash = ''; // ignore fragments
                            const cleanLink = lObj.href;
                            if (lObj.hostname === targetObj.hostname && !scannedUrls.has(cleanLink) && !urlsToScan.includes(cleanLink)) {
                                urlsToScan.push(cleanLink);
                            }
                        } catch {}
                    }
                }
            } catch (err) {
                console.error(`Error scanning ${currentUrl}:`, err);
            }
        }

        pageData.cookies = await page.cookies();
        const { result: coverage } = await client.send('Profiler.takePreciseCoverage');
        await browser.close();

        onProgress("Analyzing security", {});
        const securityAnalysis = runSecurityScanners(pageData, targetUrl);

        onProgress("Prioritizing findings", {});
        const uniqueAxe = [];
        const seenAxe = new Set();
        for (const f of aggregatedAxeFindings) {
            const key = `${f.id}-${f.evidence?.target}`;
            if (!seenAxe.has(key)) {
                seenAxe.add(key);
                uniqueAxe.push(f);
            }
        }

        const accessibilityFindings = uniqueAxe;
        const securityFindings = securityAnalysis.findings;

        const axeCounts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
        for (const f of accessibilityFindings) {
            if (axeCounts[f.severity] !== undefined) axeCounts[f.severity]++;
        }

        const secCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
        for (const f of securityFindings) {
            if (secCounts[f.severity] !== undefined) secCounts[f.severity]++;
        }

        let secScore = 100 - (secCounts.critical * 25) - (secCounts.high * 15) - (secCounts.medium * 5) - (secCounts.low * 2);
        let axeScore = 100 - (axeCounts.critical * 20) - (axeCounts.serious * 10) - (axeCounts.moderate * 5) - (axeCounts.minor * 2);
        const securityPosture = Math.max(0, secScore);
        const accessibilityHealth = Math.max(0, axeScore);

        onProgress("Building attack surface", {});
        const thirdPartyDomains = new Set();
        const scriptsMap = new Map();
        const apisMap = new Map();
        const uObj = new URL(targetUrl);
        
        for (const r of pageData.requests) {
           try {
             const ru = new URL(r.url);
             if (ru.hostname !== uObj.hostname) thirdPartyDomains.add(ru.hostname);
             if (r.resourceType === 'script') {
                scriptsMap.set(r.url, { url: r.url, domain: ru.hostname });
             }
             if (r.resourceType === 'xhr' || r.resourceType === 'fetch') {
                apisMap.set(r.url, { url: r.url, method: r.method, domain: ru.hostname });
             }
           } catch (e) {}
        }

        const attackSurface = {
           pages: scannedUrls.size,
           apis: Array.from(apisMap.values()),
           scripts: Array.from(scriptsMap.values()),
           domains: Array.from(thirdPartyDomains),
           cookies: pageData.cookies.map(c => ({ name: c.name, domain: c.domain, secure: c.secure, httpOnly: c.httpOnly }))
        };

        onProgress("Generating report", {});
        return {
          url: targetUrl,
          scannedAt: new Date().toISOString(),
          scanMode: mode,
          readiness: readinessMetadata,
          accessibilityHealth,
          accessibilityCounts: axeCounts,
          securityPosture,
          securityCounts: secCounts,
          accessibilityFindings,
          securityFindings,
          securityControls: securityAnalysis.controls,
          attackSurface: {
            ...attackSurface,
            stackFingerprint,
            exposedInputs,
            consoleErrors: pageData.consoleErrors,
            pageErrors: pageData.pageErrors,
            coverageFiles: coverage.length
          },
          screenshot: mainScreenshot
        };

    } catch (error) {
        await browser.close().catch(() => {});
        throw error;
    }
}
