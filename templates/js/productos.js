const { useState, useEffect } = React;
const { createRoot } = ReactDOM;
const { MemoryRouter, Routes, Route, Link, useNavigate, useLocation } = ReactRouterDOM;

// --- Shared Components ---
const ProductPreviewModal = ({ product, onClose, categories }) => {
    if (!product) return null;

    const foundCategory = categories.find(c => c.id_category == product.category);
    const categoryName = (foundCategory && foundCategory.category) || 'Sin Categoría';
    const ums = (() => {
        try {
            const umData = typeof product.um === 'string' ? JSON.parse(product.um) : product.um;
            return Array.isArray(umData.UM) ? umData.UM.join(', ') : product.um;
        } catch(e) {
            return product.um;
        }
    })();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a202c] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
                <div className="bg-primary p-6 text-white flex justify-between items-center">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Vista Previa de Producto</p>
                        <h2 className="text-2xl font-black">{product.pn}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Marca / Modelo</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{product.marca || 'N/A'}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{product.modelo || 'Generic Model'}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Categoría</p>
                            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-primary/10 text-primary text-sm font-bold border border-primary/20">
                                {categoryName}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Stock</p>
                            <p className={`text-xl font-black ${product.stock > 0 ? 'text-accent-emerald' : 'text-accent-red'}`}>{product.stock}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">U.M</p>
                            <p className="text-xl font-bold dark:text-white uppercase">{ums}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Precio</p>
                            <p className="text-xl font-black text-primary">${product.price}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-2">Variaciones de Descripción</p>
                        <div className="space-y-4">
                            {[1, 2, 3].map(num => (
                                <div key={num} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border-l-4 border-primary">
                                    <p className="text-[10px] font-bold text-primary uppercase mb-1">Descripción {num}</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                                        {product[`description${num}`] || '---'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                
                <div className="p-6 bg-gray-50 dark:bg-gray-900/80 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition-all"
                    >
                        Cerrar Vista Previa
                    </button>
                </div>
            </div>
        </div>
    );
};

const CategoryManagerModal = ({ isOpen, onClose, categories, onRefresh }) => {
    const [editingCategory, setEditingCategory] = useState(null);
    const [categoryName, setCategoryName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (editingCategory) {
            setCategoryName(editingCategory.category);
        } else {
            setCategoryName('');
        }
    }, [editingCategory]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!categoryName.trim()) return;
        setIsSaving(true);
        try {
            const url = editingCategory ? '/api/updateCategory' : '/api/saveCategory';
            const method = editingCategory ? 'PATCH' : 'POST';
            const payload = {
                category: categoryName,
                id_category: editingCategory ? editingCategory.id_category : null
            };

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Operación Exitosa!',
                    text: `Categoría ${editingCategory ? 'actualizada' : 'guardada'} correctamente`,
                    timer: 1500,
                    showConfirmButton: false
                });
                setEditingCategory(null);
                setCategoryName('');
                onRefresh();
            } else {
                Swal.fire('Error', 'No se pudo guardar la categoría', 'error');
            }
        } catch (error) {
            Swal.fire('Error Fatal', 'Conexión fallida', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "Esta acción no se puede deshacer. Se verificará si existen productos asociados.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            reverseButtons: true
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`/api/deleteCategory/${id}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Eliminado',
                        text: 'La categoría ha sido eliminada correctamente.',
                        timer: 1500,
                        showConfirmButton: false
                    });
                    onRefresh();
                } else {
                    const data = await response.json();
                    Swal.fire('Error', data.error || 'No se pudo eliminar la categoría', 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'Conexión fallida', 'error');
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a202c] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
                <div className="bg-primary p-5 text-white flex justify-between items-center">
                    <h2 className="text-xl font-black">Gestionar Categorías</h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">
                            {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                        </label>
                        <div className="flex gap-2">
                            <input 
                                value={categoryName}
                                onChange={(e) => setCategoryName(e.target.value)}
                                className="form-input flex-1 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white h-11 px-4 text-sm"
                                placeholder="Nombre de categoría..."
                            />
                            <button 
                                onClick={handleSave}
                                disabled={isSaving || !categoryName.trim()}
                                className="bg-primary text-white px-4 rounded-lg font-bold text-sm hover:opacity-90 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined">{editingCategory ? 'check' : 'add'}</span>
                            </button>
                            {editingCategory && (
                                <button 
                                    onClick={() => setEditingCategory(null)}
                                    className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 rounded-lg font-bold text-sm"
                                >
                                    <span className="material-symbols-outlined">cancel</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Lista de Categorías</p>
                        {categories.map((cat) => (
                            <div key={cat.id_category} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 group hover:border-primary/30 transition-all">
                                <span className="text-sm font-semibold dark:text-gray-200">{cat.category}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button 
                                        onClick={() => setEditingCategory(cat)}
                                        className="p-1.5 text-gray-400 hover:text-primary transition-colors"
                                        title="Editar nombre"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(cat.id_category)}
                                        className="p-1.5 text-gray-400 hover:text-accent-red transition-colors"
                                        title="Eliminar categoría"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="p-5 bg-gray-50 dark:bg-gray-900/80 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 transition-all"
                    >
                        Cerrar Gestor
                    </button>
                </div>
            </div>
        </div>
    );
};

const Header = () => {
    const location = useLocation();
    return (
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-[#dbdfe6] dark:border-[#2d3748] bg-white dark:bg-[#1a202c] px-6 lg:px-10 py-3 sticky top-0 z-50">
            <div className="flex items-center gap-8">
                <a href="/panel" className="flex items-center gap-4 text-primary">
                    <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-md shadow-primary/20">
                        <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                    </div>
                    <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight tracking-tight">MGLAB</h2>
                </a>
                <nav className="hidden md:flex items-center gap-9">
                    <Link 
                        to="/" 
                        className={`text-sm font-semibold leading-normal pb-1 ${location.pathname === '/' ? 'text-primary border-b-2 border-primary' : 'text-[#616f89] dark:text-gray-400 hover:text-primary'}`}
                    >
                        Productos
                    </Link>
                </nav>
            </div>
            <div className="flex flex-1 justify-end gap-4 items-center">
                <div className="flex gap-2">
                    <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-gray-100 dark:bg-gray-800 text-[#111318] dark:text-white hover:bg-gray-200 transition-colors border border-transparent dark:border-gray-700">
                        <span className="material-symbols-outlined">notifications</span>
                    </button>
                    <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-gray-100 dark:bg-gray-800 text-[#111318] dark:text-white hover:bg-gray-200 transition-colors border border-transparent dark:border-gray-700">
                        <span className="material-symbols-outlined">help</span>
                    </button>
                </div>
                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 ring-2 ring-primary ring-offset-2" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBFI6PhfEfuiTsFpmK42RyXbus2WStWoWg7B185PvLZ7nrm4Q-AFzzanVkMYhLsCy1sgYX5RO_KQcPUSJQa56p35w0mL0JijGes-mqO2aXUCc6geM6-FSF--l3noEai3x2NuRjCPgZtnwYUxdTx5QCoKXBgkXBuO5B0Q6oo1oWxoUf_ggybL9hG8V06DZkztbSO5R_LO6Hz5FpDbtuFPbc6n_AbPJXAo1IfAUMixoPGMeE4ji7cFNQhHzPOqDl3s5ex38ukLYzDf80")'}}></div>
            </div>
        </header>
    );
};

const Footer = () => (
    <footer className="mt-auto border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a202c] py-6 text-center text-[#616f89] dark:text-gray-500 text-sm">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row justify-between items-center px-10 gap-4">
            <p>© MGLAB</p>
        </div>
    </footer>
);

// --- Screen Components ---

const InventoryDatabase = () => {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [previewProduct, setPreviewProduct] = useState(null);
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [showCategoryManager, setShowCategoryManager] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchProducts(1); // Reiniciar a página 1 cuando cambia búsqueda o categoría
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchTerm, selectedCategory]);

    useEffect(() => {
        fetchProducts(currentPage);
    }, [currentPage]);

    const fetchCategories = async () => {
        try {
            const response = await fetch('/api/categories');
            if (response.ok) {
                const data = await response.json();
                setCategories(data);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchProducts = async (page = 1) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: page,
                limit: 10,
                category: selectedCategory,
                search: searchTerm
            });
            const response = await fetch(`/api/getProducts?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setProducts(data.products);
                setTotalPages(data.total_pages);
                setTotalProducts(data.total);
                setCurrentPage(data.page);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-1">
            <aside className="hidden lg:flex w-64 flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a202c] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Categorías</p>
                        <button 
                            onClick={() => setShowCategoryManager(true)}
                            className="bg-primary/10 text-primary px-2 py-1 rounded text-[10px] font-black uppercase hover:bg-primary hover:text-white transition-all"
                        >
                            Gestionar
                        </button>
                    </div>
                    <nav className="space-y-1">
                        <a 
                            onClick={() => setSelectedCategory('all')}
                            className={`sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-l-lg text-sm font-semibold cursor-pointer ${selectedCategory === 'all' ? 'active' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                        >
                            <span className="material-symbols-outlined text-xl">all_inclusive</span> Todos los Productos
                        </a>
                        {categories.map((cat, idx) => (
                            <a 
                                key={idx} 
                                onClick={() => setSelectedCategory(cat.id_category)}
                                className={`sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-l-lg text-sm font-semibold cursor-pointer ${selectedCategory == cat.id_category ? 'active' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            >
                                <span className="material-symbols-outlined text-xl">category</span> {cat.category}
                            </a>
                        ))}
                    </nav>
                </div>
            </aside>
            <main className="flex-1 flex flex-col bg-[#f8fafc] dark:bg-navy-900 min-w-0">
                <div className="p-6 lg:p-8 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-extrabold text-navy-900 dark:text-white tracking-tight">Base de Datos de Inventario</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                Mostrando {products.length} de {totalProducts} productos en <span className="text-primary font-bold">
                                    {selectedCategory === 'all' ? 'Todas las Categorías' : (categories.find(c => c.id_category == selectedCategory) || {category: 'Categoría'}).category}
                                </span>
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => navigate('/upload')}
                                className="flex items-center justify-center rounded-lg h-10 px-4 bg-accent-emerald text-white font-bold text-sm hover:opacity-90 shadow-lg shadow-emerald-500/20"
                            >
                                <span className="material-symbols-outlined mr-2 text-[20px]">add</span>
                                Añadir Producto
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
                                <input 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="form-input w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-primary focus:border-primary border-transparent" 
                                    placeholder="Buscar por PN, Marca, Modelo o Descripción..." 
                                    type="text"
                                />
                            </div>
                            <div className="flex gap-2">
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[1000px]">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">PN</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Marca / Modelo</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">U.M</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Descripción</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Precio</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Precio OC</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stock</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 relative">
                                    {isLoading && (
                                        <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="material-symbols-outlined animate-spin text-primary text-3xl">sync</span>
                                                <span className="text-sm font-bold text-primary">Cargando...</span>
                                            </div>
                                        </div>
                                    )}
                                    {products.length > 0 ? products.map((item, idx) => (
                                        <tr key={idx} className="table-row">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-bold text-primary">{item.pn}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{item.marca}</span>
                                                    <span className="text-xs text-gray-500">{item.modelo}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                                    {(() => {
                                                        try {
                                                            const umData = typeof item.um === 'string' ? JSON.parse(item.um) : item.um;
                                                            return Array.isArray(umData.UM) ? umData.UM.join(', ') : item.um;
                                                        } catch(e) {
                                                            return item.um;
                                                        }
                                                    })()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button 
                                                    onClick={() => setPreviewProduct(item)}
                                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-lg transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                                                    Ver Detalles
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-bold text-gray-900 dark:text-white">${item.price}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">${item.precioOC || item.priceOC || 0}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${item.stock > 0 ? 'bg-emerald-100 dark:bg-emerald-500/10 text-accent-emerald' : 'bg-red-100 dark:bg-red-500/10 text-accent-red'}`}>
                                                    {item.stock} unidades
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => navigate('/upload', { state: { product: item } })}
                                                        className="p-1.5 text-gray-400 hover:text-primary transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">edit</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : !isLoading && (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-12 text-center text-gray-500 font-medium">
                                                No se encontraron productos coincidentes.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                                Página {currentPage} de {totalPages} ({totalProducts} productos en total)
                            </span>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1 || isLoading}
                                    className={`flex items-center justify-center size-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                                </button>
                                
                                <div className="flex items-center gap-1">
                                    {[...Array(totalPages)].map((_, i) => {
                                        const pageNum = i + 1;
                                        // Mostrar solo 5 páginas alrededor de la actual
                                        if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)) {
                                            return (
                                                <button 
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`size-9 rounded-lg text-sm font-bold transition-all ${currentPage === pageNum ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        } else if (pageNum === currentPage - 3 || pageNum === currentPage + 3) {
                                            return <span key={pageNum} className="text-gray-400">...</span>;
                                        }
                                        return null;
                                    })}
                                </div>

                                <button 
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages || isLoading}
                                    className={`flex items-center justify-center size-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <ProductPreviewModal 
                product={previewProduct} 
                onClose={() => setPreviewProduct(null)} 
                categories={categories}
            />
            <CategoryManagerModal 
                isOpen={showCategoryManager}
                onClose={() => setShowCategoryManager(false)}
                categories={categories}
                onRefresh={fetchCategories}
            />
        </div>
    );
};

const ProductUpload = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const editingProduct = location.state && location.state.product;

    const [activeTab, setActiveTab] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [categories, setCategories] = useState([]);
    const [formData, setFormData] = useState({
        original_pn: (editingProduct && editingProduct.pn) || null,
        pn: (editingProduct && editingProduct.pn) || '',
        description1: (editingProduct && editingProduct.description1) || '',
        description2: (editingProduct && editingProduct.description2) || '',
        description3: (editingProduct && editingProduct.description3) || '',
        price: (editingProduct && editingProduct.price) || 0,
        precioOC: (editingProduct && (editingProduct.precioOC || editingProduct.priceOC)) || 0,
        um: (editingProduct && (() => {
            try {
                const umData = typeof editingProduct.um === 'string' ? JSON.parse(editingProduct.um) : editingProduct.um;
                return Array.isArray(umData.UM) ? umData.UM.join(', ') : editingProduct.um;
            } catch(e) {
                return editingProduct.um;
            }
        })()) || '',
        profile: (editingProduct && editingProduct.profile) || '',
        marca: (editingProduct && editingProduct.marca) || '',
        modelo: (editingProduct && editingProduct.modelo) || '',
        category: (editingProduct && editingProduct.category) || 1,
        stock: (editingProduct && editingProduct.stock) || 0
    });

    useEffect(() => {
        fetch('/api/categories')
            .then(res => res.json())
            .then(data => setCategories(data));
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('description') && value.length > 400) return;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const url = editingProduct ? '/api/updateProduct' : '/api/saveProduct';
            const method = editingProduct ? 'PUT' : 'POST';
            
            // Asegurar que los campos numéricos sean números
            const dataToSend = {
                ...formData,
                price: parseFloat(formData.price) || 0,
                precioOC: parseFloat(formData.precioOC) || 0,
                stock: parseInt(formData.stock) || 0,
                category: formData.category ? parseInt(formData.category) : 1
            };

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend)
            });
            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: editingProduct ? '¡Actualizado!' : '¡Guardado!',
                    text: editingProduct ? 'Producto actualizado exitosamente' : 'Producto guardado exitosamente',
                    confirmButtonColor: '#135bec'
                }).then(() => {
                    navigate('/');
                });
            } else {
                const errorData = await response.json();
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorData.detail || 'Error desconocido al guardar',
                    confirmButtonColor: '#135bec'
                });
                setIsSaving(false);
            }
        } catch (error) {
            console.error('Error saving product:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error Fatal',
                text: 'Hubo un problema de conexión con el servidor',
                confirmButtonColor: '#135bec'
            });
            setIsSaving(false);
        }
    };

    const handleGenerateQR = () => {
        if (!formData.pn) {
            Swal.fire({
                icon: 'warning',
                title: 'PN Requerido',
                text: 'Por favor, ingresa un Número de Parte antes de generar el QR.',
                confirmButtonColor: '#135bec'
            });
            return;
        }

        Swal.fire({
            title: `QR para: ${formData.pn}`,
            html: `
                <div class="flex flex-col items-center gap-6 py-4">
                    <div id="qrcode-container" class="p-4 bg-white rounded-xl shadow-inner border border-gray-100 min-h-[200px] flex items-center justify-center"></div>
                    <p class="text-xs text-gray-500 font-medium italic">Cuando escanees este QR en cotizaciones, el PN se autocompletará automáticamente.</p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '<span class="flex items-center gap-2"><span class="material-symbols-outlined">download</span> Descargar</span>',
            cancelButtonText: 'Cerrar',
            confirmButtonColor: '#10b981',
            didOpen: () => {
                const container = document.getElementById('qrcode-container');
                new QRCode(container, {
                    text: formData.pn,
                    width: 200,
                    height: 200,
                    colorDark: "#111318",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
            },
            preConfirm: () => {
                const img = document.querySelector('#qrcode-container img');
                if (img) {
                    const link = document.createElement('a');
                    link.href = img.src;
                    link.download = `QR_${formData.pn}.png`;
                    link.click();
                }
                return false; // Evitar que cierre el modal si solo queremos descargar
            }
        });
    };

    return (
        <main className="flex-1 max-w-[1440px] mx-auto w-full px-6 lg:px-10 py-8">
            <div className="flex flex-wrap gap-2 pb-6">
                <Link to="/" className="text-[#616f89] dark:text-gray-400 text-sm font-medium hover:text-primary">Inventario</Link>
                <span className="text-[#616f89] text-sm font-medium">/</span>
                <span className="text-[#111318] dark:text-white text-sm font-semibold">{editingProduct ? 'Editar Producto' : 'Carga de Producto'}</span>
            </div>
            
            <div className="flex flex-wrap justify-between items-end gap-3 mb-8">
                <div className="flex flex-col gap-2">
                    <h1 className="text-[#111318] dark:text-white text-3xl font-black leading-tight tracking-[-0.033em]">{editingProduct ? 'Editar Producto' : 'Subir Nuevo Producto'}</h1>
                    <p className="text-[#616f89] dark:text-gray-400 text-base font-normal">
                        {editingProduct ? `Modificando detalles del producto ${editingProduct.pn}` : 'Añade un nuevo artículo al almacén con múltiples variaciones descriptivas.'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => navigate('/')}
                        className="flex items-center justify-center rounded-lg h-11 px-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-accent-red font-bold text-sm hover:bg-gray-50 transition-colors"
                    >
                        <span className="material-symbols-outlined mr-2">cancel</span>
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`flex items-center justify-center rounded-lg h-11 px-6 font-bold text-sm transition-all ${isSaving ? 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed opacity-70 text-white' : 'bg-accent-emerald text-white hover:opacity-90 shadow-lg shadow-emerald-500/20'}`}
                    >
                        <span className={`material-symbols-outlined mr-2 ${isSaving ? 'animate-spin' : ''}`}>
                            {isSaving ? 'sync' : 'save'}
                        </span>
                        {isSaving ? 'Procesando...' : (editingProduct ? 'Actualizar Producto' : 'Guardar Producto')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white dark:bg-[#1a202c] rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                        <h3 className="text-[#111318] dark:text-white text-xl font-bold mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">inventory</span>
                            Detalles principales
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                             <div className="flex flex-col gap-2">
                                <label className="text-[#111318] dark:text-white text-sm font-semibold">Número de Parte (PN) <span className="text-accent-red">*</span></label>
                                <input name="pn" value={formData.pn} onChange={handleChange} className="form-input w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:border-primary focus:ring-primary/20 h-12 px-4" placeholder="ej. PN-99201" type="text"/>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[#111318] dark:text-white text-sm font-semibold">Marca</label>
                                <input name="marca" value={formData.marca} onChange={handleChange} className="form-input w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:border-primary focus:ring-primary/20 h-12 px-4" placeholder="ej. HP, Dell..." type="text"/>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[#111318] dark:text-white text-sm font-semibold">Modelo</label>
                                <input name="modelo" value={formData.modelo} onChange={handleChange} className="form-input w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:border-primary focus:ring-primary/20 h-12 px-4" placeholder="ej. Latitude 5420..." type="text"/>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[#111318] dark:text-white text-sm font-semibold">Categoría</label>
                                <select name="category" value={formData.category} onChange={handleChange} className="form-select w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:border-primary focus:ring-primary/20 h-12 px-4">
                                    <option value="">Seleccionar...</option>
                                    {categories.map((cat, idx) => (
                                        <option key={idx} value={cat.id_category}>{cat.ctaegory || cat.category}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[#111318] dark:text-white text-sm font-semibold">U.M (Unidad de Medida)</label>
                                <input name="um" value={formData.um} onChange={handleChange} className="form-input w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:border-primary focus:ring-primary/20 h-12 px-4" placeholder="ej. PIEZA, CAJA..." type="text"/>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[#111318] dark:text-white text-sm font-semibold">Stock</label>
                                <input name="stock" value={formData.stock} onChange={handleChange} className="form-input w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:border-primary focus:ring-primary/20 h-12 px-4" type="number"/>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[#111318] dark:text-white text-sm font-semibold">Precio de Venta</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <input name="price" value={formData.price} onChange={handleChange} className="form-input w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:border-primary focus:ring-primary/20 h-12 pl-8 pr-4" placeholder="0.00" type="number"/>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[#111318] dark:text-white text-sm font-semibold">Precio OC (Compra)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <input name="precioOC" value={formData.precioOC} onChange={handleChange} className="form-input w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:border-primary focus:ring-primary/20 h-12 pl-8 pr-4" placeholder="0.00" type="number"/>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                            <h3 className="text-[#111318] dark:text-white text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">description</span>
                                Descripciones del Producto
                            </h3>

                            <div className="relative">
                                <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto">
                                    {[1, 2, 3].map((num) => (
                                        <button 
                                            key={num}
                                            onClick={() => setActiveTab(num)}
                                            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === num ? 'border-primary text-primary font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                                        >
                                            Descripción {num}
                                        </button>
                                    ))}
                                </div>
                                
                                <div className="space-y-2">
                                    <textarea 
                                        name={`description${activeTab}`}
                                        value={formData[`description${activeTab}`]}
                                        onChange={handleChange}
                                        maxLength={400}
                                        className="form-textarea w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:border-primary focus:ring-primary/20 min-h-[160px] p-4 text-sm" 
                                        placeholder={`Ingresa la descripción variante ${activeTab}...`}
                                    />
                                    <div className="flex justify-end">
                                        <span className={`text-[11px] font-bold ${formData[`description${activeTab}`].length >= 400 ? 'text-accent-red' : 'text-gray-400'}`}>
                                            {formData[`description${activeTab}`].length} / 400 caracteres
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg p-4 flex gap-4">
                        <span className="material-symbols-outlined text-primary">info</span>
                        <p className="text-sm text-[#4a5568] dark:text-gray-300 leading-relaxed">
                            <strong>Nota:</strong> Las múltiples descripciones permiten manejar diferentes niveles de detalle para cotizaciones o catálogos externos.
                        </p>
                    </div>
                </div>

                <div className="lg:col-span-5 space-y-8">
                    <div className="bg-gradient-to-br from-primary to-[#0e48c4] rounded-xl p-8 text-white shadow-xl shadow-primary/30 relative overflow-hidden group">
                        <div 
                            onClick={handleGenerateQR}
                            className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-40 hover:opacity-100 hover:scale-110 transition-all cursor-pointer z-20"
                            title="Haz clic para generar QR descargable"
                        >
                            <span className="material-symbols-outlined text-8xl">qr_code_2</span>
                        </div>
                        <div className="relative z-10">
                            <p className="text-sm font-medium text-white/80 uppercase tracking-widest mb-1">Previsualización de Código</p>
                            <h2 className="text-5xl font-black mb-6">{formData.pn || '---'}</h2>
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3 text-sm text-white/90">
                                    <span className="material-symbols-outlined text-sm">schedule</span>
                                    <span>Fecha: {new Date().toLocaleDateString()}</span>
                                </div>
                                {editingProduct && (
                                    <div className="flex items-center gap-3 text-sm text-white/90">
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                        <span>Modo: Edición</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
};

// --- App Component ---

const App = () => {
    return (
        <div className="relative flex min-h-screen w-full flex-col">
            <Header />
            <Routes>
                <Route path="/" element={<InventoryDatabase />} />
                <Route path="/upload" element={<ProductUpload />} />
            </Routes>
            <Footer />
        </div>
    );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
    <MemoryRouter>
        <App />
    </MemoryRouter>
);
