import { ReactNode, createContext, useState, useMemo, useContext, useCallback } from 'react';
import { Theme } from './Theme';
import lightTheme from './themes/light';
import { View } from 'react-native';
import { vars } from 'nativewind';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (name: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  setTheme: () => {},
});

function hexToHslChannels(value: string) {
  const hex = value.replace("#", "");
  if (!/^[\da-f]{3}([\da-f]{3})?$/i.test(hex)) return undefined;
  const normalized = hex.length === 3 ? hex.split("").map((part) => part + part).join("") : hex;
  const red = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const green = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(normalized.slice(4, 6), 16) / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const lightness = (maximum + minimum) / 2;
  const delta = maximum - minimum;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (delta !== 0) {
    if (maximum === red) hue = ((green - blue) / delta) % 6;
    else if (maximum === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return `${Math.round(hue)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

export const ThemeProvider = ({
  initialThemeName,
  themes,
  children,
}: {
  initialThemeName: string;
  themes: Theme[];
  children: ReactNode;
}) => {
  if (themes.length === 0) {
    throw new Error('At least one theme must be provided in the ThemeProvider');
  }

  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    const theme = themes.find((theme) => theme.name === initialThemeName);
    if (!theme) {
      // eslint-disable-next-line no-console
      console.warn(`Theme '${initialThemeName}' not found, falling back to ${themes[0].name}`);
      return themes[0];
    }
    return theme;
  });

  const setTheme = useCallback(
    (name: string) => {
      const theme = themes.find((theme) => theme.name === name);
      if (!theme) {
        // eslint-disable-next-line no-console
        console.warn(`Theme '${name}' not found, skipping setting theme`);
        return;
      }
      setCurrentTheme(theme);
    },
    [themes]
  );

  const themeContextValue: ThemeContextValue = useMemo(
    () => ({
      theme: currentTheme,
      setTheme,
    }),
    [currentTheme, setTheme]
  );

  // Flatten to variables that can be referenced in CSS/Tailwind classes
  // `h1: { fontSize: 24 }` -> Transforms to the following css variable: `--h1-fontSize: 24px`
  const flattenedTypographyVariables = useMemo(() => {
    const flattened: Record<string, string> = {};
    Object.entries(currentTheme.typography).forEach(([typographyItem, values]) => {
      if (values) {
        Object.entries(values).forEach(([key, value]) => {
          if (value !== undefined) {
            flattened[`${typographyItem}-${key}`] = value;
          }
        });
      }
    });
    return flattened;
  }, [currentTheme.typography]);

  // Strip the hsl() from the colors since they're used in the tailwind config with an assumption
  // of just the raw hsl values without the wrapping hsl(...)
  const strippedHslColors = useMemo(() => {
    const stripped: Record<string, string> = {};
    Object.entries(currentTheme.colors).forEach(([key, value]) => {
      if (!value) return;
      if (value.startsWith('hsl(')) {
        stripped[key] = value.replace('hsl(', '').replace(')', '');
      } else {
        const channels = hexToHslChannels(value);
        if (channels) stripped[key] = channels;
      }
    });
    return stripped;
  }, [currentTheme.colors]);

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <View
        className="h-full w-full"
        style={vars({ ...strippedHslColors, ...flattenedTypographyVariables })}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  return useContext(ThemeContext);
};
