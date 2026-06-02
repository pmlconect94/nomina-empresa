import {
  LayoutDashboard, Users, FileText, HandCoins, CalendarCheck, Settings, Truck,
  ChevronDown, ChevronRight, ChevronLeft, Search, Plus, Download, Upload, X, Check,
  Trash2, Edit3, ArrowLeft, ArrowRight, Calendar, Banknote, LogOut, Bell, Filter,
  TrendingUp, TrendingDown, AlertTriangle, CircleCheck, CircleAlert, Loader2, Inbox,
  Lock, History, UserPlus, DollarSign, Briefcase, Printer, Clock,
  type LucideProps,
} from 'lucide-react';

const ICONS = {
  dashboard: LayoutDashboard,
  users: Users,
  'file-text': FileText,
  coins: HandCoins,
  'calendar-check': CalendarCheck,
  settings: Settings,
  truck: Truck,
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  'chevron-left': ChevronLeft,
  search: Search,
  plus: Plus,
  download: Download,
  upload: Upload,
  x: X,
  check: Check,
  trash: Trash2,
  edit: Edit3,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  calendar: Calendar,
  banknote: Banknote,
  logout: LogOut,
  bell: Bell,
  filter: Filter,
  'trend-up': TrendingUp,
  'trend-down': TrendingDown,
  warning: AlertTriangle,
  'check-circle': CircleCheck,
  alert: CircleAlert,
  spinner: Loader2,
  inbox: Inbox,
  lock: Lock,
  history: History,
  'user-plus': UserPlus,
  dollar: DollarSign,
  briefcase: Briefcase,
  printer: Printer,
  clock: Clock,
} as const;

export type IconName = keyof typeof ICONS;
type Props = LucideProps & { name: IconName };

export function Icon({ name, size = 16, ...rest }: Props) {
  const Cmp = ICONS[name];
  return <Cmp size={size} {...rest} />;
}
