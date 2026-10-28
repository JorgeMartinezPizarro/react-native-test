import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Maneuver } from '../Services/routing';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

const TURN_ICONS: Record<string, IconName> = {
  uturn: 'u-turn-left',
  'sharp right': 'turn-sharp-right',
  right: 'turn-right',
  'slight right': 'turn-slight-right',
  straight: 'straight',
  'slight left': 'turn-slight-left',
  left: 'turn-left',
  'sharp left': 'turn-sharp-left',
};

function iconFor({ type, modifier }: Maneuver): IconName {
  if (type === 'depart') return 'trip-origin';
  if (type === 'arrive') return 'flag';
  if (type.includes('roundabout') || type.includes('rotary')) return 'roundabout-right';
  return TURN_ICONS[modifier ?? 'straight'] ?? 'straight';
}

/** Arrow (or flag, roundabout…) for a route maneuver */
export default function ManeuverIcon({ maneuver, size, color }: { maneuver: Maneuver; size: number; color: string }) {
  return <MaterialIcons name={iconFor(maneuver)} size={size} color={color} />;
}
