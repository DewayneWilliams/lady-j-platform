import React from 'react';
import * as icons from 'lucide-react-native/icons';
import { createLucideIcon, type LucideProps } from 'lucide-react-native';
import { cssInterop } from 'nativewind';
import { memo, useMemo } from 'react';

const customIcons = {
  // Lucide SprayCan geometry without the emitted spray particles.
  SprayCanClean: createLucideIcon('SprayCanClean', [
    ['rect', { width: '4', height: '4', x: '15', y: '5', key: 'mri9e4' }],
    ['path', { d: 'm19 9 2 2v10c0 .6-.4 1-1 1h-6c-.6 0-1-.4-1-1V11l2-2', key: 'aib6hk' }],
    ['path', { d: 'm13 14 8-2', key: '1d7bmk' }],
    ['path', { d: 'm13 19 8-2', key: '1y2vml' }],
  ]),
} as const;

export type IconName = keyof typeof icons | keyof typeof customIcons;
type IconProps = LucideProps & { name: IconName; className?: string };

const Icon: React.FC<IconProps> = memo(({ name, className, ...rest }) => {
  const CustomIcon = useMemo(() => {
    const Icon = customIcons[name as keyof typeof customIcons] ?? icons[name as keyof typeof icons] ?? icons.Image;
    Icon.displayName = name;

    return cssInterop(Icon, {
      className: {
        target: 'style',
        nativeStyleToProp: {
          color: true,
          opacity: true,
          width: true,
          height: true,
        },
      },
    });
  }, [name]);

  return <CustomIcon className={className} {...rest} />;
});

export default Icon;
