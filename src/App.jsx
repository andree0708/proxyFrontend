import { useState, useEffect, useRef } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from 'chart.js'
import { generateText, getQuotaStatus, getQuotaHistory, upgradePlan, selectPlan } from './services/api'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip)

const TEXTS = {
  header: 'Plataforma IA con Proxy',
  monthlyTokens: 'Tokens Mensuales',
  requestsPerMin: 'Solicitudes/min',
  resets: 'Se renueva:',
  resetIn: 'Reinicio en',
  chatPlaceholder: 'Escribe tu prompt...',
  send: 'Enviar',
  wait: 'Esperar',
  tokensWillUse: 'tokens serán usados',
  generating: 'Generando...',
  usageHistory: 'Historial de Uso (Últimos 7 días)',
  upgradeTitle: 'Upgrade Tu Plan',
  upgradeMessage: 'Has alcanzado tu cuota mensual.Upgrade a PRO para continuar usando el servicio.',
  upgradeButton: 'Upgrade a PRO ($9.99/mes)',
  cancelButton: 'Más tarde',
  initialMessage: '¡Hola! Envíame un prompt y generaré texto para ti. Tu uso registra en tiempo real.',
  you: 'Tú',
  ai: 'IA',
  selectPlan: 'Seleccionar Plan',
  planChanged: 'Plan cambiado exitosamente'
}

