console.log('🔥 CUSTOM ICON SYMBOL LOADED');
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

/**
 * Central icon mapping (SF-style names → Material Icons)
 * This mapping is used on ALL platforms.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',

  // Streets
  'road.fill': 'map',
  'map.fill': 'map',
  'road.lanes': 'map',
  'line.3.horizontal': 'menu',

  // Fees
  'cash.fill': 'payments',


  // Profile
  'person.fill': 'person',

  // Actions
  'plus': 'add',
  'pencil': 'edit',
  'trash.fill': 'delete',
  'camera.fill': 'photo-camera',
  'rectangle.portrait.and.arrow.right': 'logout',
  'trash': 'delete',      
} as const;

type IconSymbolName = keyof typeof MAPPING;

/**
 * Cross-platform icon component that ALWAYS uses MaterialIcons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
}) {
  const iconName = MAPPING[name];

  if (!iconName) {
    console.warn('Missing icon mapping:', name);
    return null;
  }

  return (
    <MaterialIcons
      name={iconName}
      size={size}
      color={color}
      style={style}
    />
  );
}
