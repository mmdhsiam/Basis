import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Lock } from 'lucide-react';
import { uploadImageWithFallback, UploadedImageResult } from '../../utils/imageUploadService';
import { useApp } from '../../context/AppContext';

interface HostedImageInputProps {
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
  required?: boolean;
  readOnly?: boolean;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onUploadComplete?: (result: UploadedImageResult) => void;
}

export const HostedImageInput: React.FC<HostedImageInputProps> = ({
  value,
  onChange,
  placeholder = 'https://i.ibb.co/... বা ডিভাইস থেকে ছবি সিলেক্ট করুন',
  className = '',
  inputClassName = 'flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-ink font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500',
  buttonClassName = '',
  required = false,
  readOnly = false,
  onBlur,
  onUploadComplete,
}) => {
  const { triggerWarning } = useApp();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadLocked, setIsUploadLocked] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState<string | null>(null);

  // Unlock automatically only if the parent resets/clears the field value completely
  useEffect(() => {
    if (!value || value.trim() === '') {
      setIsUploadLocked(false);
      setUploadStatusText(null);
    }
  }, [value]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsUploading(true);
    setUploadStatusText('ব্যাকগ্রাউন্ডে ছবি আপলোড হচ্ছে...');
    try {
      const result = await uploadImageWithFallback(file);
      onChange(result.inputValue);
      setIsUploadLocked(true);
      setUploadStatusText(
        result.provider === 'imgbb'
          ? 'ImgBB-তে আপলোড সম্পন্ন (এডিট লকড)'
          : 'PostImages-এ আপলোড সম্পন্ন (এডিট লকড)'
      );
      onUploadComplete?.(result);
    } catch (err: any) {
      setUploadStatusText(null);
      triggerWarning(
        'ছবি আপলোড ব্যর্থ হয়েছে',
        err?.message || 'ImgBB ও PostImages সার্ভারে ছবি আপলোড করা যায়নি। পুনরায় চেষ্টা করুন।',
        false
      );
    } finally {
      setIsUploading(false);
    }
  };

  const effectivelyLocked = Boolean(readOnly || isUploadLocked || isUploading);

  return (
    <div className={`space-y-1 flex-1 min-w-0 ${className}`}>
      <div className="flex items-center gap-1.5 w-full min-w-0">
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={value}
            onChange={(e) => {
              if (effectivelyLocked) return;
              onChange(e.target.value);
            }}
            onBlur={onBlur}
            placeholder={placeholder}
            required={required}
            readOnly={effectivelyLocked}
            aria-readonly={effectivelyLocked}
            className={`${inputClassName} w-full ${
              isUploadLocked ? 'pr-7 opacity-85 cursor-not-allowed select-none' : ''
            }`}
          />
          {isUploadLocked && (
            <Lock
              className="w-3.5 h-3.5 text-emerald-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-label="লিঙ্ক লক করা আছে"
            />
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          title="ফোন বা ডিভাইসের গ্যালারি থেকে ছবি সিলেক্ট করে স্বয়ংক্রিয় আপলোড করুন"
          className={
            buttonClassName ||
            'px-2.5 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/35 text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap'
          }
        >
          {isUploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span className="hidden sm:inline">আপলোড...</span>
            </>
          ) : (
            <>
              <ImagePlus className="w-3.5 h-3.5 shrink-0" />
              <span>গ্যালারি</span>
            </>
          )}
        </button>
      </div>

      {uploadStatusText && (
        <p className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
          {isUploadLocked && <Lock className="w-3 h-3 shrink-0" />}
          <span>{uploadStatusText}</span>
        </p>
      )}
    </div>
  );
};
