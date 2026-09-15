/** 行内设置输入框支持的属性 */
interface InputProps<K extends string, V extends string> {
  label: string;
  labelClassName?: string;
  name: K;
  value?: V;
  placeholder: string;
  type?: React.HTMLInputTypeAttribute;
  min?: number;
  max?: number;
  step?: number;
  inputStyle?: React.CSSProperties;
  onChange: (name: K, value: V) => void;
}

/** 渲染带标签的简历设置输入框 */
export const InlineInput = <K extends string>({
  label,
  labelClassName,
  name,
  value = "",
  placeholder,
  type = "text",
  min,
  max,
  step,
  inputStyle = {},
  onChange,
}: InputProps<K, string>) => {
  return (
    <label
      className={`flex gap-2 text-base font-medium text-gray-700 ${labelClassName}`}
    >
      <span className="w-28">{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        inputMode={type === "number" ? "decimal" : undefined}
        onChange={(e) => onChange(name, e.target.value)}
        className="w-[5rem] border-b border-gray-300 text-center font-semibold leading-3 outline-none"
        style={inputStyle}
      />
    </label>
  );
};
