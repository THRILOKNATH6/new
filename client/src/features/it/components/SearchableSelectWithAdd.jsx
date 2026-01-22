import { Plus, Pencil } from 'lucide-react';

export default function SearchableSelectWithAdd({
    label,
    value,
    onChange,
    options = [],
    onAdd,
    onEdit,
    disabled = false,
    placeholder = "Select..."
}) {
    return (
        <div className="space-y-1">
            <label className="text-xs font-semibold uppercase text-gray-500">{label}</label>
            <div className="flex gap-2">
                <select
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className="flex-1 p-2 border rounded text-sm bg-white"
                >
                    <option value="">{placeholder}</option>
                    {options.map(opt => (
                        <option key={opt.id} value={opt.id}>
                            {opt.label || opt.name}
                        </option>
                    ))}
                </select>

                {onEdit && (
                    <button
                        type="button"
                        onClick={onEdit}
                        disabled={disabled || !value} // Disable edit if no value selected
                        className="p-2 bg-yellow-50 text-yellow-600 rounded border border-yellow-100 hover:bg-yellow-100 disabled:opacity-50"
                        title={`Edit ${label}`}
                    >
                        <Pencil size={18} />
                    </button>
                )}

                {onAdd && (
                    <button
                        type="button"
                        onClick={onAdd}
                        disabled={disabled}
                        className="p-2 bg-blue-50 text-blue-600 rounded border border-blue-100 hover:bg-blue-100 disabled:opacity-50"
                        title={`Add new ${label}`}
                    >
                        <Plus size={18} />
                    </button>
                )}
            </div>
        </div>
    );
}
