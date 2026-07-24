import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes } from 'react'

const FIELD_CLASSES =
  'w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${FIELD_CLASSES} ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${FIELD_CLASSES} ${props.className ?? ''}`} />
}

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  htmlFor: string
}

export function Label({ htmlFor, className, ...props }: LabelProps) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: htmlFor và nội dung chữ luôn được nơi gọi truyền vào qua props/children
    <label
      htmlFor={htmlFor}
      className={`text-sm font-medium text-neutral-700 dark:text-neutral-300 ${className ?? ''}`}
      {...props}
    />
  )
}

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}
