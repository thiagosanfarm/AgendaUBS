import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatarCPF } from "@/utils/formatters";

export interface InputCPFProps extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
}

export const InputCPF = React.forwardRef<HTMLInputElement, InputCPFProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const formatted = formatarCPF(rawValue);
      onChange(formatted);
    };

    return (
      <Input
        type="text"
        inputMode="numeric"
        maxLength={14}
        value={value}
        onChange={handleChange}
        placeholder="000.000.000-00"
        className={className}
        ref={ref}
        {...props}
      />
    );
  }
);

InputCPF.displayName = "InputCPF";
