import React from 'react';
import { Input } from './Input';
import { Button } from './Button';
import { Popover, PopoverContent, PopoverTrigger } from './index';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = "Selecione uma data",
  disabled = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = event.target.value;
    if (dateValue) {
      const date = new Date(dateValue);
      onChange?.(date);
    } else {
      onChange?.(undefined);
    }
  };

  const formatValue = (date: Date | undefined) => {
    if (!date) return "";
    return format(date, "yyyy-MM-dd");
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`w-full justify-start text-left font-normal ${className}`}
          disabled={disabled}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {value ? format(value, "dd/MM/yyyy", { locale: ptBR }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4">
          <Input
            type="date"
            value={formatValue(value)}
            onChange={handleDateChange}
            className="w-full"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DatePicker;