import React, { useEffect, useRef, useState } from "react";

type FormUploadFieldProps = {
  label: string;
  required?: boolean;
  maxSize?: number;
  onFilesChange?: (files: File[]) => void;
};

export const FormUploadField: React.FC<FormUploadFieldProps> = ({
  label,
  required = true,
  maxSize = 10,
  onFilesChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;

    const selectedFiles = Array.from(event.target.files);

    setFiles((prev) => {
      const updatedFiles = [...prev, ...selectedFiles].slice(0, maxSize);

      // Thank you stackoverflow stranger
      // https://stackoverflow.com/questions/1696877/how-to-set-a-value-to-a-file-input-in-html-to-a-client-side-disk-file-system-pat
      if (fileInputRef.current) {
        try {
          const dataTransfer = new DataTransfer();

          updatedFiles.forEach((file) => dataTransfer.items.add(file));

          fileInputRef.current.files = dataTransfer.files;
        } catch (error) {
          console.error("Error updating file input:", error);
        }
      }

      if (onFilesChange) {
        onFilesChange(updatedFiles);
      }

      return updatedFiles;
    });

    const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file));

    setPreviews((prev) => {
      const combinedPreviews = [...prev, ...newPreviews];
      if (combinedPreviews.length > maxSize) {
        const removedPreviews = combinedPreviews.slice(maxSize);
        removedPreviews.forEach((url) => URL.revokeObjectURL(url));
      }

      return combinedPreviews.slice(0, maxSize);
    });
  };

  const onCarouselItemDelete = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => {
      const updatedFiles = prev.filter((_, i) => i !== index);

      if (onFilesChange) {
        onFilesChange(updatedFiles);
      }

      return updatedFiles;
    });
    setPreviews((prev) => prev.filter((_, i) => i !== index));

    if (fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      files.forEach((file, i) => {
        if (i !== index) {
          dataTransfer.items.add(file);
        }
      });
      fileInputRef.current.files = dataTransfer.files;
    }
  };

  // Clean up preview URLs when component unmounts
  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  return (
    <fieldset className="fieldset w-full">
      <legend className="fieldset-legend">
        {label}
        {!required && <span>(Optional)</span>}
      </legend>
      <input
        type="file"
        ref={fileInputRef}
        className="file-input file-input-primary w-full"
        accept="image/*,video/*"
        onChange={handleFileUpload}
        required={required}
        multiple={maxSize > 1}
      />
      {previews.length > 0 && (
        <CarouselPreview
          files={files}
          previews={previews}
          onRemove={onCarouselItemDelete}
        />
      )}
      <label className="label">Max files: {maxSize}</label>
    </fieldset>
  );
};

type CarouselPreviewProps = {
  files: File[];
  previews: string[];
  onRemove?: (index: number) => void;
};

const CarouselPreview: React.FC<CarouselPreviewProps> = (
  { files, previews, onRemove },
) => {
  const scroll = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    index: number,
  ) => {
    e.preventDefault();
    const item = document.getElementById(`carousel-item-${index}`);
    if (item) {
      item.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  };
  return (
    <div className="w">
      <div className="carousel carousel-center w-full bg-neutral space-x-4 rounded-box p-4">
        {previews.map((previewUrl, index) => (
          <div
            id={`carousel-item-${index}`}
            className="carousel-item relative"
            key={index}
          >
            <div className="relative overflow-hidden">
              {files[index].type.startsWith("video/")
                ? (
                  <video
                    src={previewUrl}
                    controls
                    className="max-h-50 rounded-box object-contain"
                  />
                )
                : (
                  <>
                    <img
                      src={previewUrl}
                      alt={`Preview ${index + 1}`}
                      className="max-h-50 rounded-box object-contain"
                    />
                  </>
                )}

              <button
                type="button"
                className="btn btn-circle btn-xs absolute top-1 right-1 bg-error hover:bg-error/80 text-white border-none"
                onClick={() => {
                  if (onRemove) {
                    onRemove(index);
                  }
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex w-full justify-center gap-2 py-2">
        {previews.map((_, index) => (
          <a
            key={index}
            className="btn btn-xs"
            onClick={(e) => {
              scroll(e, index);
            }}
          >
            {index + 1}
          </a>
        ))}
      </div>
    </div>
  );
};
