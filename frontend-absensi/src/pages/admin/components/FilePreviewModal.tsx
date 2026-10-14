interface Props {
  isOpen: boolean;
  fileUrl: string | null;
  fileName?: string;
  onClose: () => void;
}

export default function FilePreviewModal({
  isOpen,
  fileUrl,
  fileName,
  onClose,
}: Props) {
  if (!isOpen || !fileUrl) return null;

  // Deteksi tipe file dari ekstensi
  const ext = fileUrl.split(".").pop()?.toLowerCase() || "";
  const isImage = ["jpg", "jpeg", "png"].includes(ext);
  const isPdf = ext === "pdf";

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-line flex justify-between items-center">
          <h3 className="text-base font-display font-bold text-ink truncate">
            {fileName || "Preview Bukti"}
          </h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-ink text-4xl leading-none cursor-pointer ml-4 shrink-0"
            aria-label="Tutup"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto bg-surface-soft flex items-center justify-center p-4">
          {isImage ? (
            <img
              src={fileUrl}
              alt="Bukti"
              className="max-w-full max-h-[70vh] rounded-xl object-contain"
            />
          ) : isPdf ? (
            <iframe
              src={fileUrl}
              title="Bukti PDF"
              className="w-full h-[70vh] rounded-xl bg-white"
            />
          ) : (
            <div className="text-center space-y-3 py-10">
              <p className="text-4xl">📄</p>
              <p className="text-sm text-muted">
                Format file tidak dapat di-preview.
              </p>
              <a
                href={fileUrl}
                download
                className="inline-block px-5 py-2.5 bg-blue text-white font-semibold rounded-xl hover:bg-blue-dark"
              >
                Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
