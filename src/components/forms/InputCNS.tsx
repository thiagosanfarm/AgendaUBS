import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatarCNS } from "@/utils/formatters";

export interface InputCNSProps extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
}

export const InputCNS = React.forwardRef<HTMLInputElement, InputCNSProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const formatted = formatarCNS(rawValue);
      onChange(formatted);
    };

    return (
      <Input
        type="text"
        inputMode="numeric"
        maxLength={18}
        value={value}
        onChange={handleChange}
        placeholder="000 0000 0000 0000"
        className={className}
        ref={ref}
        {...props}
      />
    );
  }
);

InputCNS.displayName = "InputCNS";
