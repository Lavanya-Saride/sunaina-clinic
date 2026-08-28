import {
  Baby,
  HeartPulse,
  Droplet,
  Flower2,
  Stethoscope,
  Scissors,
  UserRound,
  HeartHandshake,
  Compass,
  Cross,
  ShieldCheck,
} from 'lucide-react';

const ICONS = {
  Baby,
  CrossIcon: Cross,
  Droplet,
  Flower: Flower2,
  Stethoscope,
  Scissors,
  UserRound,
  HeartHandshake,
  HeartPulse,
  Compass,
  ShieldCheck,
};

export default function getIcon(name) {
  return ICONS[name] || Stethoscope;
}
