const API_BASE = 'https://proxybackend-fe5z.onrender.com/api';

export async function generateText(prompt) {
  const response = await fetch(`${API_BASE}/ai/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw error;
  }
  
  return response.json();
}

export async function getQuotaStatus() {
  const response = await fetch(`${API_BASE}/quota/status`);
  return response.json();
}

export async function getQuotaHistory() {
  const response = await fetch(`${API_BASE}/quota/history`);
  return response.json();
}

export async function upgradePlan() {
  const response = await fetch(`${API_BASE}/quota/upgrade`, {
    method: 'POST'
  });
  return response.json();
}