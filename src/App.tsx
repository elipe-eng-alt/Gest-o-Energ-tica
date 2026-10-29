import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { jsPDF } from 'jspdf';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BatteryCharging,
  Building2,
  CircleDollarSign,
  Gauge,
  Leaf,
  Search,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Zap,
} from 'lucide-react';

type Period = '7d' | '30d' | '90d' | '12m';
type Status = 'pendente' | 'em andamento' | 'concluída';
type Priority = 'alta' | 'media' | 'baixa';
type NavSection = 'dashboard' | 'oportunidades' | 'unidades' | 'relatorios' | 'cadastro';

type Unit = {
  id: string;
  name: string;
  area: string;
  consumed: number;
  cost: number;
  efficiency: number;
  status: 'ok' | 'alerta' | 'risco';
};

type Opportunity = {
  id: number;
  title: string;
  unit: string;
  sector: string;
  potential: number;
  savings: number;
  priority: Priority;
  status: Status;
  due: string;
  description: string;
};

type AlertItem = {
  id: number;
  title: string;
  level: 'crítico' | 'alto' | 'médio';
  detail: string;
};

type EnergyPoint = {
  month: string;
  consumo: number;
  desperdicio: number;
  custo: number;
};

type CustomerFormState = {
  nome: string;
  empresa: string;
  email: string;
  telefone: string;
  document: string;
  setor: string;
  cargo: string;
  senha: string;
  confirmarSenha: string;
};

const STATUS_ORDER: Status[] = ['pendente', 'em andamento', 'concluída'];
const defaultForm: CustomerFormState = {
  nome: '',
  empresa: '',
  email: '',
  telefone: '',
  document: '',
  setor: '',
  cargo: '',
  senha: '',
  confirmarSenha: '',
};

const initialUnits: Unit[] = [
  { id: 'matriz', name: 'Matriz Industrial', area: 'Produção', consumed: 12840, cost: 36420, efficiency: 82, status: 'alerta' },
  { id: 'logistica', name: 'Logística Norte', area: 'Armazém', consumed: 9420, cost: 26170, efficiency: 76, status: 'risco' },
  { id: 'oficina', name: 'Oficina Técnica', area: 'Manutenção', consumed: 6230, cost: 17690, efficiency: 88, status: 'ok' },
  { id: 'cobertura', name: 'Cobertura Comercial', area: 'Vendas', consumed: 4810, cost: 13320, efficiency: 91, status: 'ok' },
];

const initialOpportunities: Opportunity[] = [
  {
    id: 1,
    title: 'Troca de iluminação por LEDs em linha de produção',
    unit: 'Matriz Industrial',
    sector: 'Produção',
    potential: 18,
    savings: 18400,
    priority: 'alta',
    status: 'em andamento',
    due: '12 dias',
    description: 'Substituição dos pontos de luz antigos por luminárias LED com sensores de presença.',
  },
  {
    id: 2,
    title: 'Ajuste de horário da climatização em armazém',
    unit: 'Logística Norte',
    sector: 'Armazém',
    potential: 26,
    savings: 21600,
    priority: 'alta',
    status: 'pendente',
    due: '4 dias',
    description: 'Redução de operação fora do horário útil e manutenção de filtros.',
  },
  {
    id: 3,
    title: 'Manutenção preventiva em compressores',
    unit: 'Oficina Técnica',
    sector: 'Manutenção',
    potential: 14,
    savings: 9700,
    priority: 'media',
    status: 'concluída',
    due: 'Concluído',
    description: 'Correção de vazamentos e revisão de pressões em compressores.',
  },
  {
    id: 4,
    title: 'Automação de corte de energia em áreas ociosas',
    unit: 'Cobertura Comercial',
    sector: 'Vendas',
    potential: 11,
    savings: 6300,
    priority: 'baixa',
    status: 'pendente',
    due: '20 dias',
    description: 'Programação de desligamento automático em setores sem ocupação.',
  },
];

const initialAlerts: AlertItem[] = [
  { id: 1, title: 'Pico de consumo em armazém', level: 'crítico', detail: 'Consumo 28% acima da média no período noturno.' },
  { id: 2, title: 'Desbalanceamento de demanda', level: 'alto', detail: 'Cargas em horário de pico elevadas em 3 setores.' },
  { id: 3, title: 'Máquinas inativas com energia residual', level: 'médio', detail: 'Trechos de produção em standby sem desligamento automático.' },
];