function App() {
  const [messages, setMessages] = useState([{ role: 'ai', text: TEXTS.initialMessage }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [quotaStatus, setQuotaStatus] = useState(null)
  const [history, setHistory] = useState([])
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0)
  const [userId, setUserId] = useState('usuario1')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadData()
    const interval = setInterval(() => {
      setRateLimitCountdown(prev => prev > 0 ? prev - 1 : 0)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadData(uid = userId) {
    try {
      const [status, historyData] = await Promise.all([
        getQuotaStatus(uid),
        getQuotaHistory(uid)
      ])
      setQuotaStatus(status)
      setHistory(historyData)
    } catch (err) {
      console.error('Error loading data:', err)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim() || loading || rateLimitCountdown > 0) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMessage }])
    setLoading(true)

    try {
      const response = await generateText(userMessage, userId)
      setMessages(prev => [...prev, { role: 'ai', text: response.text }])
      await loadData()
    } catch (err) {
      if (err.upgrade) {
        setShowUpgradeModal(true)
      } else if (err.retryAfter) {
        setRateLimitCountdown(err.retryAfter)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleUpgrade() {
    try {
      await upgradePlan()
      setShowUpgradeModal(false)
      await loadData()
    } catch (err) {
      console.error('Error upgrading:', err)
    }
  }

  function estimateTokens(text) {
    return text.split(/\s+/).filter(Boolean).length
  }

  function formatNumber(num) {
    if (num === 'unlimited') return '∞'
    return Number(num).toLocaleString()
  }

  const tokensUsed = quotaStatus?.tokensUsed || 0
  const tokensTotal = quotaStatus?.tokensRemaining === 'unlimited' 
    ? 'unlimited' 
    : (Number(quotaStatus?.tokensUsed) || 0) + Number(quotaStatus?.tokensRemaining || 0)
  const tokenPercent = tokensTotal === 'unlimited' ? 0 : (tokensUsed / tokensTotal) * 100

  const requestsUsed = quotaStatus?.requestsUsed || 0
  const requestsTotal = quotaStatus?.requestsPerMinute === 'unlimited'
    ? 'unlimited'
    : Number(quotaStatus?.requestsPerMinute || 0)
  const requestPercent = requestsTotal === 'unlimited' ? 0 : (requestsUsed / requestsTotal) * 100

  const plan = quotaStatus?.plan || 'FREE'
  const planClass = plan.toLowerCase()

  const chartData = {
    labels: history.map(h => h.date?.slice(5) || ''),
    datasets: [{
      label: 'Tokens Used',
      data: history.map(h => h.tokensUsed || 0),
      backgroundColor: 'rgba(139, 92, 246, 0.6)',
      borderColor: '#8b5cf6',
      borderWidth: 1,
    }]
  }

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { 
        beginAtZero: true,
        grid: { color: 'rgba(255,255,255,0.1)' },
        ticks: { color: '#9ca3af' }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af' }
      }
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>{TEXTS.header}</h1>
        <div className="user-selector">
          <label>Usuario: </label>
          <select 
            value={userId} 
            onChange={(e) => {
              const newUserId = e.target.value
              setUserId(newUserId)
              setQuotaStatus(null)
              setMessages([{ role: 'ai', text: TEXTS.initialMessage }])
              loadData(newUserId)
            }}
            className="user-select"
          >
            <option value="usuario1">Usuario 1</option>
            <option value="usuario2">Usuario 2</option>
            <option value="usuario3">Usuario 3</option>
          </select>
        </div>
        <div className="plan-selector">
          <select 
            value={plan} 
            onChange={async (e) => {
              const newPlan = e.target.value
              setQuotaStatus(prev => prev ? { ...prev, plan: newPlan } : null)
              selectPlan(newPlan, userId).then(() => loadData(userId))
            }}
            className="plan-select"
          >
            <option value="FREE">FREE</option>
            <option value="PRO">PRO</option>
            <option value="ENTERPRISE">ENTERPRISE</option>
          </select>
        </div>
        <span className={`plan-badge ${planClass}`}>{plan}</span>
      </header>

      <div className="status-panel">
        <div className="status-grid">
          <div className="quota-section">
            <h3>{TEXTS.monthlyTokens}</h3>
            <div className="progress-bar">
              <div 
                className={`progress-fill ${tokenPercent > 80 ? 'warning' : ''} ${tokenPercent > 95 ? 'danger' : ''}`}
                style={{ width: `${tokenPercent}%` }}
              />
            </div>
            <div className="quota-info">
              <span>{formatNumber(tokensUsed)} / {formatNumber(tokensTotal)}</span>
              <span>{TEXTS.resets} {quotaStatus?.resetDate}</span>
            </div>
          </div>

          <div className="requests-section">
            <h3>{TEXTS.requestsPerMin}</h3>
            <div className="progress-bar">
              <div 
                className={`progress-fill ${requestPercent > 80 ? 'warning' : ''} ${requestPercent > 95 ? 'danger' : ''}`}
                style={{ width: `${requestPercent}%` }}
              />
            </div>
            <div className="quota-info">
              <span>{requestsUsed} / {formatNumber(requestsTotal)}</span>
              {rateLimitCountdown > 0 && (
                <span className="countdown">{TEXTS.resetIn} {rateLimitCountdown}s</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className="message-label">{msg.role === 'user' ? TEXTS.you : TEXTS.ai}</div>
              {msg.text}
            </div>
          ))}
          {loading && (
            <div className="message ai">
              <div className="loading">
                <div className="spinner"></div>
                {TEXTS.generating}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="chat-input-container">
            <div className="chat-input-wrapper">
              <textarea
                className="chat-input"
                placeholder={TEXTS.chatPlaceholder}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
                disabled={loading}
              />
              {input && (
                <div className="estimator">
                  ~{estimateTokens(input)} {TEXTS.tokensWillUse}
                </div>
              )}
            </div>
            <button 
              type="submit" 
              className="send-button"
              disabled={loading || !input.trim() || rateLimitCountdown > 0}
            >
              {rateLimitCountdown > 0 ? `${TEXTS.wait} ${rateLimitCountdown}s` : TEXTS.send}
            </button>
          </div>
        </form>
      </div>

      <div className="history-panel">
        <h3>{TEXTS.usageHistory}</h3>
        <Bar data={chartData} options={chartOptions} />
      </div>

      {showUpgradeModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{TEXTS.upgradeTitle}</h2>
            <p>{TEXTS.upgradeMessage}</p>
            <button className="upgrade-button" onClick={handleUpgrade}>
              {TEXTS.upgradeButton}
            </button>
            <button className="cancel-button" onClick={() => setShowUpgradeModal(false)}>
              {TEXTS.cancelButton}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App