import { useEffect, useState } from 'react';
import { THEMES, ThemeKey, applyTheme, getSavedTheme } from '@/lib/themes';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette } from 'lucide-react';

export const ThemeSelector = () => {
  const [theme, setTheme] = useState<ThemeKey>(getSavedTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <div className="flex items-center gap-2">
      {/* <Palette size={16} className="text-muted-foreground shrink-0" /> */}
      <Select value={theme} onValueChange={(v) => setTheme(v as ThemeKey)} >
        {/* <SelectTrigger className="w-[140px] h-8 text-xs"> */}
        <SelectTrigger className="w-full h-10 border rounded-md px-3 mt-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(THEMES).map(([key, t]) => (
            <SelectItem key={key} value={key}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
