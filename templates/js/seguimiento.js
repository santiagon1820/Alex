/* ============================================================
   seguimiento.js — Lógica React para la página de Seguimiento
   ============================================================ */

const { useState, useEffect } = React;
const { createRoot } = ReactDOM;
const { MemoryRouter, Routes, Route, Link, useNavigate } = ReactRouterDOM;

// --- Shared Components ---

const Header = ({ title, showBack, primaryAction, secondaryAction }) => {
    const navigate = useNavigate();
    return (
        <header class="sticky top-0 z-50 flex items-center justify-between border-b border-solid border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 md:px-10 py-3 shadow-sm gap-3">
            <div class="flex items-center gap-3 min-w-0">
                {showBack && (
                    <button
                        onClick={() => navigate(-1)}
                        class="flex-shrink-0 flex items-center justify-center size-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                    >
                        <span class="material-symbols-outlined">arrow_back</span>
                    </button>
                )}
                {/* Brand / logo — redirige a /panel */}
                <a href="/panel" class="brand-link truncate">MGLAB</a>
            </div>
            <div class="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                {secondaryAction && (
                    <button
                        onClick={secondaryAction.onClick}
                        class="hidden sm:flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-sm font-medium leading-normal transition-colors"
                    >
                        <span class="truncate header-action-label">{secondaryAction.label}</span>
                    </button>
                )}
                {primaryAction && (
                    <button
                        onClick={primaryAction.onClick}
                        class="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-3 sm:px-4 bg-primary hover:bg-primary/90 text-white text-sm font-bold leading-normal shadow-sm transition-colors gap-1"
                    >
                        <span class="material-symbols-outlined text-[18px]">add</span>
                        <span class="truncate hidden sm:inline header-action-label">{primaryAction.label}</span>
                    </button>
                )}
                <div
                    class="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-9 border border-slate-200 dark:border-slate-700 flex-shrink-0"
                    style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDfncxQdzTLij90qhQqMPDFz9aCFDdMQkBDsyoiGJFBxFCquDtTRpiGgO7WpNH-OtA83ChKQQmXiGNzaIanjX_oOf-DATsGBcVIJnnI8F_Cv_dH75-kmCYJBecA2rBAgJNTJjSTMcq1ZKg3xVQjuy-HGJ5EFMFuKhoY2vaPaWthLwKs3hI89GLwaUTtmnE_UHC8zRSa801kkPyPoHS7diRTS4XCJtiNeZB7CXVcr89x4kLyxCbQM9eGDVnogceD_Wesd7fK0hjyeQ")' }}
                ></div>
            </div>
        </header>
    );
};

// --- Screens ---

