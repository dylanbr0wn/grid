'use client'

import * as React from 'react'
import { Field } from '@base-ui-components/react/field'

type InputProps = {
	missingError?: string
	required?: boolean
	placeholder?: string
	description?: string
	label?: string
  value?: string
  onChange?(value: string): void
}

export default function Input({
	missingError,
	required,
	placeholder,
	description,
	label,
  value,
  onChange
}: InputProps) {
	return (
		<Field.Root className="flex w-full max-w-64 flex-col items-start gap-1">
			{label && (
				<Field.Label className="text-sm font-medium text-neutral-500">
					{label}
				</Field.Label>
			)}
			<Field.Control
        value={value}
        onChange={e => onChange?.(e.target.value)}
				required={required}
				placeholder={placeholder}
				className="h-10 w-full rounded-md border border-gray-200 pl-3.5 text-base text-neutral-300 focus:outline-2 focus:-outline-offset-1 focus:outline-teal-400 selection:bg-teal-300/30"
			/>
			<Field.Error className="text-sm text-red-800" match="valueMissing">
				{missingError || 'This field is required'}
			</Field.Error>

			{description && (
        <Field.Description className="text-sm text-neutral-500">
				{description}
			</Field.Description>
      )}
		</Field.Root>
	)
}
