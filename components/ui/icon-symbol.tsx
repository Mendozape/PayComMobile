import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

/**
 * An icon symbol component that uses MaterialIcons from Expo.
 * The MAPPING object connects custom SF Symbols-style names to MaterialIcons.
 * This ensures cross-platform compatibility for iOS and Android.
 */
const MAPPING = {
  // --- Navigation & UI ---
  'house.fill': 'home',
  'line.3.horizontal': 'menu',
  'chevron.right': 'chevron-right',
  'chevron.down': 'keyboard-arrow-down',
  'chevron.up': 'keyboard-arrow-up', // <-- ADDED FOR COLLAPSIBLE
  'chevron.left.forwardslash.chevron.right': 'code',
  'magnifyingglass': 'search',
  'arrow.left': 'arrow-back',
  'gearshape.fill': 'settings', // <-- ADDED FOR CONFIGURATION HEADER
  
  // --- Actions ---
  'plus': 'add',
  'pencil': 'edit',
  'trash.fill': 'delete',
  'trash': 'delete',
  'xmark': 'close',
  'checkmark': 'check',
  'ban': 'block',
  'arrow.counterclockwise': 'restore',

  // --- User & Profile ---
  'person.fill': 'person',
  'person.circle.fill': 'account-circle',
  'person.crop.circle.fill': 'account-circle',
  'person.2.fill': 'people',
  'camera.fill': 'photo-camera',
  'rectangle.portrait.and.arrow.right': 'logout',
  'person.badge.plus.fill': 'person-add',
  'lock.fill': 'lock',
  'key.fill': 'vpn-key',
  
  // --- Finance & Business ---
  'cash.fill': 'attach-money',
  'creditcard.fill': 'receipt-long',
  'tags.fill': 'local-offer',
  'dollarsign.circle.fill': 'monetization-on',
  'banknote.fill': 'payments',
  'chart.bar.fill': 'assessment', 
  'doc.text.fill': 'description',
  
  // --- Property & Maps ---
  'building.2.fill': 'business',
  'location.fill': 'location-on',
  'pin.fill': 'place',
  'map.fill': 'map',
  'road.fill': 'history', 
  'clock.arrow.2.circlepath': 'history', 

  // --- Communication ---
  'paperplane.fill': 'send',
  'message.fill': 'message',
  'envelope.fill': 'email',
  'bell.fill': 'notifications',
} as const;

export type IconSymbolName = keyof typeof MAPPING;

/**
 * IconSymbol component to render vector icons based on a pre-defined mapping.
 * Uses MaterialIcons for a consistent look on both Android and iOS.
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
  const mappedName = MAPPING[name];
  
  // Warn developer if the requested icon is missing from the mapping
  if (!mappedName) {
    console.warn(`⚠️ Icon name "${name}" is not defined in the MAPPING object.`);
    return null;
  }

  return (
    <MaterialIcons
      name={mappedName as any}
      size={size}
      color={color}
      style={style}
    />
  );
}