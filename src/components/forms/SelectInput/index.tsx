import { Form, Select } from 'antd';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

import type { SelectOption } from '@/types/common';

type SelectInputProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  label: string;
  placeholder?: string;
  options: SelectOption[];
};

export function SelectInput<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  options,
}: SelectInputProps<TFieldValues>) {
  const fieldId = String(name);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Form.Item
          htmlFor={fieldId}
          label={label}
          validateStatus={fieldState.error ? 'error' : undefined}
          help={fieldState.error?.message}
        >
          <Select
            {...field}
            id={fieldId}
            placeholder={placeholder}
            options={options}
          />
        </Form.Item>
      )}
    />
  );
}
