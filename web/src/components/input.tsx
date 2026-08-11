"use client";

import * as React from "react";
import { Field } from "@base-ui/react/field";
import { cn } from "@/lib/util";
import * as motion from "motion/react-client";

type InputProps = {
  required?: boolean;
  placeholder?: string;
  description?: string;
  label?: string;
  value?: string;
  onChange?(value: string): void;
  name?: string;
  error?: string;
} & Omit<React.HTMLProps<HTMLInputElement>, "onChange">;

export default function Input({
  required,
  placeholder,
  description,
  label,
  value,
  onChange,
  name,
  className,
  error,
}: InputProps) {
  return (
    <Field.Root
      className={cn(
        "flex w-full flex-col items-start gap-1",
        className
      )}
    >
      {label && (
        <Field.Label className="text-sm font-medium text-neutral-500">
          {label}
        </Field.Label>
      )}
      <div className="hover:bg-neutral-900 focus-within:z-1 focus-within:bg-neutral-900 text-neutral-300 pl-2 relative w-full">
        <Field.Control
          value={value}
          name={name}
          onChange={(e) => onChange?.(e.target.value)}
          required={required}
          placeholder={placeholder}
          className={cn(
            "h-10 flex outline-0 relative peer items-center w-full"
          )}
        />
        <motion.div
          className={cn(
            "absolute right-0 left-0 bottom-0 h-px bg-neutral-400  transition-colors peer-focus:bg-white peer-focus:h-0.75"
          )}
          layout
          transition={{
            duration: 0.15,
          }}
        />
      </div>

      <Field.Error className="text-sm text-red-800" match={!!error}>
        {error}
      </Field.Error>

      {description && (
        <Field.Description className="text-sm text-neutral-500">
          {description}
        </Field.Description>
      )}
    </Field.Root>
  );
}
