import { Suspense, lazy, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { BatteryCharging, Building2, Gauge, Moon, ShieldCheck, Sparkles, Sun, UserPlus } from 'lucide-react';
import { ALL_UNITS, CHART_DATA, INITIAL_OPPORTUNITIES, PERIODS, UNITS } from './data/demo';
import { usePersistentState } from './hooks/usePersistentState';
import { useTheme } from './hooks/useTheme';
import { computeSummary, isOpportunityList, matchesUnit, nextStatus, scaleSeries, unitShare } from './lib/energy';
import { formatPercent } from './lib/format';
import type { NavSection, Opportunity, Period } from './types';

// Cada seção vira um chunk separado: o usuário só baixa o código (e o Recharts) da tela que abrir.
const DashboardSection = lazy(() => import('./sections/DashboardSection'));
const OpportunitiesSection = lazy(() => import('./sections/OpportunitiesSection'));
const UnitsSection = lazy(() => import('./sections/UnitsSection'));
const ReportsSection = lazy(() => import('./sections/ReportsSection'));
const RegisterSection = lazy(() => import('./sections/RegisterSection'));

const STORAGE_KEY = 'energia-viva-dashboard';
const EFFICIENCY_TARGET = 25;

const NAV_ITEMS: { id: NavSection; label: string; icon: JSX.Element }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Gauge size={18} /> },
  { id: 'oportunidades', label: 'Oportunidades', icon: <Sparkles size={18} /> },
  { id: 'unidades', label: 'Unidades', icon: <Building2 size={18} /> },
  { id: 'relatorios', label: 'Relatórios', icon: <ShieldCheck size={18} /> },
  { id: 'cadastro', label: 'Cadastro', icon: <UserPlus size={18} /> },
];

const SECTION_TITLES: Record<NavSection, string> = {
  dashboard: 'Monitoramento de desperdício e eficiência',
  oportunidades: 'Plano de ação e oportunidades de economia',
  unidades: 'Desempenho por unidade e setor',
  relatorios: 'Relatórios e indicadores executivos',
  cadastro: 'Cadastro de cliente e parceiro',
};

const isSection = (value: string): value is NavSection => NAV_ITEMS.some((item) => item.id === value);
const sectionFromHash = (): NavSection => {
  const hash = window.location.hash.slice(1);
  return isSection(hash) ? hash : 'dashboard';
};