const chartData: Record<Period, EnergyPoint[]> = {
  '7d': [
    { month: 'Seg', consumo: 2210, desperdicio: 430, custo: 6340 },
    { month: 'Ter', consumo: 2540, desperdicio: 510, custo: 6960 },
    { month: 'Qua', consumo: 2410, desperdicio: 520, custo: 6650 },
    { month: 'Qui', consumo: 2660, desperdicio: 560, custo: 7190 },
    { month: 'Sex', consumo: 2890, desperdicio: 610, custo: 7840 },
    { month: 'Sáb', consumo: 1970, desperdicio: 360, custo: 5510 },
    { month: 'Dom', consumo: 1820, desperdicio: 280, custo: 5050 },
  ],
  '30d': [
    { month: 'Jan', consumo: 21600, desperdicio: 4200, custo: 61200 },
    { month: 'Fev', consumo: 22840, desperdicio: 4360, custo: 64300 },
    { month: 'Mar', consumo: 24180, desperdicio: 4680, custo: 67100 },
    { month: 'Abr', consumo: 25020, desperdicio: 4920, custo: 70850 },
    { month: 'Mai', consumo: 26330, desperdicio: 5200, custo: 73600 },
    { month: 'Jun', consumo: 27140, desperdicio: 5480, custo: 74980 },
  ],
  '90d': [
    { month: 'Jan', consumo: 67000, desperdicio: 13600, custo: 189000 },
    { month: 'Fev', consumo: 69600, desperdicio: 14120, custo: 193800 },
    { month: 'Mar', consumo: 73500, desperdicio: 15840, custo: 206000 },
    { month: 'Abr', consumo: 75220, desperdicio: 16750, custo: 212400 },
    { month: 'Mai', consumo: 77460, desperdicio: 17220, custo: 218300 },
    { month: 'Jun', consumo: 79800, desperdicio: 18100, custo: 223500 },
  ],
  '12m': [
    { month: 'Jan', consumo: 268400, desperdicio: 50000, custo: 740000 },
    { month: 'Fev', consumo: 274200, desperdicio: 51500, custo: 755000 },
    { month: 'Mar', consumo: 281100, desperdicio: 52900, custo: 769000 },
    { month: 'Abr', consumo: 287600, desperdicio: 54400, custo: 782000 },
    { month: 'Mai', consumo: 293800, desperdicio: 56200, custo: 798000 },
    { month: 'Jun', consumo: 301200, desperdicio: 57900, custo: 812000 },
  ],
};

const pieData = [
  { name: 'Uso produtivo', value: 68 },
  { name: 'Desperdício', value: 21 },
  { name: 'Standby', value: 11 },
];

const CURRENCY = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const STORAGE_KEY = 'energia-viva-dashboard';

