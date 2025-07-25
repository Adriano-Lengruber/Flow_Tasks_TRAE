import React, { useState, useEffect } from 'react';
import { useWebVitals } from '../../utils/webVitals';

interface PerformanceDashboardProps {
  className?: string;
  compact?: boolean;
  showDetails?: boolean;
}

/**
 * Dashboard para exibir métricas de performance em tempo real
 * Mostra Web Vitals, scores e recomendações
 */
export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  className = '',
  compact = false,
  showDetails = true
}) => {
  const { metrics, isTracking, startTracking, getReport, sendToAnalytics } = useWebVitals();
  const [report, setReport] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Atualizar relatório quando métricas mudarem
  useEffect(() => {
    if (metrics) {
      const newReport = getReport();
      setReport(newReport);
      setLastUpdate(new Date());
    }
  }, [metrics, getReport]);

  // Iniciar tracking automaticamente
  useEffect(() => {
    if (!isTracking) {
      startTracking();
    }
  }, [isTracking, startTracking]);

  const handleSendAnalytics = async () => {
    try {
      await sendToAnalytics();
      alert('Métricas enviadas com sucesso!');
    } catch (error) {
      alert('Erro ao enviar métricas');
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#28a745'; // Verde
    if (score >= 50) return '#ffc107'; // Amarelo
    return '#dc3545'; // Vermelho
  };

  const getScoreEmoji = (score: number): string => {
    if (score >= 90) return '🟢';
    if (score >= 50) return '🟡';
    return '🔴';
  };

  const formatMetricValue = (key: string, value: number): string => {
    if (key === 'cls') {
      return value.toFixed(3);
    }
    return `${Math.round(value)}ms`;
  };

  const getMetricDescription = (key: string): string => {
    const descriptions = {
      lcp: 'Largest Contentful Paint - Tempo para carregar o maior elemento visível',
      fid: 'First Input Delay - Tempo de resposta à primeira interação',
      cls: 'Cumulative Layout Shift - Estabilidade visual da página',
      fcp: 'First Contentful Paint - Tempo para primeiro conteúdo aparecer',
      ttfb: 'Time to First Byte - Tempo de resposta do servidor'
    };
    return descriptions[key as keyof typeof descriptions] || '';
  };

  const getRecommendations = (scores: any): string[] => {
    const recommendations: string[] = [];
    
    if (scores.lcp?.value < 50) {
      recommendations.push('Otimize imagens e recursos críticos para melhorar LCP');
    }
    if (scores.fid?.value < 50) {
      recommendations.push('Reduza JavaScript bloqueante para melhorar FID');
    }
    if (scores.cls?.value < 50) {
      recommendations.push('Defina dimensões para imagens e evite inserções dinâmicas');
    }
    if (scores.fcp?.value < 50) {
      recommendations.push('Otimize CSS crítico e fontes para melhorar FCP');
    }
    if (scores.ttfb?.value < 50) {
      recommendations.push('Otimize servidor e use CDN para melhorar TTFB');
    }
    
    return recommendations;
  };

  if (!report) {
    return (
      <div className={`performance-dashboard loading ${className}`}>
        <div className="loading-content">
          <div className="loading-spinner">⏳</div>
          <p>Coletando métricas de performance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`performance-dashboard ${compact ? 'compact' : ''} ${className}`}>
      {/* Header */}
      <div className="dashboard-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="header-content">
          <h3>
            {getScoreEmoji(report.overall.score)} Performance Score: {report.overall.score}/100
          </h3>
          <div className="header-info">
            <span className="status">
              {isTracking ? '🟢 Ativo' : '🔴 Inativo'}
            </span>
            {lastUpdate && (
              <span className="last-update">
                Atualizado: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <button className="expand-button">
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="dashboard-content">
          {/* Overall Score */}
          <div className="overall-score">
            <div 
              className="score-circle"
              style={{ borderColor: getScoreColor(report.overall.score) }}
            >
              <span className="score-value">{report.overall.score}</span>
              <span className="score-label">Score</span>
            </div>
            <div className="score-info">
              <p className="score-rating">
                Rating: <strong>{report.overall.rating}</strong>
              </p>
              <p className="score-description">
                {report.overall.score >= 90 && 'Excelente performance! 🎉'}
                {report.overall.score >= 50 && report.overall.score < 90 && 'Performance boa, mas pode melhorar 👍'}
                {report.overall.score < 50 && 'Performance precisa de otimização ⚠️'}
              </p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="metrics-grid">
            {(Object.entries(report.scores) as [string, { value: number; threshold: { good: number; needsImprovement: number } }][]).map(([key, score]) => {
              if (!score) return null;
              
              return (
                <div key={key} className="metric-card">
                  <div className="metric-header">
                    <h4>{key.toUpperCase()}</h4>
                    <span 
                      className="metric-score"
                      style={{ color: getScoreColor(score.value) }}
                    >
                      {score.value}/100
                    </span>
                  </div>
                  <div className="metric-value">
                    {formatMetricValue(key, report.metrics[key as keyof typeof report.metrics])}
                  </div>
                  {showDetails && (
                    <div className="metric-details">
                      <p className="metric-description">
                        {getMetricDescription(key)}
                      </p>
                      <div className="metric-thresholds">
                        <span className="threshold good">
                          Bom: ≤ {formatMetricValue(key, score.threshold.good)}
                        </span>
                        <span className="threshold needs-improvement">
                          Precisa melhorar: ≤ {formatMetricValue(key, score.threshold.needsImprovement)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Recommendations */}
          {showDetails && (
            <div className="recommendations">
              <h4>💡 Recomendações</h4>
              {getRecommendations(report.scores).length > 0 ? (
                <ul>
                  {getRecommendations(report.scores).map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              ) : (
                <p className="no-recommendations">
                  🎉 Parabéns! Sua performance está ótima!
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="dashboard-actions">
            <button 
              className="btn btn-primary"
              onClick={handleSendAnalytics}
            >
              📊 Enviar para Analytics
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => window.location.reload()}
            >
              🔄 Recarregar Métricas
            </button>
          </div>
        </div>
      )}

      <style>{`
        .performance-dashboard {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          margin: 16px 0;
        }

        .performance-dashboard.compact {
          margin: 8px 0;
        }

        .loading {
          padding: 32px;
          text-align: center;
        }

        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .loading-spinner {
          font-size: 32px;
          animation: spin 2s linear infinite;
        }

        .dashboard-header {
          padding: 16px;
          background: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .dashboard-header:hover {
          background: #e9ecef;
        }

        .header-content {
          flex: 1;
        }

        .header-content h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }

        .header-info {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: #666;
        }

        .expand-button {
          background: none;
          border: none;
          font-size: 16px;
          color: #666;
          cursor: pointer;
          padding: 4px;
        }

        .dashboard-content {
          padding: 20px;
        }

        .overall-score {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 24px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .score-circle {
          width: 80px;
          height: 80px;
          border: 4px solid;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: white;
        }

        .score-value {
          font-size: 24px;
          font-weight: bold;
          line-height: 1;
        }

        .score-label {
          font-size: 10px;
          color: #666;
          text-transform: uppercase;
        }

        .score-info {
          flex: 1;
        }

        .score-rating {
          margin: 0 0 8px 0;
          font-size: 16px;
        }

        .score-description {
          margin: 0;
          color: #666;
          font-size: 14px;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .metric-card {
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 16px;
          background: white;
        }

        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .metric-header h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }

        .metric-score {
          font-weight: bold;
          font-size: 14px;
        }

        .metric-value {
          font-size: 24px;
          font-weight: bold;
          color: #333;
          margin-bottom: 12px;
        }

        .metric-description {
          font-size: 12px;
          color: #666;
          margin: 0 0 8px 0;
          line-height: 1.4;
        }

        .metric-thresholds {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .threshold {
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 3px;
          display: inline-block;
        }

        .threshold.good {
          background: #d4edda;
          color: #155724;
        }

        .threshold.needs-improvement {
          background: #fff3cd;
          color: #856404;
        }

        .recommendations {
          margin-bottom: 24px;
        }

        .recommendations h4 {
          margin: 0 0 12px 0;
          font-size: 16px;
          color: #333;
        }

        .recommendations ul {
          margin: 0;
          padding-left: 20px;
        }

        .recommendations li {
          margin-bottom: 8px;
          font-size: 14px;
          color: #666;
          line-height: 1.4;
        }

        .no-recommendations {
          margin: 0;
          padding: 16px;
          background: #d4edda;
          color: #155724;
          border-radius: 6px;
          text-align: center;
          font-weight: 500;
        }

        .dashboard-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover {
          background: #0056b3;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background: #545b62;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .overall-score {
            flex-direction: column;
            text-align: center;
            gap: 16px;
          }

          .metrics-grid {
            grid-template-columns: 1fr;
          }

          .dashboard-actions {
            flex-direction: column;
          }

          .header-info {
            flex-direction: column;
            gap: 4px;
          }
        }
      `}</style>
    </div>
  );
};

export default PerformanceDashboard;