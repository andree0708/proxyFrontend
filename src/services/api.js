const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export async function generateText(prompt, userId = 'usuario1') {
  const response = await fetch(`${API_BASE}/ai/generate?userId=${userId}`, {
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

export async function getQuotaStatus(userId = 'usuario1') {
  const response = await fetch(`${API_BASE}/quota/status?userId=${userId}`);
  return response.json();
}

export async function getQuotaHistory(userId = 'usuario1') {
  const response = await fetch(`${API_BASE}/quota/history?userId=${userId}`);
  return response.json();
}

export async function upgradePlan(userId = 'usuario1') {
  const response = await fetch(`${API_BASE}/quota/upgrade?userId=${userId}`, {
    method: 'POST'
  });
  return response.json();
}

export async function selectPlan(plan, userId = 'usuario1') {
  const response = await fetch(`${API_BASE}/quota/select-plan?userId=${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan })
  });
  return response.json();
}