const DashboardPage = () => {
    const navigate = useNavigate();
    const projects = [
        { id: 1, priority: 'High',   code: 'ANX-2023-042', name: 'Ampliación Red Hidráulica Norte',     content: 'Revisión de planos de tubería y válvulas de control en sector 4 para asegurar cumplimiento con nueva normativa estatal de aguas.', dept: 'Sec. Obras Públicas',  type: 'Proyecto',      statusIng: 'Pendiente',      statusGen: 'En espera de gob', toby: '$12,500', admvo: '$4,200', total: '$16,700', fileRec: 'anexo_tec...', fileChanges: null,       fileCot: null },
        { id: 2, priority: 'Medium', code: 'ANX-2023-038', name: 'Remodelación Sala Juntas B',           content: 'Cambio de luminarias, pintura y cableado estructurado para videoconferencia. Incluye pantalla 85".', dept: 'Administración',         type: 'Cotización',    statusIng: 'Listo Cot',      statusGen: 'Enviado',          toby: '$8,350',  admvo: '$2,100', total: '$10,450', fileRec: 'requerim...',  fileChanges: 'cambios...', fileCot: 'cotizacio...' },
        { id: 3, priority: 'Low',    code: 'ANX-2023-045', name: 'Mantenimiento HVAC Torre 2',           content: 'Limpieza de ductos y cambio de filtros en unidades manejadoras pisos 5-10.',              dept: 'Mantenimiento',          type: 'Re-Cot',        statusIng: 'Listo Cambios', statusGen: 'Pendiente',        toby: '$5,600',  admvo: '$1,500', total: '$7,100',  fileRec: 'reporte...',   fileChanges: 'ajuste_al...', fileCot: null },
        { id: 4, priority: 'High',   code: 'ANX-2023-041', name: 'Pavimentación Calle 5 de Mayo',        content: 'Levantamiento topográfico y estudio de mecánica de suelos para repavimentación.',           dept: 'Desarrollo Urbano',      type: 'Cot-Especial',  statusIng: 'Pendiente',      statusGen: 'Urgente',          toby: '$45,000', admvo: '$8,000', total: '$53,000', fileRec: 'levantam...',  fileChanges: null,       fileCot: null },
        { id: 5, priority: 'Medium', code: 'ANX-2023-039', name: 'Instalación Fibra Óptica Campus',      content: 'Cableado subterráneo entre edificio A y edificio C, incluye registros cada 50m.',          dept: 'TI / Infraestructura',   type: 'Proyecto',      statusIng: 'Listo Cot',      statusGen: 'En espera de gob', toby: '$18,200', admvo: '$3,500', total: '$21,700', fileRec: 'diagram...',   fileChanges: null,       fileCot: 'cotizacio...' },
        { id: 6, priority: 'Low',    code: 'ANX-2023-035', name: 'Reporte Mensual Ambiental',            content: 'Generación de reporte de impacto ambiental mes de Octubre para cumplimiento SEMARNAT.',    dept: 'Ecología',               type: 'Anexo',         statusIng: 'Listo Cambios', statusGen: 'Enviado',          toby: '$1,200',  admvo: '$500',   total: '$1,700',  fileRec: 'reporte...',   fileChanges: 'anexo_f...', fileCot: null },
    ];

    const priorityStyle = (p) => {
        const styles = {
            'High':   'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800/50',
            'Medium': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800/50',
            'Low':    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800/50'
        };
        return styles[p] || '';
    };

    const statusStyle = (s) => {
        const styles = {
            'Pendiente':       'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
            'En espera de gob':'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
            'Listo Cot':       'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            'Enviado':         'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            'Listo Cambios':   'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            'Urgente':         'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        };
        return styles[s] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    };

    return (
        <div class="flex h-auto min-h-screen w-full flex-col">
            <Header
                primaryAction={{ label: 'Nuevo Folio', onClick: () => navigate('/detail') }}
            />
            <div class="flex flex-1 justify-center py-6 sm:py-8 px-3 sm:px-6 md:px-10 lg:px-12">
                <div class="layout-content-container flex flex-col w-full max-w-[1920px]">

                    {/* Título + buscador */}
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-800 mb-6">
                        <div class="flex flex-col gap-1">
                            <h1 class="text-slate-900 dark:text-white text-2xl sm:text-3xl font-bold leading-tight">Folios Abiertos</h1>
                            <p class="text-slate-500 dark:text-slate-400 text-sm">Vista detallada de seguimiento de anexos, estado financiero y proyectos activos.</p>
                        </div>
                        <div class="flex gap-2 w-full md:w-auto">
                            <div class="relative flex-1 md:flex-none">
                                <input
                                    class="header-search pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary w-full md:w-64"
                                    placeholder="Buscar folio, anexo..."
                                    type="text"
                                />
                                <span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
                            </div>
                            <button class="p-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900">
                                <span class="material-symbols-outlined">filter_list</span>
                            </button>
                        </div>
                    </div>

                    {/* Filtros */}
                    <div class="flex flex-wrap gap-2 mb-6">
                        <button class="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">Todos</button>
                        <button class="px-3 py-1.5 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Alta Prioridad</button>
                        <button class="px-3 py-1.5 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Pendientes Ing.</button>
                        <button class="px-3 py-1.5 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Enviados</button>
                    </div>

                    {/* Tabla */}
                    <div class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative">
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse min-w-[2000px]">
                                <thead>
                                    <tr class="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                        <th class="table-sticky-left-0 bg-slate-50 dark:bg-slate-900 py-4 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[100px] border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] align-top">Prioridad</th>
                                        <th class="table-sticky-left-100 bg-slate-50 dark:bg-slate-900 py-4 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[120px] border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] align-top">Folio # Anexo</th>
                                        <th class="py-4 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[200px] w-[220px] align-top">Nombre del Anexo</th>
                                        <th class="py-4 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[400px] align-top">Contenido</th>
                                        <th class="py-4 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider align-top">Dependencia</th>
                                        <th class="py-4 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider align-top">Tipo</th>
                                        <th class="py-4 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider align-top">Status Ing.</th>
                                        <th class="py-4 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider align-top">Status General</th>
                                        <th class="py-4 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[150px] align-top">Status Jaime</th>
                                        <th class="py-4 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right align-top">Toby ($)</th>
                                        <th class="py-4 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right align-top">ADMVO ($)</th>
                                        <th class="py-4 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right font-bold text-slate-700 dark:text-slate-300 align-top">Suma ($)</th>
                                        <th class="py-4 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center align-top min-w-[140px]">Recibido</th>
                                        <th class="py-4 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center align-top min-w-[140px]">Cambios</th>
                                        <th class="py-4 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center align-top min-w-[140px]">Cotización</th>
                                        <th class="table-sticky-right bg-slate-50 dark:bg-slate-900 py-4 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center border-l border-slate-200 dark:border-slate-800 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] align-top">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                                    {projects.map(p => (
                                        <tr key={p.id} onClick={() => navigate('/detail')} class="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer align-top">
                                            <td class="table-sticky-left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 py-4 px-4 border-r border-slate-100 dark:border-slate-800 align-top">
                                                <span class={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${priorityStyle(p.priority)}`}>{p.priority}</span>
                                            </td>
                                            <td class="table-sticky-left-100 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 py-4 px-4 text-sm font-medium text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800 align-top">{p.code}</td>
                                            <td class="py-4 px-4 text-sm text-slate-700 dark:text-slate-300 font-medium align-top">{p.name}</td>
                                            <td class="py-4 px-4 text-sm text-slate-500 dark:text-slate-400 align-top whitespace-normal">{p.content}</td>
                                            <td class="py-4 px-4 text-sm text-slate-600 dark:text-slate-400 align-top">{p.dept}</td>
                                            <td class="py-4 px-4 text-sm text-slate-600 dark:text-slate-400 align-top">{p.type}</td>
                                            <td class="py-4 px-4 align-top">
                                                <span class={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusStyle(p.statusIng)}`}>{p.statusIng}</span>
                                            </td>
                                            <td class="py-4 px-4 align-top">
                                                <span class={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusStyle(p.statusGen)}`}>{p.statusGen}</span>
                                            </td>
                                            <td class="py-4 px-4 text-sm text-slate-600 dark:text-slate-400 align-top">Pendiente revisión</td>
                                            <td class="py-4 px-4 text-sm text-slate-600 dark:text-slate-400 text-right font-mono align-top">{p.toby}</td>
                                            <td class="py-4 px-4 text-sm text-slate-600 dark:text-slate-400 text-right font-mono align-top">{p.admvo}</td>
                                            <td class="py-4 px-4 text-sm text-slate-900 dark:text-white text-right font-bold font-mono align-top">{p.total}</td>
                                            <td class="py-4 px-4 text-center align-top">
                                                {p.fileRec ? (
                                                    <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 max-w-[120px] text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                                                        <span class="material-symbols-outlined text-sm text-red-500">picture_as_pdf</span>
                                                        <span class="truncate">{p.fileRec}</span>
                                                    </div>
                                                ) : <span class="material-symbols-outlined text-gray-300 text-sm">remove</span>}
                                            </td>
                                            <td class="py-4 px-4 text-center align-top">
                                                {p.fileChanges ? (
                                                    <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 max-w-[120px] text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                                                        <span class="material-symbols-outlined text-sm text-blue-500">description</span>
                                                        <span class="truncate">{p.fileChanges}</span>
                                                    </div>
                                                ) : <span class="material-symbols-outlined text-gray-300 text-sm">remove</span>}
                                            </td>
                                            <td class="py-4 px-4 text-center align-top">
                                                {p.fileCot ? (
                                                    <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 max-w-[120px] text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                                                        <span class="material-symbols-outlined text-sm text-green-600">table_view</span>
                                                        <span class="truncate">{p.fileCot}</span>
                                                    </div>
                                                ) : <span class="material-symbols-outlined text-gray-300 text-sm">remove</span>}
                                            </td>
                                            <td class="table-sticky-right bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 py-4 px-4 text-center border-l border-slate-100 dark:border-slate-800 align-top">
                                                <button class="text-slate-400 hover:text-primary transition-colors">
                                                    <span class="material-symbols-outlined text-[20px]">edit_square</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div class="px-4 sm:px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div class="text-sm text-slate-500 dark:text-slate-400">
                                Mostrando <span class="font-medium">1</span> a <span class="font-medium">6</span> de <span class="font-medium">24</span> resultados
                            </div>
                            <div class="flex gap-2">
                                <button class="px-3 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-50">Anterior</button>
                                <button class="px-3 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">Siguiente</button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

const DetailPage = () => {
    const navigate = useNavigate();
    return (
        <div class="flex h-auto min-h-screen w-full flex-col">
            <Header
                showBack
                secondaryAction={{ label: 'Cancelar', onClick: () => navigate('/') }}
                primaryAction={{ label: 'Guardar Folio', onClick: () => navigate('/') }}
            />
            <div class="flex flex-1 justify-center py-6 sm:py-8 px-3 sm:px-6 md:px-10 lg:px-20">
                <div class="layout-content-container flex flex-col w-full max-w-[1200px]">
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-800 mb-8">
                        <div class="flex flex-col gap-1">
                            <h1 class="text-slate-900 dark:text-white text-2xl sm:text-3xl font-bold leading-tight">Detalle del Folio</h1>
                            <p class="text-slate-500 dark:text-slate-400 text-sm">Registro de nuevo proyecto y anexos gubernamentales.</p>
                        </div>
                        <div class="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium border border-red-100 dark:border-red-900/30">
                            <span class="material-symbols-outlined text-lg">info</span>
                            Todos los campos marcados con * son obligatorios
                        </div>
                    </div>

                    <form class="flex flex-col gap-8" onSubmit={(e) => { e.preventDefault(); navigate('/'); }}>

                        {/* Sección 1 — Información General */}
                        <div class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary">description</span>
                                <h3 class="text-slate-900 dark:text-white text-lg font-bold">Información General</h3>
                            </div>
                            <div class="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <label class="flex flex-col gap-1.5">
                                    <span class="text-slate-900 dark:text-slate-100 text-sm font-medium">Fecha *</span>
                                    <input class="form-input w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-primary focus:ring-primary h-11 px-3 text-sm shadow-sm" required type="date" defaultValue="2023-10-27" />
                                </label>
                                <label class="flex flex-col gap-1.5">
                                    <span class="text-slate-900 dark:text-slate-100 text-sm font-medium">Por donde llega *</span>
                                    <input class="form-input w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-primary focus:ring-primary h-11 px-3 text-sm shadow-sm" placeholder="Ingrese medio de recepción" type="text" />
                                </label>
                                <label class="flex flex-col gap-1.5">
                                    <span class="text-slate-900 dark:text-slate-100 text-sm font-medium"># Anexo *</span>
                                    <input class="form-input w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-primary focus:ring-primary h-11 px-3 text-sm shadow-sm" placeholder="Ej. ANX-2023-001" type="text" />
                                </label>
                                <label class="flex flex-col gap-1.5 md:col-span-2">
                                    <span class="text-slate-900 dark:text-slate-100 text-sm font-medium">Nombre del anexo *</span>
                                    <input class="form-input w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-primary focus:ring-primary h-11 px-3 text-sm shadow-sm" placeholder="Ingrese el nombre descriptivo del anexo" type="text" />
                                </label>
                                <label class="flex flex-col gap-1.5">
                                    <span class="text-slate-900 dark:text-slate-100 text-sm font-medium">Dependencia *</span>
                                    <input class="form-input w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-primary focus:ring-primary h-11 px-3 text-sm shadow-sm" placeholder="Ej. Secretaría de Obras" type="text" />
                                </label>
                                <label class="flex flex-col gap-1.5 md:col-span-3">
                                    <span class="text-slate-900 dark:text-slate-100 text-sm font-medium">Contenido del anexo *</span>
                                    <textarea class="form-textarea w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-primary focus:ring-primary p-3 text-sm shadow-sm resize-none" placeholder="Descripción breve del contenido..." rows="2"></textarea>
                                </label>
                                <label class="flex flex-col gap-1.5">
                                    <span class="text-slate-900 dark:text-slate-100 text-sm font-medium">Tipo de proyecto *</span>
                                    <select class="form-select w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-primary focus:ring-primary h-11 px-3 text-sm shadow-sm">
                                        <option disabled value="">Seleccione tipo</option>
                                        <option>Proyecto</option>
                                        <option>Cotización</option>
                                        <option>Re-Cot</option>
                                        <option>Anexo</option>
                                        <option>Cot-Especial</option>
                                    </select>
                                </label>
                                <label class="flex flex-col gap-1.5">
                                    <span class="text-slate-900 dark:text-slate-100 text-sm font-medium">Prioridad *</span>
                                    <div class="flex gap-2 h-11 items-center flex-wrap">
                                        <label class="cursor-pointer"><input class="peer sr-only" name="priority" type="radio" value="high" /><span class="px-3 py-1.5 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-500 peer-checked:bg-red-100 peer-checked:text-red-700 peer-checked:border-red-200 transition-all">High</span></label>
                                        <label class="cursor-pointer"><input defaultChecked class="peer sr-only" name="priority" type="radio" value="medium" /><span class="px-3 py-1.5 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-500 peer-checked:bg-yellow-100 peer-checked:text-yellow-700 peer-checked:border-yellow-200 transition-all">Medium</span></label>
                                        <label class="cursor-pointer"><input class="peer sr-only" name="priority" type="radio" value="low" /><span class="px-3 py-1.5 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-500 peer-checked:bg-green-100 peer-checked:text-green-700 peer-checked:border-green-200 transition-all">Low</span></label>
                                    </div>
                                </label>
                                <label class="flex flex-col gap-1.5">
                                    <span class="text-slate-900 dark:text-slate-100 text-sm font-medium">Responsable Anexo *</span>
                                    <div class="relative">
                                        <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500"><span class="material-symbols-outlined text-[20px]">person</span></span>
                                        <input class="form-input w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-primary focus:ring-primary h-11 pl-10 pr-3 text-sm shadow-sm" placeholder="Nombre completo" type="text" />
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Sección 2 — Estado y Seguimiento */}
                        <div class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary">engineering</span>
                                <h3 class="text-slate-900 dark:text-white text-lg font-bold">Estado y Seguimiento</h3>
                            </div>
                            <div class="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <label class="flex flex-col gap-1.5">
                                    <span class="text-slate-900 dark:text-slate-100 text-sm font-medium">Status Ingeniería *</span>
                                    <select class="form-select w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-primary focus:ring-primary h-11 px-3 text-sm shadow-sm">
                                        <option>Listo cambios</option>
                                        <option>Listo cot</option>
                                        <option>Pendiente</option>
                                    </select>
                                </label>
                                <label class="flex flex-col gap-1.5">
                                    <span class="text-slate-900 dark:text-slate-100 text-sm font-medium">Status General *</span>
                                    <select class="form-select w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-primary focus:ring-primary h-11 px-3 text-sm shadow-sm">
                                        <option>Enviado</option>
                                        <option>Pendiente</option>
                                        <option>En espera de gob</option>
                                    </select>
                                </label>
                                <label class="flex flex-col gap-1.5">
                                    <span class="text-slate-900 dark:text-slate-100 text-sm font-medium">Status Jaime *</span>
                                    <input class="form-input w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-primary focus:ring-primary h-11 px-3 text-sm shadow-sm" placeholder="Ingrese estado" type="text" />
                                </label>
                                <label class="flex flex-col gap-1.5">
                                    <span class="text-slate-900 dark:text-slate-100 text-sm font-medium">Fecha envió a gob *</span>
                                    <input class="form-input w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-primary focus:ring-primary h-11 px-3 text-sm shadow-sm" type="date" />
                                </label>
                                <label class="flex flex-col gap-1.5 md:col-span-2">
                                    <span class="text-slate-900 dark:text-slate-100 text-sm font-medium">Observaciones del anexo *</span>
                                    <textarea class="form-textarea w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-primary focus:ring-primary p-3 text-sm shadow-sm resize-none" placeholder="Comentarios relevantes sobre el estado del proyecto..." rows="3"></textarea>
                                </label>
                                <div class="flex flex-col gap-4 md:col-span-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-100 dark:border-slate-800">
                                    <div class="flex items-center justify-between">
                                        <span class="text-slate-900 dark:text-slate-100 text-sm font-medium">Transcripción de Word *</span>
                                        <label class="relative inline-flex items-center cursor-pointer">
                                            <input class="sr-only peer" type="checkbox" value="" />
                                            <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                        </label>
                                    </div>
                                    <div class="flex items-center justify-between">
                                        <span class="text-slate-900 dark:text-slate-100 text-sm font-medium">Requiere cotización? *</span>
                                        <label class="relative inline-flex items-center cursor-pointer">
                                            <input defaultChecked class="sr-only peer" type="checkbox" value="" />
                                            <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sección 3 — Finanzas y Administración */}
                        <div class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary">payments</span>
                                <h3 class="text-slate-900 dark:text-white text-lg font-bold">Finanzas y Administración</h3>
                            </div>
                            <div class="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <label class="flex flex-col gap-1.5">
                                    <span class="text-slate-900 dark:text-slate-100 text-sm font-medium"># Cotización *</span>
                                    <input class="form-input w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-primary focus:ring-primary h-11 px-3 text-sm shadow-sm" placeholder="COT-001" type="text" />
                                </label>
                                <label class="flex flex-col gap-1.5">
                                    <span class="text-slate-900 dark:text-slate-100 text-sm font-medium">Responsable cotización *</span>
                                    <input class="form-input w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-primary focus:ring-primary h-11 px-3 text-sm shadow-sm" placeholder="Nombre" type="text" />
                                </label>
                                <label class="flex flex-col gap-1.5">
                                    <span class="text-slate-900 dark:text-slate-100 text-sm font-medium">Quien puso techo *</span>
                                    <input class="form-input w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-primary focus:ring-primary h-11 px-3 text-sm shadow-sm" placeholder="Nombre" type="text" />
                                </label>
                                <label class="flex flex-col gap-1.5">
                                    <span class="text-slate-900 dark:text-slate-100 text-sm font-medium">Equipo *</span>
                                    <input class="form-input w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-primary focus:ring-primary h-11 px-3 text-sm shadow-sm" placeholder="Asignación de equipo" type="text" />
                                </label>
                                <div class="col-span-1 md:col-span-2 lg:col-span-4 border-t border-slate-100 dark:border-slate-800 my-2"></div>
                                {[
                                    { label: 'Techo S/IVA *' },
                                    { label: 'Techo *' },
                                    { label: 'Suma *' },
                                ].map((f, i) => (
                                    <label key={i} class="flex flex-col gap-1.5">
                                        <span class="text-slate-900 dark:text-slate-100 text-sm font-medium">{f.label}</span>
                                        <div class="relative">
                                            <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">$</span>
                                            <input class="form-input w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-primary focus:ring-primary h-11 pl-7 pr-3 text-sm shadow-sm" placeholder="0" step="1" type="number" />
                                        </div>
                                    </label>
                                ))}
                                <div class="hidden lg:block"></div>
                                <label class="flex flex-col gap-1.5">
                                    <span class="text-slate-900 dark:text-slate-100 text-sm font-medium">Toby *</span>
                                    <div class="relative">
                                        <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">$</span>
                                        <input class="form-input w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-primary focus:ring-primary h-11 pl-7 pr-3 text-sm shadow-sm" placeholder="0" step="1" type="number" />
                                    </div>
                                </label>
                                <label class="flex flex-col gap-1.5">
                                    <span class="text-slate-900 dark:text-slate-100 text-sm font-medium">ADMVO *</span>
                                    <div class="relative">
                                        <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">$</span>
                                        <input class="form-input w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-primary focus:ring-primary h-11 pl-7 pr-3 text-sm shadow-sm" placeholder="0" step="1" type="number" />
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Sección 4 — Documentos y Archivos */}
                        <div class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary">folder_open</span>
                                <h3 class="text-slate-900 dark:text-white text-lg font-bold">Documentos y Archivos</h3>
                            </div>
                            <div class="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { label: 'Archivo recibido', icon: 'upload_file',   formats: 'PDF, DOC, IMG' },
                                    { label: 'Cambios',          icon: 'difference',     formats: 'PDF, DOC, IMG' },
                                    { label: 'Cotización',       icon: 'request_quote',  formats: 'PDF, XLS, CSV' }
                                ].map((box, i) => (
                                    <div key={i} class="flex flex-col gap-2">
                                        <span class="text-slate-900 dark:text-slate-100 text-sm font-medium">{box.label}</span>
                                        <label class="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-primary dark:hover:border-primary transition-all">
                                            <div class="flex flex-col items-center justify-center pt-5 pb-6">
                                                <span class="material-symbols-outlined text-4xl text-slate-400 mb-2">{box.icon}</span>
                                                <p class="mb-1 text-sm text-slate-500 dark:text-slate-400 font-medium text-center px-4">Arrastra o selecciona un archivo</p>
                                                <p class="text-xs text-slate-400 dark:text-slate-500">{box.formats}</p>
                                            </div>
                                            <input class="hidden" type="file" />
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Botones móvil */}
                        <div class="sm:hidden flex gap-3 pt-4 pb-12">
                            <button onClick={() => navigate('/')} type="button" class="flex-1 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-base font-bold">Cancelar</button>
                            <button type="submit" class="flex-1 h-12 rounded-lg bg-primary text-white text-base font-bold shadow-md">Guardar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const App = () => {
    return (
        <MemoryRouter initialEntries={['/']}>
            <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/detail" element={<DetailPage />} />
            </Routes>
        </MemoryRouter>
    );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);