function App() {
  const [period, setPeriod] = useState<Period>('30d');
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('Todos');
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [formData, setFormData] = useState<CustomerFormState>(defaultForm);
  const [registrationMessage, setRegistrationMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialOpportunities;

    try {
      const parsed = JSON.parse(saved) as Opportunity[];
      return parsed.length ? parsed : initialOpportunities;
    } catch {
      return initialOpportunities;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(opportunities));
  }, [opportunities]);

  const activeUnits = useMemo(() => initialUnits.filter((unit) => unitFilter === 'Todos' || unit.name === unitFilter), [unitFilter]);

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opportunity) => {
      const matchesUnit = unitFilter === 'Todos' || opportunity.unit === unitFilter;
      const matchesSearch = opportunity.title.toLowerCase().includes(search.toLowerCase());
      return matchesUnit && matchesSearch;
    });
  }, [opportunities, search, unitFilter]);

  const summary = useMemo(() => {
    const data = chartData[period];
    const totalConsumption = data.reduce((total, item) => total + item.consumo, 0);
    const totalWaste = data.reduce((total, item) => total + item.desperdicio, 0);
    const totalCost = data.reduce((total, item) => total + item.custo, 0);
    const savingsPotential = opportunities.reduce((total, item) => total + item.savings, 0);

    return {
      totalConsumption,
      totalWaste,
      totalCost,
      savingsPotential,
      wasteRate: (totalWaste / totalConsumption) * 100,
    };
  }, [opportunities, period]);

  const unitOptions = ['Todos', ...initialUnits.map((unit) => unit.name)];

  const handleStatusAdvance = (id: number) => {
    setOpportunities((current) =>
      current.map((opportunity) => {
        if (opportunity.id !== id) return opportunity;

        const currentIndex = STATUS_ORDER.indexOf(opportunity.status);
        const nextStatus = STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length];

        return { ...opportunity, status: nextStatus };
      }),
    );
  };

  const handleFormChange = (field: keyof CustomerFormState, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const generatePDFReport = () => {
    const doc = new jsPDF();
    doc.setFillColor(243, 248, 245);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(20, 36, 29);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('EnergiaViva — Relatório Executivo', 16, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período analisado: ${period.toUpperCase()}`, 16, 30);

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(12);
    doc.text('Resumo do desempenho', 16, 52);
    doc.setFontSize(10);
    doc.text(`- Consumo total: ${(summary.totalConsumption / 1000).toFixed(1)} MWh`, 18, 63);
    doc.text(`- Custo energético: ${CURRENCY.format(summary.totalCost)}`, 18, 71);
    doc.text(`- Desperdício estimado: ${(summary.totalWaste / 1000).toFixed(1)} MWh`, 18, 79);
    doc.text(`- Potencial de economia: ${CURRENCY.format(summary.savingsPotential)}`, 18, 87);
    doc.text(`- taxa de desperdício: ${summary.wasteRate.toFixed(1)}%`, 18, 95);

    doc.setFontSize(12);
    doc.text('Oportunidades prioritárias', 16, 115);
    doc.setFontSize(10);
    opportunities.slice(0, 3).forEach((opportunity, index) => {
      const y = 126 + index * 18;
      doc.text(`• ${opportunity.title} — ${opportunity.priority} — ${CURRENCY.format(opportunity.savings)}`, 18, y);
    });

    doc.save(`relatorio-energia-viva-${period}.pdf`);
  };

  const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (formData.senha.length < 8) {
      setRegistrationMessage({ type: 'error', message: 'A senha deve ter pelo menos 8 caracteres.' });
      return;
    }

    if (formData.senha !== formData.confirmarSenha) {
      setRegistrationMessage({ type: 'error', message: 'As senhas não conferem.' });
      return;
    }

    setIsSubmitting(true);
    setRegistrationMessage(null);

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao cadastrar cliente.');
      }

      setRegistrationMessage({
        type: 'success',
        message: data.message || 'Cadastro realizado com sucesso.',
      });
      setFormData(defaultForm);
    } catch (error) {
      setRegistrationMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Falha ao cadastrar.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const priorityColors: Record<Priority, string> = {
    alta: '#ff6b57',
    media: '#f9b94a',
    baixa: '#6dd6a4',
  };

  const kpis = [
    {
      label: 'Consumo total',
      value: `${(summary.totalConsumption / 1000).toFixed(1)} MWh`,
      detail: '+6,2% vs. período anterior',
      icon: <Zap size={18} />,
      tone: 'green',
    },
    {
      label: 'Custo energético',
      value: CURRENCY.format(summary.totalCost),
      detail: 'Custos com contratos e demanda',
      icon: <CircleDollarSign size={18} />,
      tone: 'amber',
    },
    {
      label: 'Desperdício estimado',
      value: `${(summary.totalWaste / 1000).toFixed(1)} MWh`,
      detail: `${summary.wasteRate.toFixed(1)}% da operação`,
      icon: <Activity size={18} />,
      tone: 'red',
    },
    {
      label: 'Potencial de economia',
      value: CURRENCY.format(summary.savingsPotential),
      detail: 'Ações em execução e planejadas',
      icon: <Leaf size={18} />,
      tone: 'blue',
    },
  ];

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: <Gauge size={18} /> },
    { id: 'oportunidades' as const, label: 'Oportunidades', icon: <Sparkles size={18} /> },
    { id: 'unidades' as const, label: 'Unidades', icon: <Building2 size={18} /> },
    { id: 'relatorios' as const, label: 'Relatórios', icon: <ShieldCheck size={18} /> },
    { id: 'cadastro' as const, label: 'Cadastro', icon: <UserPlus size={18} /> },
  ];

  const sectionTitles: Record<NavSection, string> = {
    dashboard: 'Monitoramento de desperdício e eficiência',
    oportunidades: 'Plano de ação e oportunidades de economia',
    unidades: 'Desempenho por unidade e setor',
    relatorios: 'Relatórios e indicadores executivos',
    cadastro: 'Cadastro de cliente e parceiro',
  };

  const renderDashboard = () => (
    <>
      <section className="kpi-grid">
        {kpis.map((kpi) => (
          <article key={kpi.label} className={`kpi-card ${kpi.tone}`}>
            <div className="kpi-icon">{kpi.icon}</div>
            <div>
              <span>{kpi.label}</span>
              <strong>{kpi.value}</strong>
              <small>{kpi.detail}</small>
            </div>
          </article>
        ))}
      </section>

      <section className="panel-grid main-panel-grid">
        <article className="panel large-panel">
          <div className="panel-head">
            <div>
              <p className="label">Evolução de consumo</p>
              <h3>Energia x desperdício</h3>
            </div>
            <div className="select-wrap">
              <label htmlFor="unit-select">Unidade</label>
              <select id="unit-select" value={unitFilter} onChange={(event) => setUnitFilter(event.target.value)}>
                {unitOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData[period]}>
                <defs>
                  <linearGradient id="energyFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#38b984" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#38b984" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#dfe8e3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip formatter={(value: number) => [`${value.toLocaleString('pt-BR')} kWh`, 'Consumo']} />
                <Area type="monotone" dataKey="consumo" stroke="#2b8a67" fill="url(#energyFill)" strokeWidth={3} />
                <Area type="monotone" dataKey="desperdicio" stroke="#ef6d5a" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel side-panel">
          <div className="panel-head compact-head">
            <div>
              <p className="label">Mix de consumo</p>
              <h3>Distribuição</h3>
            </div>
          </div>
          <div className="pie-chart-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={50} outerRadius={76} paddingAngle={4}>
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={['#38b984', '#ef6d5a', '#f4d35e'][index]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="legend-list">
            {pieData.map((item, index) => (
              <li key={item.name}>
                <span className="legend-dot" style={{ background: ['#38b984', '#ef6d5a', '#f4d35e'][index] }} />
                {item.name}
                <strong>{item.value}%</strong>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="panel-row">
        <article className="panel large-panel">
          <div className="panel-head">
            <div>
              <p className="label">Oportunidades</p>
              <h3>Prioridade de ação</h3>
            </div>
            <div className="search-box">
              <Search size={15} />
              <input
                type="text"
                placeholder="Buscar oportunidade"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <div className="opportunity-list">
            {filteredOpportunities.map((opportunity) => (
              <div key={opportunity.id} className="opportunity-item">
                <div className="opportunity-main">
                  <div className="title-group">
                    <span className="badge priority" style={{ background: `${priorityColors[opportunity.priority]}22`, color: priorityColors[opportunity.priority] }}>
                      {opportunity.priority}
                    </span>
                    <h4>{opportunity.title}</h4>
                  </div>
                  <p>{opportunity.description}</p>
                </div>

                <div className="meta-grid">
                  <div>
                    <small>Unidade</small>
                    <strong>{opportunity.unit}</strong>
                  </div>
                  <div>
                    <small>Impacto</small>
                    <strong>{opportunity.potential}%</strong>
                  </div>
                  <div>
                    <small>Economia</small>
                    <strong>{CURRENCY.format(opportunity.savings)}</strong>
                  </div>
                  <div>
                    <small>Prazo</small>
                    <strong>{opportunity.due}</strong>
                  </div>
                </div>

                <div className="opportunity-footer">
                  <span className={`status-pill ${opportunity.status.replace(' ', '-')}`}>
                    {opportunity.status}
                  </span>
                  <button className="secondary-button" onClick={() => handleStatusAdvance(opportunity.id)}>
                    Avançar status
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel side-panel">
          <div className="panel-head compact-head">
            <div>
              <p className="label">Alertas ativos</p>
              <h3>Monitoramento</h3>
            </div>
          </div>

          <div className="alert-list">
            {initialAlerts.map((alert) => (
              <div key={alert.id} className="alert-item">
                <div className={`alert-icon ${alert.level}`}>
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <strong>{alert.title}</strong>
                  <p>{alert.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="bottom-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="label">Unidades</p>
              <h3>Performance por setor</h3>
            </div>
          </div>

          <div className="unit-table">
            {activeUnits.map((unit) => (
              <div key={unit.id} className="unit-row">
                <div>
                  <strong>{unit.name}</strong>
                  <small>{unit.area}</small>
                </div>
                <div>
                  <strong>{(unit.consumed / 1000).toFixed(1)} MWh</strong>
                  <small>Consumo</small>
                </div>
                <div>
                  <strong>{CURRENCY.format(unit.cost)}</strong>
                  <small>Custo</small>
                </div>
                <div>
                  <strong>{unit.efficiency}%</strong>
                  <small>Eficiência</small>
                </div>
                <span className={`signal ${unit.status}`}>{unit.status}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="label">Custo por mês</p>
              <h3>Comparativo financeiro</h3>
            </div>
          </div>

          <div className="chart-wrap small-chart">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData[period]}>
                <CartesianGrid strokeDasharray="4 4" stroke="#dfe8e3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip formatter={(value: number) => [CURRENCY.format(value), 'Custo']} />
                <Bar dataKey="custo" radius={[10, 10, 0, 0]} fill="#6a7cff" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <footer className="footer-row">
        <div className="footer-balance">
          <ArrowUpRight size={16} />
          <span>Economia acumulada estimada: <strong>{CURRENCY.format(summary.savingsPotential)}</strong></span>
        </div>
      </footer>
    </>
  );

  const renderMainContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboard();
      case 'oportunidades':
        return (
          <section className="panel">
            <div className="panel-head">
              <div>
                <p className="label">Oportunidades</p>
                <h3>Prioridade de ação</h3>
              </div>
              <div className="search-box">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Buscar oportunidade"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            <div className="opportunity-list">
              {filteredOpportunities.map((opportunity) => (
                <div key={opportunity.id} className="opportunity-item">
                  <div className="opportunity-main">
                    <div className="title-group">
                      <span className="badge priority" style={{ background: `${priorityColors[opportunity.priority]}22`, color: priorityColors[opportunity.priority] }}>
                        {opportunity.priority}
                      </span>
                      <h4>{opportunity.title}</h4>
                    </div>
                    <p>{opportunity.description}</p>
                  </div>

                  <div className="meta-grid">
                    <div>
                      <small>Unidade</small>
                      <strong>{opportunity.unit}</strong>
                    </div>
                    <div>
                      <small>Impacto</small>
                      <strong>{opportunity.potential}%</strong>
                    </div>
                    <div>
                      <small>Economia</small>
                      <strong>{CURRENCY.format(opportunity.savings)}</strong>
                    </div>
                    <div>
                      <small>Prazo</small>
                      <strong>{opportunity.due}</strong>
                    </div>
                  </div>

                  <div className="opportunity-footer">
                    <span className={`status-pill ${opportunity.status.replace(' ', '-')}`}>
                      {opportunity.status}
                    </span>
                    <button className="secondary-button" onClick={() => handleStatusAdvance(opportunity.id)}>
                      Avançar status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      case 'unidades':
        return (
          <section className="panel">
            <div className="panel-head">
              <div>
                <p className="label">Unidades</p>
                <h3>Performance por setor</h3>
              </div>
              <div className="select-wrap">
                <label htmlFor="unit-select">Unidade</label>
                <select id="unit-select" value={unitFilter} onChange={(event) => setUnitFilter(event.target.value)}>
                  {unitOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="unit-table">
              {activeUnits.map((unit) => (
                <div key={unit.id} className="unit-row">
                  <div>
                    <strong>{unit.name}</strong>
                    <small>{unit.area}</small>
                  </div>
                  <div>
                    <strong>{(unit.consumed / 1000).toFixed(1)} MWh</strong>
                    <small>Consumo</small>
                  </div>
                  <div>
                    <strong>{CURRENCY.format(unit.cost)}</strong>
                    <small>Custo</small>
                  </div>
                  <div>
                    <strong>{unit.efficiency}%</strong>
                    <small>Eficiência</small>
                  </div>
                  <span className={`signal ${unit.status}`}>{unit.status}</span>
                </div>
              ))}
            </div>
          </section>
        );
      case 'relatorios':
        return (
          <section className="panel">
            <div className="panel-head">
              <div>
                <p className="label">Relatórios</p>
                <h3>Resumo executivo</h3>
              </div>
            </div>

            <div className="alert-list">
              <div className="alert-item">
                <div className="alert-icon crítico">
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <strong>Redução potencial anual</strong>
                  <p>{CURRENCY.format(summary.savingsPotential)} em economia identificada com ações prioritárias.</p>
                </div>
              </div>
              <div className="alert-item">
                <div className="alert-icon alto">
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <strong>Desperdício operacional</strong>
                  <p>{summary.wasteRate.toFixed(1)}% do consumo total está associado a perdas e standby.</p>
                </div>
              </div>
              <div className="alert-item">
                <div className="alert-icon médio">
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <strong>Meta de eficiência</strong>
                  <p>Custos e consumo mostram tendência de queda ao manter ações em andamento.</p>
                </div>
              </div>
            </div>
          </section>
        );
      case 'cadastro':
        return (
          <section className="panel form-panel">
            <div className="panel-head">
              <div>
                <p className="label">Cadastro</p>
                <h3>Solicite um diagnóstico personalizado</h3>
              </div>
            </div>

            <form className="register-form" onSubmit={handleRegisterSubmit}>
              <div className="field-grid">
                <label>
                  <span>Nome completo</span>
                  <input type="text" value={formData.nome} onChange={(event) => handleFormChange('nome', event.target.value)} required />
                </label>
                <label>
                  <span>Empresa</span>
                  <input type="text" value={formData.empresa} onChange={(event) => handleFormChange('empresa', event.target.value)} required />
                </label>
                <label>
                  <span>E-mail</span>
                  <input type="email" value={formData.email} onChange={(event) => handleFormChange('email', event.target.value)} required />
                </label>
                <label>
                  <span>Telefone</span>
                  <input type="tel" value={formData.telefone} onChange={(event) => handleFormChange('telefone', event.target.value)} required />
                </label>
                <label>
                  <span>CPF/CNPJ</span>
                  <input type="text" value={formData.document} onChange={(event) => handleFormChange('document', event.target.value)} required />
                </label>
                <label>
                  <span>Setor</span>
                  <input type="text" value={formData.setor} onChange={(event) => handleFormChange('setor', event.target.value)} required />
                </label>
                <label>
                  <span>Cargo</span>
                  <input type="text" value={formData.cargo} onChange={(event) => handleFormChange('cargo', event.target.value)} required />
                </label>
                <label>
                  <span>Senha</span>
                  <input type="password" value={formData.senha} onChange={(event) => handleFormChange('senha', event.target.value)} required />
                </label>
                <label>
                  <span>Confirmar senha</span>
                  <input type="password" value={formData.confirmarSenha} onChange={(event) => handleFormChange('confirmarSenha', event.target.value)} required />
                </label>
              </div>

              {registrationMessage && (
                <div className={`form-message ${registrationMessage.type}`}>
                  {registrationMessage.message}
                </div>
              )}

              <button type="submit" className="primary-button submit-button" disabled={isSubmitting}>
                {isSubmitting ? 'Cadastrando...' : 'Salvar cadastro'}
              </button>
            </form>
          </section>
        );
      default:
        return renderDashboard();
    }
  };

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

        <nav className="nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mini-card">
          <p className="label">Meta de eficiência</p>
          <h3>18,4%</h3>
          <div className="progress-bar">
            <span style={{ width: '72%' }} />
          </div>
          <small>72% da meta atual</small>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Painel executivo</p>
            <h2>{sectionTitles[activeSection]}</h2>
          </div>
          <div className="header-actions">
            {activeSection === 'dashboard' ? (
              <>
                <div className="segmented-control">
                  {(['7d', '30d', '90d', '12m'] as Period[]).map((item) => (
                    <button
                      key={item}
                      className={period === item ? 'selected' : ''}
                      onClick={() => setPeriod(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <button className="primary-button" onClick={generatePDFReport}>Gerar relatório</button>
              </>
            ) : activeSection === 'cadastro' ? (
              <button type="button" className="primary-button" onClick={generatePDFReport}>Baixar resumo PDF</button>
            ) : (
              <button className="primary-button" onClick={generatePDFReport}>Gerar relatório</button>
            )}
          </div>
        </header>

        {renderMainContent()}
      </main>
    </div>
  );
}

export default App;
