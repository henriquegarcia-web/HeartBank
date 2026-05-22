import { Button, type ButtonProps } from 'antd';

type SubmitButtonProps = ButtonProps & {
  label: string;
};

export function SubmitButton({ label, ...props }: SubmitButtonProps) {
  return (
    <Button htmlType="submit" type="primary" {...props}>
      {label}
    </Button>
  );
}
