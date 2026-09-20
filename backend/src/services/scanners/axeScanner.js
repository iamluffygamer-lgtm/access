import fs from "node:fs";
import { normalizeAxeFinding } from "../analysis/findingNormalizer.js";

const axeSource = fs.readFileSync(
    new URL("../../../node_modules/axe-core/axe.min.js", import.meta.url),
    "utf8"
);

export async function runAxeScanner(page, currentUrl) {
    // 1. Inject axe-core
    await page.evaluate(axeSource);

    // 2. Run axe
    const results = await page.evaluate(async () => {
        return await window.axe.run();
    });

    // 3. Get bounds for all nodes to highlight them on screenshots
    const allTargets = [];
    results.violations.forEach((v) => {
        v.nodes.forEach((n) => {
            const selector = n.target.join(" ");
            if (!allTargets.includes(selector)) allTargets.push(selector);
        });
    });

    const bounds = await page.evaluate((targets) => {
        const b = {};
        for (const sel of targets) {
            try {
                const el = document.querySelector(sel);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    b[sel] = {
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height,
                    };
                }
            } catch (e) {}
        }
        return b;
    }, allTargets);

    // 4. Normalize
    return results.violations.map((v) => normalizeAxeFinding(currentUrl, v, bounds));
}
