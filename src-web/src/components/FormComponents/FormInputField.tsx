import React from "react";

type FormInputFieldProps = {
  name: string;
  label: string;
  required?: boolean;
};

export const FormInputField: React.FC<FormInputFieldProps> = (
  { name, label, required = true },
) => {
  return (
    <fieldset className="fieldset w-full">
      <legend className="fieldset-legend">
        {label}
        {!required && <span>(Optional)</span>}
      </legend>
      <input
        type="text"
        name={name}
        className="input input-primary validator w-full"
        required={required}
        placeholder={label}
      />
      <p className="validator-hint hidden">{label} is required.</p>
    </fieldset>
  );
};
