import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

export const ReceiptLightboxModal = ({ isOpen, imageSrc, title = 'Receipt Attachment', onClose }) => {
  if (!isOpen || !imageSrc) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageSrc;
    a.download = `receipt_${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in-scale">
      <div className="relative max-w-3xl w-full flex flex-col items-center">
        
        {/* Header Bar */}
        <div className="w-full flex items-center justify-between p-3 text-white mb-2">
          <span className="text-xs font-semibold">{title}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              title="Download Receipt Image"
              className="p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-white transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              title="Close Preview"
              className="p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div className="max-h-[80vh] overflow-auto rounded-xl border border-neutral-700 bg-neutral-900 flex items-center justify-center p-2">
          <img
            src={imageSrc}
            alt={title}
            className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg shadow-2xl"
          />
        </div>

      </div>
    </div>
  );
};