function App() {
  const [period, setPeriod] = useState<Period>('30d');
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState(ALL_UNITS);
  const [activeSection, setActiveSection] = useState<NavSection>(sectionFromHash);
  const [isGenerating, setIsGenerating] = useState(false);
  const [opportunities, setOpportunities] = usePersistentState(STORAGE_KEY, INITIAL_OPPORTUNITIES, isOpportunityList);
  const deferredSearch = useDeferredValue(search);
  const { theme, toggleTheme } = useTheme();

  // Mantém a seção na URL (#oportunidades etc.) para permitir recarregar e compartilhar links.
  useEffect(() => {
    const onHashChange = () => setActiveSection(sectionFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (section: NavSection) => {
    window.location.hash = section;
    setActiveSection(section);
  };

  const series = useMemo(() => scaleSeries(CHART_DATA[period], unitShare(unitFilter)), [period, unitFilter]);
  const activeUnits = useMemo(() => UNITS.filter((unit) => unitFilter === ALL_UNITS || unit.name === unitFilter), [unitFilter]);
  const unitOpportunities = useMemo(() => opportunities.filter((item) => matchesUnit(item, unitFilter)), [opportunities, unitFilter]);

  const filteredOpportunities = useMemo(() => {
    const term = deferredSearch.trim().toLocaleLowerCase('pt-BR');
    if (!term) return unitOpportunities;
    return unitOpportunities.filter(
      (item) => item.title.toLocaleLowerCase('pt-BR').includes(term) || item.description.toLocaleLowerCase('pt-BR').includes(term),
    );
  }, [unitOpportunities, deferredSearch]);

  const summary = useMemo(() => computeSummary(series, unitOpportunities), [series, unitOpportunities]);
  const targetProgress = Math.min(100, (summary.savingsRealized / Math.max(summary.savingsPotential, 1)) * 100);

  const handleAdvance = useCallback(
    (id: number) => setOpportunities((current) => current.map((item) => (item.id === id ? { ...item, status: nextStatus(item.status) } : item))),
    [setOpportunities],
  );

  const handleRemove = useCallback(
    (id: number) => setOpportunities((current) => current.filter((item) => item.id !== id)),
    [setOpportunities],
  );

  const handleCreate = useCallback(
    (opportunity: Omit<Opportunity, 'id'>) =>
      setOpportunities((current) => [{ ...opportunity, id: Math.max(0, ...current.map((item) => item.id)) + 1 }, ...current]),
    [setOpportunities],
  );

  const handleReset = useCallback(() => setOpportunities(INITIAL_OPPORTUNITIES), [setOpportunities]);

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      const { generatePDFReport } = await import('./lib/report');
      await generatePDFReport({ period, unitFilter, summary, opportunities: unitOpportunities });
    } catch (error) {
      console.error('Falha ao gerar PDF:', error);
      window.alert('Não foi possível gerar o relatório. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCSV = async () => {
    const { exportOpportunitiesCSV } = await import('./lib/report');
    exportOpportunitiesCSV(unitOpportunities);
  };

  const renderMainContent = () => {
    switch (activeSection) {
      case 'oportunidades':
        return (
          <OpportunitiesSection
            opportunities={filteredOpportunities}
            unitFilter={unitFilter}
            onUnitFilterChange={setUnitFilter}
            search={search}
            onSearchChange={setSearch}
            onAdvance={handleAdvance}
            onRemove={handleRemove}
            onCreate={handleCreate}
            onReset={handleReset}
          />
        );
      case 'unidades':
        return <UnitsSection units={activeUnits} opportunities={opportunities} unitFilter={unitFilter} onUnitFilterChange={setUnitFilter} />;
      case 'relatorios':
        return (
          <ReportsSection
            period={period}
            unitFilter={unitFilter}
            summary={summary}
            opportunities={unitOpportunities}
            isGenerating={isGenerating}
            onGeneratePDF={handleGeneratePDF}
            onExportCSV={handleExportCSV}
          />
        );
      case 'cadastro':
        return <RegisterSection />;
      default:
        return (
          <DashboardSection
            series={series}
            summary={summary}
            units={activeUnits}
            opportunities={filteredOpportunities}
            unitFilter={unitFilter}
            onUnitFilterChange={setUnitFilter}
            search={search}
            onSearchChange={setSearch}
            onAdvance={handleAdvance}
          />
        );
    }
  };

  const showPeriodControl = activeSection === 'dashboard' || activeSection === 'relatorios';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-icon">
            <BatteryCharging size={20} />
          </div>
          <div>
            <p className="eyebrow">EnergiaViva</p>
            <h1>Gestão de energia</h1>
          </div>
        </div>

        <nav className="nav" aria-label="Seções">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
              aria-current={activeSection === item.id ? 'page' : undefined}
              onClick={() => navigate(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <button type="button" role="switch" aria-checked={theme === 'dark'} className="theme-toggle" onClick={toggleTheme}>
          {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          Modo escuro
          <span className="switch" aria-hidden="true" />
        </button>

        <div className="mini-card">
          <p className="label">Meta de eficiência</p>
          <h3>{EFFICIENCY_TARGET}%</h3>
          <div className="progress-bar">
            <span style={{ width: `${targetProgress}%` }} />
          </div>
          <small>{formatPercent(targetProgress)} da economia potencial capturada</small>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Painel executivo</p>
            <h2>{SECTION_TITLES[activeSection]}</h2>
          </div>
          <div className="header-actions">
            {showPeriodControl && (
              <div className="segmented-control" role="group" aria-label="Período">
                {PERIODS.map((item) => (
                  <button key={item} type="button" className={period === item ? 'selected' : ''} onClick={() => setPeriod(item)}>
                    {item}
                  </button>
                ))}
              </div>
            )}
            {activeSection !== 'cadastro' && (
              <button type="button" className="primary-button" onClick={handleGeneratePDF} disabled={isGenerating}>
                {isGenerating ? 'Gerando...' : 'Gerar relatório'}
              </button>
            )}
          </div>
        </header>

        <Suspense fallback={<div className="panel loading-panel">Carregando...</div>}>{renderMainContent()}</Suspense>
      </main>
    </div>
  );
}

export default App;
