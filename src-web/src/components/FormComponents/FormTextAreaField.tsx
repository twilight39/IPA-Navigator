import React from "react";

type FormTextAreaProps = {
  name: string;
  label: string;
  required?: boolean;
};

export const FormTextAreaField: React.FC<FormTextAreaProps> = (
  { name, label, required },
) => {
  return (
    <fieldset className="fieldset w-full">
      <legend className="fieldset-legend">
        {label}
        {!required && <span>(Optional)</span>}
      </legend>
      <textarea
        name={name}
        placeholder={label}
        className="textarea textarea-primary w-full"
      >
      </textarea>
    </fieldset>
  );
};
