import { TABLE_COLORS } from '../../types/evaluation';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export const ColorPicker = ({ value, onChange }: ColorPickerProps) => {
  return (
    <div className="flex gap-1 flex-wrap">
      {TABLE_COLORS.map((color) => (
        <button
          key={color.class}
          type="button"
          onClick={() => onChange(color.class)}
          className={`w-6 h-6 rounded ${color.class} ${
            value === color.class ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800' : ''
          }`}
          title={color.name}
        />
      ))}
    </div>
  );
};
