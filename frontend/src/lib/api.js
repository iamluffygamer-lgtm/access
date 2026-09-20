const BASE = "/api";

export async function scanSite(url, demo = false, mode = "quick", onProgress = () => {}) {
  const res = await fetch(`${BASE}/scan`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url, demo, mode }),
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to scan site");
  }
  
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    const data = await res.json();
    return data;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    
    // Split on double newline
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop(); // keep the last incomplete chunk in buffer
    
    for (const chunk of chunks) {
      if (chunk.startsWith('data: ')) {
        const jsonStr = chunk.slice(6);
        try {
          const data = JSON.parse(jsonStr);
          if (data.type === 'progress') {
            onProgress(data.phase, data.data);
          } else if (data.type === 'error') {
            throw new Error(data.message);
          } else if (data.type === 'done') {
            return data.report;
          }
        } catch (e) {
          if (e.message !== "Unexpected end of JSON input") {
            // handle
          }
        }
      }
    }
  }
  
  throw new Error("Connection closed before report was received");
}

export async function explainViolations(findings) {
  const res = await fetch(`${BASE}/explain`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ findings }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Explain failed");
  return data;
}

export async function getDemoSites() {
  const res = await fetch(`${BASE}/demo-sites`);
  return res.json();
}
