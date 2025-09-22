import React from "react";

type ModalProps = {
  id: string;
  children: React.ReactNode;
};

export const Modal: React.FC<ModalProps> = ({ id, children, ref }) => {
  return (
    <dialog
      id={id}
      className="modal modal-blur"
    >
      <div className="modal-box p-0 bg-base-300 max-h-[80vh] overflow-y-auto relative">
        <form method="dialog">
          <button
            type="submit"
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          >
            ✕
          </button>
        </form>
        {children}
      </div>

      <form method="dialog" className="modal-backdrop backdrop-blur">
        <button type="submit">close</button>
      </form>
    </dialog>
  );
};
