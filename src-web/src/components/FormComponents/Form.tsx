import React, { useEffect, useRef, useState } from "react";

type FormProps = {
  title: string;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  submitButtonText?: string;
  modalID?: string;
};

export const Form: React.FC<FormProps> = (
  { title, error, setError, children, onSubmit, submitButtonText, modalID },
) => {
  const [formKey, setFormKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setError(null);
    setFormKey((prev) => prev + 1);
  };

  useEffect(() => {
    // If a modalId is provided, attach listeners to the modal element
    if (modalID) {
      const modalElement = document.getElementById(
        modalID,
      ) as HTMLDialogElement;

      if (modalElement) {
        // Reset form when modal is opened or closed
        modalElement.addEventListener("close", resetForm);
        modalElement.addEventListener("cancel", resetForm);

        // Reset form immediately if modal is already open
        if (modalElement.open) {
          resetForm();
        }
      }

      return () => {
        if (modalElement) {
          modalElement.removeEventListener("close", resetForm);
          modalElement.removeEventListener("cancel", resetForm);
        }
      };
    }
  }, [modalID]);

  return (
    <form
      id="modal-form"
      key={formKey}
      ref={formRef}
      className="form-control w-full"
      onSubmit={(e) => {
        e.preventDefault();

        setIsLoading(true);
        onSubmit(e).then(() => {
          setIsLoading(false);
        });
      }}
    >
      <div className="bg-base-100 p-6 pt-4 rounded-b-xl bg-linear-to-br from-base-100/2 to-base-100">
        <h3 className="font-bold prose prose-xl">{title}</h3>
        {children}
        {error && (
          <div role="alert" className="alert alert-error alert-soft">
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 px-6 py-2">
        <form method="dialog">
          <button
            type="submit"
            className="btn btn-soft btn-ghost"
          >
            Cancel
          </button>
        </form>
        <button
          type="submit"
          className={`btn btn-primary ${isLoading ? "btn-disabled" : ""}`}
        >
          {isLoading
            ? <span className="loading loading-dots loading-md"></span>
            : submitButtonText
            ? submitButtonText
            : "Submit"}
        </button>
      </div>
    </form>
  );
};
