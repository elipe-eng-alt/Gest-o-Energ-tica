import { Suspense, lazy, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  BatteryCharging,
  Building2,
  ClipboardList,
  Gauge,
  LogIn,
  LogOut,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  UserPlus,
} from 'lucide-react';
import { ALERTS, ALL_UNITS, CHART_DATA, CONSUMPTION_MIX, DEMO_PERIODS, INITIAL_OPPORTUNITIES, UNITS, type DemoPeriod } from './data/demo';
import { useAuth } from './hooks/useAuth';
import { useCompanyData } from './hooks/useCompanyData';
import { usePersistentState } from './hooks/usePersistentState';
import { useTheme } from './hooks/useTheme';
import { errorMessage } from './lib/api';
import { COMPANY_PERIODS, buildAlerts, buildMix, buildSeries, buildUnitStats, readingsInPeriod } from './lib/company';
import { computeSummary, isOpportunityList, matchesUnit, nextStatus, scaleSeries, unitShare } from './lib/energy';
import { formatPercent } from './lib/format';
import type { NavSection, Opportunity, User } from './types';

// Cada seção vira um chunk separado: o usuário só baixa o código (e o Recharts) da tela que abrir.
const DashboardSection = lazy(() => import('./sections/DashboardSection'));
const DataEntrySection = lazy(() => import('./sections/DataEntrySection'));
const OpportunitiesSection = lazy(() => import('./sections/OpportunitiesSection'));
const UnitsSection = lazy(() => import('./sections/UnitsSection'));
const ReportsSection = lazy(() => import('./sections/ReportsSection'));
const RegisterSection = lazy(() => import('./sections/RegisterSection'));
const LoginSection = lazy(() => import('./sections/LoginSection'));

const STORAGE_KEY = 'energia-viva-dashboard';
const EFFICIENCY_TARGET = 25;

const NAV_ITEMS: Record<NavSection, { label: string; icon: JSX.Element }> = {
  dashboard: { label: 'Dashboard', icon: <Gauge size={18} /> },
  lancamentos: { label: 'Lançamentos', icon: <ClipboardList size={18} /> },
  oportunidades: { label: 'Oportunidades', icon: <Sparkles size={18} /> },
  unidades: { label: 'Unidades', icon: <Building2 size={18} /> },
  relatorios: { label: 'Relatórios', icon: <ShieldCheck size={18} /> },
  cadastro: { label: 'Criar conta', icon: <UserPlus size={18} /> },
  entrar: { label: 'Entrar', icon: <LogIn size={18} /> },
};

const GUEST_SECTIONS: NavSection[] = ['dashboard', 'oportunidades', 'unidades', 'relatorios', 'cadastro', 'entrar'];
const COMPANY_SECTIONS: NavSection[] = ['dashboard', 'lancamentos', 'oportunidades', 'unidades', 'relatorios'];

const SECTION_TITLES: Record<NavSection, string> = {
  dashboard: 'Monitoramento de desperdício e eficiência',
  lancamentos: 'Lançamentos de consumo e unidades',
  oportunidades: 'Plano de ação e oportunidades de economia',
  unidades: 'Desempenho por unidade e setor',
  relatorios: 'Relatórios e indicadores executivos',
  cadastro: 'Crie a conta da sua empresa',
  entrar: 'Bem-vindo de volta',
};

const isSection = (value: string): value is NavSection => value in NAV_ITEMS;
const sectionFromHash = (): NavSection => {
  const hash = window.location.hash.slice(1);
  return isSection(hash) ? hash : 'dashboard';
};

