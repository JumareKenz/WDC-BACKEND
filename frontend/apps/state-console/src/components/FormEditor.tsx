'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useFormatMessage } from '@wdc/i18n';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { mockForms, mockFormFields, type FormField } from '../lib/mock-data-tables';

function SortableFieldItem({
  field,
  selected,
  onClick,
}: {
  field: FormField;
  selected: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
        selected
          ? 'bg-[#E6F2EC] border-[#1A7A4A] text-[#1A7A4A]'
          : 'bg-white border-[#E8E3DB] hover:bg-[#F9F7F4]'
      }`}
    >
      <span
        {...attributes}
        {...listeners}
        className="text-[#999] cursor-grab active:cursor-grabbing select-none px-1"
        title="Drag to reorder"
      >
        ⋮⋮
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{field.label}</p>
        <p className="text-[10px] text-[#999] truncate">{field.labelHa}</p>
      </div>
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F3EFE9] text-[#555550] uppercase">
        {field.type}
      </span>
      {field.required && <span className="text-[#C0392B] text-xs">*</span>}
    </div>
  );
}

export function FormEditor({ formId }: { formId: string }) {
  const t = useFormatMessage();
  const form = mockForms.find((f) => f.id === formId);

  const initialFields = formId === 'new' ? [] : (mockFormFields[formId] ?? []);
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [selectedId, setSelectedId] = useState<string | null>(initialFields[0]?.id ?? null);
  const [saved, setSaved] = useState(false);

  const selectedField = fields.find((f) => f.id === selectedId) ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const updateField = (patch: Partial<FormField>) => {
    if (!selectedId) return;
    setFields((prev) => prev.map((f) => (f.id === selectedId ? { ...f, ...patch } : f)));
  };

  const addField = () => {
    const newField: FormField = {
      id: `fld-${Date.now()}`,
      label: 'New Field',
      labelHa: 'Sabuwar Fil',
      type: 'text',
      required: false,
    };
    setFields((prev) => [...prev, newField]);
    setSelectedId(newField.id);
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <a href="/forms" className="text-sm text-[#1A7A4A] hover:underline">
                  {t('forms.title' as any)}
                </a>
                <span className="text-[#999]">›</span>
                <span className="text-sm font-semibold text-[#2B2B2B]">
                  {form?.title ?? t('forms.newForm' as any)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {saved && (
                  <span className="text-sm text-[#1A7A4A] font-medium">Saved</span>
                )}
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-[#F3EFE9] text-[#2B2B2B] text-sm font-semibold rounded-xl border border-[#E8E3DB] hover:bg-[#E8E3DB] transition-colors"
                >
                  {t('formBuilder.save' as any)}
                </button>
                <button className="px-4 py-2 bg-[#1A7A4A] text-white text-sm font-semibold rounded-xl hover:bg-[#135A37] transition-colors">
                  {t('formBuilder.deploy' as any)}
                </button>
              </div>
            </div>

            {/* Three-pane editor */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
              {/* Left — Field list */}
              <div className="lg:col-span-3 bg-white rounded-2xl border border-[#E8E3DB] p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-[#2B2B2B]">{t('formBuilder.fields' as any)}</h3>
                  <button
                    onClick={addField}
                    className="text-xs px-2.5 py-1.5 bg-[#1A7A4A] text-white rounded-lg hover:bg-[#135A37] transition-colors"
                  >
                    + {t('formBuilder.addField' as any)}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                      {fields.map((field) => (
                        <div key={field.id} className="relative group">
                          <SortableFieldItem
                            field={field}
                            selected={selectedId === field.id}
                            onClick={() => setSelectedId(field.id)}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeField(field.id);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-[#C0392B] text-xs hover:bg-[#F7E0DD] rounded px-1.5 py-0.5 transition-opacity"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </SortableContext>
                  </DndContext>
                  {fields.length === 0 && (
                    <p className="text-sm text-[#999] text-center py-8">{t('forms.listEmpty' as any)}</p>
                  )}
                </div>
              </div>

              {/* Middle — Properties */}
              <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E8E3DB] p-4">
                <h3 className="text-sm font-bold text-[#2B2B2B] mb-4">{t('formBuilder.properties' as any)}</h3>
                {selectedField ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-[#555550] mb-1.5">
                        {t('formBuilder.fieldLabel' as any)}
                      </label>
                      <input
                        type="text"
                        value={selectedField.label}
                        onChange={(e) => updateField({ label: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F3EFE9] border border-[#E8E3DB] rounded-xl text-sm text-[#2B2B2B] focus:outline-none focus:ring-2 focus:ring-[#1A7A4A]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#555550] mb-1.5">
                        {t('formBuilder.fieldLabelHa' as any)}
                      </label>
                      <input
                        type="text"
                        value={selectedField.labelHa}
                        onChange={(e) => updateField({ labelHa: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F3EFE9] border border-[#E8E3DB] rounded-xl text-sm text-[#2B2B2B] focus:outline-none focus:ring-2 focus:ring-[#1A7A4A]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#555550] mb-1.5">
                        {t('formBuilder.fieldType' as any)}
                      </label>
                      <select
                        value={selectedField.type}
                        onChange={(e) => updateField({ type: e.target.value as FormField['type'] })}
                        className="w-full px-3 py-2 bg-[#F3EFE9] border border-[#E8E3DB] rounded-xl text-sm text-[#2B2B2B] focus:outline-none focus:ring-2 focus:ring-[#1A7A4A]"
                      >
                        {(['text', 'number', 'date', 'select', 'checkbox', 'textarea'] as const).map((ft) => (
                          <option key={ft} value={ft}>
                            {t(`formBuilder.${ft}` as any)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="required"
                        checked={selectedField.required}
                        onChange={(e) => updateField({ required: e.target.checked })}
                        className="w-4 h-4 accent-[#1A7A4A]"
                      />
                      <label htmlFor="required" className="text-sm text-[#2B2B2B]">
                        {t('formBuilder.fieldRequired' as any)}
                      </label>
                    </div>
                    {selectedField.type === 'select' && (
                      <div>
                        <label className="block text-xs font-medium text-[#555550] mb-1.5">Options (comma-separated)</label>
                        <input
                          type="text"
                          value={selectedField.options?.join(', ') ?? ''}
                          onChange={(e) => updateField({ options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                          className="w-full px-3 py-2 bg-[#F3EFE9] border border-[#E8E3DB] rounded-xl text-sm text-[#2B2B2B] focus:outline-none focus:ring-2 focus:ring-[#1A7A4A]"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[#999] text-center py-12">Select a field to edit properties</p>
                )}
              </div>

              {/* Right — Preview */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E8E3DB] p-4 flex flex-col">
                <h3 className="text-sm font-bold text-[#2B2B2B] mb-4">{t('formBuilder.preview' as any)}</h3>
                <div className="flex-1 overflow-y-auto space-y-4">
                  {fields.length === 0 ? (
                    <p className="text-sm text-[#999] text-center py-12">No fields to preview</p>
                  ) : (
                    fields.map((field) => (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-[#2B2B2B] mb-1">
                          {field.label}
                          {field.required && <span className="text-[#C0392B] ml-0.5">*</span>}
                        </label>
                        <p className="text-xs text-[#999] mb-1.5">{field.labelHa}</p>
                        {field.type === 'text' && (
                          <input type="text" disabled className="w-full px-3 py-2 bg-[#F3EFE9] border border-[#E8E3DB] rounded-xl text-sm text-[#999]" placeholder="..." />
                        )}
                        {field.type === 'number' && (
                          <input type="number" disabled className="w-full px-3 py-2 bg-[#F3EFE9] border border-[#E8E3DB] rounded-xl text-sm text-[#999]" placeholder="0" />
                        )}
                        {field.type === 'date' && (
                          <input type="date" disabled className="w-full px-3 py-2 bg-[#F3EFE9] border border-[#E8E3DB] rounded-xl text-sm text-[#999]" />
                        )}
                        {field.type === 'select' && (
                          <select disabled className="w-full px-3 py-2 bg-[#F3EFE9] border border-[#E8E3DB] rounded-xl text-sm text-[#999]">
                            <option>—</option>
                            {field.options?.map((opt) => (
                              <option key={opt}>{opt}</option>
                            ))}
                          </select>
                        )}
                        {field.type === 'checkbox' && (
                          <div className="flex items-center gap-2">
                            <input type="checkbox" disabled className="w-4 h-4 accent-[#1A7A4A]" />
                            <span className="text-sm text-[#555550]">Yes</span>
                          </div>
                        )}
                        {field.type === 'textarea' && (
                          <textarea disabled rows={3} className="w-full px-3 py-2 bg-[#F3EFE9] border border-[#E8E3DB] rounded-xl text-sm text-[#999] resize-none" placeholder="..." />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
