import { useState, useEffect } from 'react';
import { Save, Package, X } from 'lucide-react';
import * as itAPI from '../api/itService';
import SearchableSelectWithAdd from './SearchableSelectWithAdd';

export default function OrderForm({ initialData, onSuccess }) {
    const isEdit = !!initialData;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Master Data Options
    const [styles, setStyles] = useState([]);
    const [ageGroups, setAgeGroups] = useState([]);
    const [categories, setCategories] = useState([]);
    const [sizeCategories, setSizeCategories] = useState([]);
    const [colors, setColors] = useState([]);

    // Add Modal State
    // type: 'style', 'color', 'age_group', 'category', 'size_category', 'size_category_edit'
    const [modalConfig, setModalConfig] = useState(null);

    // Init Logic
    useEffect(() => {
        loadMasters();
    }, []);

    const loadMasters = async () => {
        try {
            const [sts, ages, cats, sizeCats] = await Promise.all([
                itAPI.getStyles(),
                itAPI.getAgeGroups(),
                itAPI.getCategories(),
                itAPI.getSizeCategories()
            ]);
            setStyles(sts || []);
            setAgeGroups(ages || []);
            setCategories(cats || []);
            setSizeCategories(sizeCats || []);
        } catch (err) {
            console.error(err);
        }
    };

    const [formData, setFormData] = useState({
        buyer: initialData?.buyer || '',
        brand: initialData?.brand || '',
        season: initialData?.season || '',
        oc: initialData?.oc || '',
        style_id: initialData?.style_id || '',
        po: initialData?.po || '',
        country: initialData?.country || '',
        age_group: initialData?.age_group || 0,
        category: initialData?.category || 0,
        size_category: initialData?.size_category || 0,
        order_quantity: initialData?.order_quantity || 0,
        colour_code: initialData?.colour_code || 0,
        quantities: initialData?.quantities || {} // Dynamic
    });

    // Populate colors of existing style if editing
    useEffect(() => {
        if (isEdit && initialData.style_id) {
            loadColors(initialData.style_id);
        }
    }, [isEdit]);

    // Handle Style Change -> Set Brand
    useEffect(() => {
        const style = styles.find(s => s.style_id === formData.style_id);
        if (style) {
            if (style.brand) setFormData(prev => ({ ...prev, brand: style.brand }));
            loadColors(style.style_id);
            setFormData(prev => ({ ...prev, colour_code: 0 }));
        } else {
            setColors([]);
        }
    }, [formData.style_id, styles]);

    const loadColors = async (styleId) => {
        try {
            const cols = await itAPI.getColors(styleId);
            setColors(cols || []);
        } catch (e) { console.error(e); }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleMasterChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Calculate Active Sizes based on Size Category
    const activeSizeCat = sizeCategories.find(c => c.size_category_id == formData.size_category);
    const activeSizes = activeSizeCat && activeSizeCat.sizes
        ? activeSizeCat.sizes.split(',').map(s => s.trim().toLowerCase())
        : [];

    const handleQtyChange = (e) => {
        const { name, value } = e.target;
        const qty = parseInt(value) || 0;

        setFormData(prev => {
            const newQuantities = { ...prev.quantities, [name]: qty };
            const total = Object.values(newQuantities).reduce((a, b) => a + b, 0);
            return {
                ...prev,
                quantities: newQuantities,
                order_quantity: total
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (isEdit) {
                await itAPI.updateOrder(initialData.order_id, formData);
                setSuccessMsg('Order successfully updated!');
            } else {
                await itAPI.createOrder(formData);
                setSuccessMsg('Order successfully created!');
                // Reset form
                setFormData({
                    buyer: '', brand: '', season: '', oc: '', style_id: '', po: '', country: '',
                    age_group: 0, category: 0, size_category: 0, order_quantity: 0, colour_code: 0,
                    quantities: {}
                });
            }
            if (onSuccess) {
                // Delay success message or let caller handle navigation
                setTimeout(() => onSuccess(), 1500);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to process order');
        } finally {
            setLoading(false);
        }
    };

    // --- Modal Logic ---
    const handleAddClick = (type) => {
        setModalConfig({ type });
    };

    const handleEditClick = (type) => {
        // Only specific types support edit for now
        if (type === 'size_category') {
            if (!formData.size_category) return;
            // Ensure we pass current data to modal via activeSizeCat lookups or similar
            setModalConfig({ type: 'size_category_edit' });
        }
    };

    const handleModalClose = () => {
        setModalConfig(null);
    };

    const handleModalSubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const type = modalConfig.type;

        try {
            if (type === 'age_group') {
                const res = await itAPI.createAgeGroup(fd.get('name'), fd.get('age'));
                setAgeGroups([...ageGroups, res]);
                handleMasterChange('age_group', res.age_group_id);
            } else if (type === 'category') {
                const res = await itAPI.createCategory(fd.get('name'));
                setCategories([...categories, res]);
                handleMasterChange('category', res.category_id);
            } else if (type === 'size_category') {
                const res = await itAPI.createSizeCategory(fd.get('name'), fd.get('sizes'));
                setSizeCategories([...sizeCategories, res]);
                handleMasterChange('size_category', res.size_category_id);
            } else if (type === 'size_category_edit') {
                // UPDATE logic
                const res = await itAPI.appendSizesToCategory(formData.size_category, fd.get('sizes'));
                // Update local state
                setSizeCategories(prev => prev.map(c => c.size_category_id === res.size_category_id ? res : c));
                // No change to form selection, but grid should update automatically because activeSizes derives from state
            } else if (type === 'style') {
                const res = await itAPI.createStyle(fd.get('id'), fd.get('name'), fd.get('brand'));
                setStyles([...styles, res]);
                handleMasterChange('style_id', res.style_id);
            } else if (type === 'color') {
                if (!formData.style_id) {
                    alert("Please select a Style first");
                    return;
                }
                const res = await itAPI.createColor(formData.style_id, fd.get('name'), fd.get('code'));
                setColors([...colors, res]);
                handleMasterChange('colour_code', res.color_code);
            }
            handleModalClose();
        } catch (err) {
            alert(err.response?.data?.message || err.message);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto border border-gray-100">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-gray-800">
                <Package className="text-blue-600" /> {isEdit ? `Update Production Order: ${initialData.po}` : 'Create Buyer Order'}
            </h2>

            {error && <div className="bg-red-50 text-red-600 p-4 rounded mb-4">{error}</div>}
            {successMsg && <div className="bg-green-50 text-green-600 p-4 rounded mb-4">{successMsg}</div>}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Section 1: Main Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {['Buyer', 'Brand', 'Season'].map(lbl => (
                        <div key={lbl} className="space-y-1">
                            <label className="text-xs font-semibold uppercase text-gray-500">{lbl}</label>
                            <input
                                name={lbl.toLowerCase()}
                                required={['Buyer', 'Brand'].includes(lbl)}
                                value={formData[lbl.toLowerCase()]}
                                onChange={handleChange}
                                className="w-full p-2 border rounded"
                            />
                        </div>
                    ))}

                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-gray-500">OC Number</label>
                        <input name="oc" value={formData.oc} onChange={handleChange} className="w-full p-2 border rounded" placeholder="OC-1001" />
                    </div>

                    <SearchableSelectWithAdd
                        label="Style Ref (Inc Brand)"
                        value={formData.style_id}
                        onChange={(v) => handleMasterChange('style_id', v)}
                        onAdd={() => handleAddClick('style')}
                        options={styles.map(x => ({ id: x.style_id, label: `${x.style_id} - ${x.style_name}` }))}
                        placeholder="Select Style..."
                    />

                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-gray-500">PO Number</label>
                        <input name="po" required value={formData.po} onChange={handleChange} className="w-full p-2 border rounded" placeholder="PO-9999" />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-gray-500">Country</label>
                        <input name="country" value={formData.country} onChange={handleChange} className="w-full p-2 border rounded" placeholder="USA" />
                    </div>

                    <SearchableSelectWithAdd
                        label="Age Group"
                        value={formData.age_group}
                        onChange={(v) => handleMasterChange('age_group', v)}
                        onAdd={() => handleAddClick('age_group')}
                        options={ageGroups.map(x => ({ id: x.age_group_id, label: `${x.age_group_name} (${x.age || 'N/A'})` }))}
                    />

                    <SearchableSelectWithAdd
                        label="Category"
                        value={formData.category}
                        onChange={(v) => handleMasterChange('category', v)}
                        onAdd={() => handleAddClick('category')}
                        options={categories.map(x => ({ id: x.category_id, label: x.category_name }))}
                    />

                    <SearchableSelectWithAdd
                        label="Size Category"
                        value={formData.size_category}
                        onChange={(v) => handleMasterChange('size_category', v)}
                        onAdd={() => handleAddClick('size_category')}
                        onEdit={() => handleEditClick('size_category')}
                        options={sizeCategories.map(x => ({ id: x.size_category_id, label: x.size_category_name }))}
                    />

                    <SearchableSelectWithAdd
                        label="Color"
                        placeholder={formData.style_id ? "Select Color..." : "Select Style First"}
                        value={formData.colour_code}
                        onChange={(v) => handleMasterChange('colour_code', v)}
                        onAdd={() => handleAddClick('color')}
                        disabled={!formData.style_id}
                        options={colors.map(x => ({ id: x.color_code, label: `${x.color_name} (${x.color_code})` }))}
                    />

                </div>

                {/* Section 2: Size Breakdown */}
                <div className="border-t pt-6">
                    <h3 className="text-sm font-bold text-gray-700 mb-4">
                        Size Breakdown (Total Qty: {formData.order_quantity})
                        {formData.size_category > 0 && activeSizes.length === 0 && <span className="text-red-500 ml-2">No sizes found for this category!</span>}
                    </h3>

                    {formData.size_category == 0 ? (
                        <div className="text-gray-400 italic">Please select a Size Category first</div>
                    ) : (
                        <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
                            {activeSizes.map(size => (
                                <div key={size} className="space-y-1">
                                    <label className="text-xs font-semibold uppercase text-gray-500 block text-center">{size}</label>
                                    <input
                                        type="number"
                                        name={size}
                                        min="0"
                                        value={formData.quantities[size] || 0}
                                        onChange={handleQtyChange}
                                        className="w-full p-2 border rounded text-center font-mono"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Submit Action */}
                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 shadow-lg disabled:opacity-50"
                    >
                        <Save size={20} />
                        {loading ? 'Processing Transaction...' : isEdit ? 'Commit Order Changes' : 'Create Production Order'}
                    </button>
                </div>
            </form>

            {/* Modal for Inline Add */}
            {modalConfig && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold capitalize">
                                {modalConfig.type === 'size_category_edit' ? 'Edit Sizes' : `Add ${modalConfig.type.replace('_', ' ')}`}
                            </h3>
                            <button onClick={handleModalClose}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleModalSubmit} className="space-y-4">

                            {/* ... (Existing fields for Add) ... */}
                            {modalConfig.type === 'style' && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-600">Style ID (Ref)</label>
                                        <input required name="id" className="w-full border p-2 rounded" placeholder="ST-202X" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-600">Style Name</label>
                                        <input required name="name" className="w-full border p-2 rounded" placeholder="Winter Jacket" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-600">Brand</label>
                                        <input required name="brand" className="w-full border p-2 rounded" placeholder="Gucci" />
                                    </div>
                                </>
                            )}

                            {modalConfig.type === 'color' && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-600">Color Name</label>
                                        <input required name="name" className="w-full border p-2 rounded" placeholder="Navy Blue" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-600">Color Code (Optional)</label>
                                        <input name="code" className="w-full border p-2 rounded" placeholder="Auto-generated if empty" />
                                    </div>
                                </>
                            )}

                            {modalConfig.type === 'age_group' && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-600">Name</label>
                                        <input required name="name" className="w-full border p-2 rounded" placeholder="KIDS" autoFocus />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-600">Age Range</label>
                                        <input required name="age" className="w-full border p-2 rounded" placeholder="0-14" />
                                    </div>
                                </>
                            )}

                            {modalConfig.type === 'size_category' && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-600">Name</label>
                                        <input required name="name" className="w-full border p-2 rounded" placeholder="CAT-X" autoFocus />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-600">Sizes (CSV)</label>
                                        <input required name="sizes" className="w-full border p-2 rounded" placeholder="S,M,L,XL" />
                                        <p className="text-xs text-gray-500">Comma separated. Creates columns dynamically.</p>
                                    </div>
                                </>
                            )}

                            {modalConfig.type === 'size_category_edit' && activeSizeCat && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-600">Category Name</label>
                                        <input disabled value={activeSizeCat.size_category_name} className="w-full border p-2 rounded bg-gray-100" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-600">Current Sizes</label>
                                        <div className="flex flex-wrap gap-2 p-2 bg-gray-50 border rounded">
                                            {activeSizeCat.sizes.split(',').map(s => (
                                                <span key={s} className="bg-gray-200 px-2 py-1 rounded text-xs">{s}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-600">Add New Sizes (CSV)</label>
                                        <input required name="sizes" className="w-full border p-2 rounded" placeholder="XXL, XXXL" autoFocus />
                                        <p className="text-xs text-green-600">These will be appended to existing list.</p>
                                    </div>
                                </>
                            )}

                            {['category'].includes(modalConfig.type) && (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-600">Name</label>
                                    <input required name="name" className="w-full border p-2 rounded" autoFocus />
                                </div>
                            )}

                            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700">
                                {modalConfig.type.includes('edit') ? 'Update Sizes' : 'Save & Select'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
