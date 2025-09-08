import React, { useEffect, useState } from "react";

type FormModuleNoInputProps = {
  onChange?: (
    data: { prefix: string; startNo: number | null; endNo: number | null },
  ) => void;
};

export const FormModuleNoField: React.FC<FormModuleNoInputProps> = (
  { onChange },
) => {
  const [prefix, setPrefix] = useState("");
  const [startNo, setStartNo] = useState<number | null>(null);
  const [endNo, setEndNo] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  // TODO: If submitting an empty form, the validation hint will not show

  useEffect(() => {
    if (prefix == "") {
      setError("Prefix is required.");
    } else if (startNo === null || endNo === null) {
      setError("Start and End numbers are required.");
    } else if (startNo >= endNo) {
      setError("Start number must be less than End number.");
    } else {
      setError(null);
    }

    if (onChange) {
      onChange({ prefix, startNo, endNo });
    }
  }, [prefix, startNo, endNo, onChange]);

  return (
    <fieldset className="fieldset w-full">
      <legend className="fieldset-legend">
        Module No.
      </legend>
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <label
            className={`input input-primary validator w-full`}
          >
            <span className="label">Prefix:</span>
            <input
              type="text"
              placeholder="Prefix"
              className=""
              value={prefix}
              onChange={(e) => {
                setPrefix(e.target.value);
                setTouched(true);
              }}
              required
            />
          </label>
        </div>
        <div className="flex-none">
          <label className="floating-label">
            <span>Start</span>
            <input
              type="number"
              className={`input input-primary validator w-20`}
              value={startNo === null ? "" : startNo}
              onChange={(e) => {
                const value = e.target.value ? Number(e.target.value) : null;
                setStartNo(value);
                setTouched(true);
              }}
              min="1"
              max="999"
              placeholder="1"
              required
            />
          </label>
        </div>
        <div className="flex-none text-center font-bold prose prose-xl">-</div>
        <div className="flex-none">
          <label className="floating-label">
            <span>End</span>
            <input
              type="number"
              className={`input input-primary validator w-20`}
              value={endNo === null ? "" : endNo}
              onChange={(e) => {
                const value = e.target.value ? Number(e.target.value) : null;
                setEndNo(value);
                setTouched(true);
              }}
              min="1"
              max="999"
              placeholder="999"
              required
            />
          </label>
        </div>
      </div>
      <p className={`mt-2 font-size-3 text-error ${touched ? "" : "hidden"}`}>
        {error}
      </p>
    </fieldset>
  );
};
