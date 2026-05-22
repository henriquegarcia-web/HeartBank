import { Form, Input } from 'antd';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

type PasswordInputProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  label: string;
  placeholder?: string;
};

export function PasswordInput<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
}: PasswordInputProps<TFieldValues>) {
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
          <Input.Password {...field} id={fieldId} placeholder={placeholder} />
        </Form.Item>
      )}
    />
  );
}
