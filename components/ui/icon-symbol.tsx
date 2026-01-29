import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

const MAPPING = {
  // Navigation & UI
  'house.fill': 'home',
  'line.3.horizontal': 'menu',
  'chevron.right': 'chevron-right',
  'chevron.down': 'keyboard-arrow-down',
  'chevron.left.forwardslash.chevron.right': 'code',
  
  // Actions
  'plus': 'add',
  'pencil': 'edit',
  'trash.fill': 'delete',
  'trash': 'delete',
  'xmark': 'close',
  'checkmark': 'check',
  'magnifyingglass': 'search',
  
  // User & Profile
  'person.fill': 'person',
  'person.circle.fill': 'account-circle',
  'camera.fill': 'photo-camera',
  'rectangle.portrait.and.arrow.right': 'logout',
  
  // Finance & Business
  'cash.fill': 'attach-money',
  'creditcard.fill': 'receipt-long',
  'tags.fill': 'local-offer',
  'dollarsign.circle.fill': 'monetization-on',
  
  // Property Specific
  'building.2.fill': 'business',
  'location.fill': 'location-on',
  'pin.fill': 'place',
  'map.fill': 'map',

  // Communication
  'paperplane.fill': 'send',
  'envelope.fill': 'email',
  'bell.fill': 'notifications',
} as const;

type IconSymbolName = keyof typeof MAPPING;

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
  const mappedName = MAPPING[name];
  if (!mappedName) {
    console.warn(`⚠️ Icon "${name}" not found`);
    return null;
  }
  return <MaterialIcons name={mappedName as any} size={size} color={color} style={style} />;
}