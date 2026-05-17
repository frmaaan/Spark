import { AlertTriangle } from "lucide-react";

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = "Hapus", cancelText = "Batal", type = "danger" }) {
  if (!isOpen) return null;

  const isDanger = type === "danger";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_#111827] w-full max-w-md p-6 sm:p-8 animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className={`w-16 h-16 border-[3px] border-black flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_#111827] transform -rotate-3 ${isDanger ? 'bg-red-400' : 'bg-primary'}`}>
            <AlertTriangle size={32} className="text-white" />
          </div>
          
          <h2 className="text-xl font-black text-text-dark uppercase tracking-tight mb-3">
            {title}
          </h2>
          <p className="text-sm font-medium text-text-muted mb-8 whitespace-pre-line">
            {message}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            {cancelText && (
              <button
                onClick={onCancel}
                className="flex-1 neu-btn bg-zinc-200 border-black hover:bg-zinc-300 text-black py-3 text-xs"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={onConfirm}
              className={`flex-1 neu-btn py-3 text-xs ${isDanger ? 'bg-red-500 hover:bg-red-600 text-white border-black' : 'neu-btn-primary'}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
