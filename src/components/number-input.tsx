"use client";
import { cn } from "@/lib/util";
import { NumberField } from "@base-ui/react";
import { IconArrowsHorizontal } from "@tabler/icons-react";
import { useId } from "react";

type NumberInputProps = {
  value?: number;
  onChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  label?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  placeholder?: string;
};

export default function NumberInput({
  min,
  max,
  step,
  onChange,
  value,
  label,
  leftIcon,
  rightIcon,
  placeholder,
}: NumberInputProps) {
  const id = useId();
  return (
    <NumberField.Root
      id={id}
      value={value}
      required
      min={min}
      max={max}
      step={step}
      onValueChange={(value) => onChange?.(value)}
      className="flex flex-col items-start w-1/2"
    >
      {label && (
        <NumberField.ScrubArea className="cursor-ew-resize">
          <label
            htmlFor={id}
            className="cursor-ew-resize text-xs font-medium text-neutral-500"
          >
            {label}
          </label>
          <NumberField.ScrubAreaCursor className="drop-shadow-[0_1px_1px_#0008] filter">
            <IconArrowsHorizontal />
          </NumberField.ScrubAreaCursor>
        </NumberField.ScrubArea>
      )}
      <NumberField.Group className="flex relative group items-center hover:bg-neutral-900 focus-within:z-1 focus-within:bg-neutral-900 text-neutral-300 pl-2 gap-3 h-8">
        <span className="text-sm">{leftIcon}</span>
        <NumberField.Input
          placeholder={placeholder}
          className={cn(
            "w-full outline-none text-left text-base tabular-nums placeholder:text-xs"
          )}
        />

        {rightIcon}
      </NumberField.Group>
    </NumberField.Root>
  );
}
