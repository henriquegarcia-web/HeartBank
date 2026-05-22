import { Form, Input } from 'antd';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

type TextInputProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  label: string;
  placeholder?: string;
};

export function TextInput<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
}: TextInputProps<TFieldValues>) {
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
          <Input {...field} id={fieldId} placeholder={placeholder} />
        </Form.Item>
      )}
    />
  );
}
