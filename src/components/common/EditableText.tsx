import React, { useState } from 'react';
import { Edit3, Check, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface EditableTextProps {
  textKey: string;
  defaultText: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'span' | 'p' | 'div';
}

/**
 * Requirement 12:
 * When App Moderator's ID is selected, displays an edit icon next to all texts/titles
 * allowing the App Moderator to click and rename/edit any text.
 * For regular users and other moderators, the edit icon is completely hidden.
 */
export const EditableText: React.FC<EditableTextProps> = ({
  textKey,
  defaultText,
  className = '',
  as: Component = 'span',
}) => {
  const { currentUser, isGuestMode, config, updateConfig, triggerSuccess } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const currentText = (config.customTexts && config.customTexts[textKey]) || defaultText;
  const [val, setVal] = useState(currentText);

  const isAppMod = !isGuestMode && currentUser?.role === 'APP_MODERATOR';

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!val.trim()) return;
    updateConfig({
      customTexts: {
        ...(config.customTexts || {}),
        [textKey]: val.trim(),
      },
    });
    setIsEditing(false);
    triggerSuccess('টেক্সট সফলভাবে হালনাগাদ ও সংরক্ষিত হয়েছে!');
  };

  const handleCancel = () => {
    setVal(currentText);
    setIsEditing(false);
  };

  if (isEditing && isAppMod) {
    return (
      <span className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-amber-500/80 shadow-lg z-20">
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          autoFocus
          className="bg-slate-950 text-ink text-xs px-2 py-1 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400"
        />
        <button
          type="button"
          onClick={() => handleSave()}
          title="সংরক্ষণ করুন"
          className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleCancel}
          title="বাতিল"
          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </span>
    );
  }

  return (
    <Component className={`inline-flex items-center gap-1.5 group/edit relative ${className}`}>
      <span>{currentText}</span>
      {isAppMod && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setVal(currentText);
            setIsEditing(true);
          }}
          title="অ্যাপ মডারেটর: টেক্সট রিনেম বা এডিট করুন"
          className="p-0.5 rounded hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 transition-colors opacity-75 group-hover/edit:opacity-100 cursor-pointer shrink-0"
        >
          <Edit3 className="w-3 h-3" />
        </button>
      )}
    </Component>
  );
};