function App() {
  const [period, setPeriod] = useState<string>('30d');
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState(ALL_UNITS);
  const [activeSection, setActiveSection] = useState<NavSection>(sectionFromHash);
  const [isGenerating, setIsGenerating] = useState(false);
  const [demoOpportunities, setDemoOpportunities] = usePersistentState(STORAGE_KEY, INITIAL_OPPORTUNITIES, isOpportunityList);
  const deferredSearch = useDeferredValue(search);
  const { theme, toggleTheme } = useTheme();
  const auth = useAuth();
  const company = useCompanyData(auth.user?.id ?? null);

  const isCompany = auth.status === 'user';
  const companyData = company.data;

  // Mantém a seção na URL (#oportunidades etc.) para permitir recarregar e compartilhar links.
  useEffect(() => {
    const onHashChange = () => setActiveSection(sectionFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((section: NavSection) => {
    window.location.hash = section;
    setActiveSection(section);
    window.scrollTo({ top: 0 });
  }, []);

  // Seção pedida que não existe no modo atual (ex.: "Lançamentos" sem login) cai na mais próxima.
  const allowedSections = isCompany ? COMPANY_SECTIONS : GUEST_SECTIONS;
  const section: NavSection = allowedSections.includes(activeSection)
    ? activeSection
    : activeSection === 'lancamentos'
      ? 'entrar'
      : 'dashboard';

  const periods = isCompany ? COMPANY_PERIODS : DEMO_PERIODS;
  const effectivePeriod = periods.some((item) => item.id === period) ? period : isCompany ? '12m' : '30d';
  const periodLabel = periods.find((item) => item.id === effectivePeriod)?.label ?? '';

  const unitOptions = useMemo(
    () => [ALL_UNITS, ...(isCompany ? (companyData?.units ?? []).map((unit) => unit.name) : UNITS.map((unit) => unit.name))],
    [isCompany, companyData],
  );
  const effectiveUnit = unitOptions.includes(unitFilter) ? unitFilter : ALL_UNITS;

  const periodReadings = useMemo(
    () => (isCompany && companyData ? readingsInPeriod(companyData, effectivePeriod, ALL_UNITS) : []),
    [isCompany, companyData, effectivePeriod],
  );

  const series = useMemo(() => {
    if (!isCompany) return scaleSeries(CHART_DATA[effectivePeriod as DemoPeriod], unitShare(effectiveUnit));
    if (!companyData) return [];
    return buildSeries(readingsInPeriod(companyData, effectivePeriod, effectiveUnit));
  }, [isCompany, companyData, effectivePeriod, effectiveUnit]);

  const allUnits = useMemo(
    () => (isCompany ? (companyData ? buildUnitStats(companyData, periodReadings) : []) : UNITS),
    [isCompany, companyData, periodReadings],
  );
  const activeUnits = useMemo(() => allUnits.filter((unit) => effectiveUnit === ALL_UNITS || unit.name === effectiveUnit), [allUnits, effectiveUnit]);

  const opportunities: Opportunity[] = isCompany ? (companyData?.opportunities ?? []) : demoOpportunities;
  const unitOpportunities = useMemo(() => opportunities.filter((item) => matchesUnit(item, effectiveUnit)), [opportunities, effectiveUnit]);

  const filteredOpportunities = useMemo(() => {
    const term = deferredSearch.trim().toLocaleLowerCase('pt-BR');
    if (!term) return unitOpportunities;
    return unitOpportunities.filter(
      (item) => item.title.toLocaleLowerCase('pt-BR').includes(term) || item.description.toLocaleLowerCase('pt-BR').includes(term),
    );
  }, [unitOpportunities, deferredSearch]);

  const alerts = useMemo(() => (isCompany ? (companyData ? buildAlerts(companyData) : []) : ALERTS), [isCompany, companyData]);
  const mix = useMemo(() => (isCompany ? buildMix(series) : CONSUMPTION_MIX), [isCompany, series]);
  const formUnits = useMemo(
    () => (isCompany ? (companyData?.units ?? []) : UNITS.map((unit) => ({ name: unit.name, sector: unit.area }))),
    [isCompany, companyData],
  );

  const summary = useMemo(() => computeSummary(series, unitOpportunities), [series, unitOpportunities]);
  const targetProgress = Math.min(100, (summary.savingsRealized / Math.max(summary.savingsPotential, 1)) * 100);

  const runCompanyAction = useCallback(async (action: () => Promise<unknown>) => {
    try {
      await action();
    } catch (reason) {
      window.alert(errorMessage(reason));
    }
  }, []);

  const handleAdvance = useCallback(
    (id: number) => {
      if (!isCompany) {
        setDemoOpportunities((current) => current.map((item) => (item.id === id ? { ...item, status: nextStatus(item.status) } : item)));
        return;
      }
      const current = companyData?.opportunities.find((item) => item.id === id);
      if (current) void runCompanyAction(() => company.mutate('PATCH', `/opportunities/${id}`, { status: nextStatus(current.status) }));
    },
    [isCompany, companyData, company, runCompanyAction, setDemoOpportunities],
  );

  const handleRemove = useCallback(
    (id: number) => {
      if (!isCompany) {
        setDemoOpportunities((current) => current.filter((item) => item.id !== id));
        return;
      }
      if (window.confirm('Excluir esta oportunidade?')) void runCompanyAction(() => company.mutate('DELETE', `/opportunities/${id}`));
    },
    [isCompany, company, runCompanyAction, setDemoOpportunities],
  );

  const handleCreate = useCallback(
    (opportunity: Omit<Opportunity, 'id'>) => {
      if (!isCompany) {
        setDemoOpportunities((current) => [{ ...opportunity, id: Math.max(0, ...current.map((item) => item.id)) + 1 }, ...current]);
        return;
      }
      const unitId = companyData?.units.find((unit) => unit.name === opportunity.unit)?.id ?? null;
      void runCompanyAction(() => company.mutate('POST', '/opportunities', { ...opportunity, unitId }));
    },
    [isCompany, companyData, company, runCompanyAction, setDemoOpportunities],
  );

  const handleReset = useCallback(() => setDemoOpportunities(INITIAL_OPPORTUNITIES), [setDemoOpportunities]);

  const handleRegistered = useCallback(
    (user: User) => {
      auth.signIn(user);
      navigate('lancamentos');
    },
    [auth, navigate],
  );

  const handleLogin = useCallback(
    async (email: string, senha: string) => {
      await auth.login(email, senha);
      navigate('dashboard');
    },
    [auth, navigate],
  );

  const handleLogout = async () => {
    await auth.logout();
    navigate('dashboard');
  };

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      const { generatePDFReport } = await import('./lib/report');
      await generatePDFReport({
        companyName: isCompany ? (auth.user?.companyName ?? 'EnergiaViva') : 'EnergiaViva',
        periodLabel,
        fileSuffix: effectivePeriod,
        unitFilter: effectiveUnit,
        units: activeUnits,
        summary,
        opportunities: unitOpportunities,
      });
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

  const renderCompanyGate = () => {
    if (company.error) return <div className="panel form-message error">{company.error}</div>;
    if (!companyData) return <div className="panel loading-panel">Carregando dados da empresa...</div>;
    return null;
  };

  const renderMainContent = () => {
    if (isCompany && (section === 'dashboard' || section === 'lancamentos' || section === 'unidades' || section === 'relatorios' || section === 'oportunidades')) {
      const gate = renderCompanyGate();
      if (gate) return gate;
    }

    switch (section) {
      case 'lancamentos':
        return companyData && <DataEntrySection data={companyData} mutate={company.mutate} />;
      case 'oportunidades':
        return (
          <OpportunitiesSection
            opportunities={filteredOpportunities}
            units={formUnits}
            unitOptions={unitOptions}
            unitFilter={effectiveUnit}
            onUnitFilterChange={setUnitFilter}
            search={search}
            onSearchChange={setSearch}
            onAdvance={handleAdvance}
            onRemove={handleRemove}
            onCreate={handleCreate}
            onReset={isCompany ? undefined : handleReset}
          />
        );
      case 'unidades':
        return (
          <UnitsSection
            units={activeUnits}
            opportunities={opportunities}
            unitOptions={unitOptions}
            unitFilter={effectiveUnit}
            onUnitFilterChange={setUnitFilter}
          />
        );
      case 'relatorios':
        return (
          <ReportsSection
            periodLabel={periodLabel}
            unitFilter={effectiveUnit}
            summary={summary}
            opportunities={unitOpportunities}
            isGenerating={isGenerating}
            onGeneratePDF={handleGeneratePDF}
            onExportCSV={handleExportCSV}
          />
        );
      case 'cadastro':
        return <RegisterSection onRegistered={handleRegistered} onGoToLogin={() => navigate('entrar')} />;
      case 'entrar':
        return <LoginSection onLogin={handleLogin} onGoToRegister={() => navigate('cadastro')} />;
      default:
        if (isCompany && companyData && !companyData.readings.length) {
          return (
            <section className="panel onboarding-panel">
              <p className="label">Primeiros passos</p>
              <h3>Seu painel aparece assim que você lançar o primeiro mês de consumo</h3>
              <ol>
                <li>Cadastre as unidades da empresa (fábrica, filial, escritório...).</li>
                <li>Lance o consumo mensal de cada unidade com os dados da fatura de energia.</li>
                <li>Acompanhe indicadores, alertas e oportunidades de economia aqui no dashboard.</li>
              </ol>
              <button type="button" className="primary-button" onClick={() => navigate('lancamentos')}>
                Ir para Lançamentos
              </button>
            </section>
          );
        }
        return (
          <DashboardSection
            series={series}
            summary={summary}
            units={activeUnits}
            opportunities={filteredOpportunities}
            alerts={alerts}
            mix={mix}
            unitOptions={unitOptions}
            unitFilter={effectiveUnit}
            onUnitFilterChange={setUnitFilter}
            search={search}
            onSearchChange={setSearch}
            onAdvance={handleAdvance}
          />
        );
    }
  };

  if (auth.status === 'loading') {
    return <div className="app-loading">Carregando...</div>;
  }

  const showPeriodControl = section === 'dashboard' || section === 'relatorios';
  const showReportButton = section === 'dashboard' || section === 'oportunidades' || section === 'unidades' || section === 'relatorios';
  const showDemoBanner = !isCompany && section !== 'cadastro' && section !== 'entrar';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-icon">
            <BatteryCharging size={20} />
          </div>
          <div>
            <p className="eyebrow">EnergiaViva</p>
            <h1>{isCompany ? auth.user?.companyName : 'Gestão de energia'}</h1>
          </div>
        </div>

        <nav className="nav" aria-label="Seções">
          {allowedSections.map((id) => (
            <button
              key={id}
              type="button"
              className={`nav-item ${section === id ? 'active' : ''}`}
              aria-current={section === id ? 'page' : undefined}
              onClick={() => navigate(id)}
            >
              {NAV_ITEMS[id].icon}
              {NAV_ITEMS[id].label}
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

        {isCompany && auth.user && (
          <div className="user-card">
            <div>
              <strong>{auth.user.name}</strong>
              <small>{auth.user.email}</small>
            </div>
            <button type="button" className="icon-button" aria-label="Sair" title="Sair" onClick={handleLogout}>
              <LogOut size={16} />
            </button>
          </div>
        )}
      </aside>

      <main className="main-content">
        {showDemoBanner && (
          <div className="demo-banner" role="note">
            <span>
              Você está vendo <b>dados de demonstração</b>. Crie a conta da sua empresa para lançar o seu consumo real.
            </span>
            <div className="footer-actions">
              <button type="button" className="secondary-button" onClick={() => navigate('entrar')}>
                Entrar
              </button>
              <button type="button" className="primary-button" onClick={() => navigate('cadastro')}>
                Criar conta
              </button>
            </div>
          </div>
        )}

        <header className="topbar">
          <div>
            <p className="eyebrow">{isCompany ? 'Área da empresa' : 'Painel executivo'}</p>
            <h2>{SECTION_TITLES[section]}</h2>
          </div>
          <div className="header-actions">
            {showPeriodControl && (
              <div className="segmented-control" role="group" aria-label="Período">
                {periods.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    title={item.label}
                    className={effectivePeriod === item.id ? 'selected' : ''}
                    onClick={() => setPeriod(item.id)}
                  >
                    {item.short}
                  </button>
                ))}
              </div>
            )}
            {showReportButton && (
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
