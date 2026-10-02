import {
  BarChart3,
  ClipboardList,
  Clock,
  Layers,
  MapPin,
  Maximize2,
  Package,
  Palette,
  School,
  Settings,
  Shirt,
  Terminal,
  User,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export interface NavigationTarget {
  mainTab: string | null;
  subTab?: string;
  categoryId?: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
  children?: NavigationItem[];
  target?: NavigationTarget;
}

export interface NavigationCategory {
  id: string;
  name: string;
}

const MANAGEMENT_ITEMS: NavigationItem[] = [
  { id: 'categories', label: 'Categories', icon: Layers, target: { mainTab: 'management_view', subTab: 'categories' } },
  { id: 'schoolTypes', label: 'School Types', icon: Clock, target: { mainTab: 'management_view', subTab: 'schoolTypes' } },
  { id: 'schools', label: 'School Registry', icon: School, target: { mainTab: 'management_view', subTab: 'schools' } },
  { id: 'clothingTypes', label: 'Clothing Types', icon: Shirt, target: { mainTab: 'management_view', subTab: 'clothingTypes' } },
  { id: 'sizes', label: 'Sizes', icon: Maximize2, target: { mainTab: 'management_view', subTab: 'sizes' } },
  { id: 'colours', label: 'Colours', icon: Palette, target: { mainTab: 'management_view', subTab: 'colours' } },
  { id: 'locations', label: 'Locations', icon: MapPin, target: { mainTab: 'management_view', subTab: 'locations' } },
];

export function getNavigationTree(categories: NavigationCategory[] = []): NavigationItem[] {
  return [
    {
      id: 'home', label: 'Home', icon: Layers, children: [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3, target: { mainTab: null } },
        { id: 'training', label: 'Training', icon: Terminal, target: { mainTab: 'training' } },
      ],
    },
    {
      id: 'pickers', label: 'Pickers', icon: ClipboardList, children: [
        { id: 'pickers_ready', label: 'Ready to Pick', icon: ClipboardList, target: { mainTab: 'pickers', subTab: 'pickers_ready' } },
        { id: 'pickers_waiting', label: 'Waiting on Stock', icon: Clock, target: { mainTab: 'pickers', subTab: 'pickers_waiting' } },
        { id: 'pickers_picked', label: 'Picked Orders', icon: Package, target: { mainTab: 'pickers', subTab: 'pickers_picked' } },
      ],
    },
    {
      id: 'inventory', label: 'Inventory', icon: Package,
      children: categories.map((category) => ({
        id: `inventory_category:${category.id}`,
        label: category.name || 'Unnamed Category',
        icon: Shirt,
        target: { mainTab: 'inventory_view', categoryId: category.id },
      })),
    },
    { id: 'management', label: 'Management', icon: Wrench, children: MANAGEMENT_ITEMS },
    {
      id: 'admin', label: 'Admin', icon: Settings, children: [
        { id: 'staff', label: 'Manage Staff', icon: Users, target: { mainTab: 'staff' } },
        { id: 'dev_tools', label: 'Dev Tools', icon: Terminal, target: { mainTab: 'dev' } },
        { id: 'statistics', label: 'Statistics', icon: BarChart3, target: { mainTab: 'statistics' } },
      ],
    },
    {
      id: 'profile', label: 'Profile', icon: User, children: [
        { id: 'account', label: 'Profile Settings', icon: User, target: { mainTab: 'account' } },
      ],
    },
  ];
}

export function flattenNavigationTree(tree: NavigationItem[]): NavigationItem[] {
  return tree.flatMap((item) => [item, ...flattenNavigationTree(item.children || [])]);
}

export function expandNavigationPermissions(navTree: NavigationItem[], permissions: string[]): string[] {
  if (permissions.includes('*')) return flattenNavigationTree(navTree).map(({ id }) => id);
  const expanded = new Set<string>();
  const visit = (items: NavigationItem[], ancestors: string[]) => {
    items.forEach((item) => {
      const inheritedWildcard = ancestors.some((ancestor) => permissions.includes(`${ancestor}:*`));
      if (permissions.includes(item.id) || permissions.includes(`${item.id}:*`) || inheritedWildcard) {
        expanded.add(item.id);
        visit(item.children || [], [...ancestors, item.id]);
      }
    });
  };
  visit(navTree, []);
  return Array.from(expanded);
}

function hasPermission(itemId: string, permissions: string[], ancestors: string[]): boolean {
  return permissions.includes('*')
    || permissions.includes(itemId)
    || permissions.includes(`${itemId}:*`)
    || ancestors.some((ancestor) => permissions.includes(`${ancestor}:*`));
}

export function filterNavTreeByPermissions(
  navTree: NavigationItem[],
  userPermissions: string[],
  ancestors: string[] = [],
): NavigationItem[] {
  return navTree.flatMap((item) => {
    if (!hasPermission(item.id, userPermissions, ancestors)) return [];
    if (!item.children) return [item];

    const children = filterNavTreeByPermissions(item.children, userPermissions, [...ancestors, item.id]);
    return children.length > 0 ? [{ ...item, children }] : [];
  });
}

export function canAccessNavigationTarget(
  navTree: NavigationItem[],
  userPermissions: string[],
  target: NavigationTarget,
): boolean {
  const path = findNavigationPath(navTree, (item) => item.target
    && item.target.mainTab === target.mainTab
    && item.target.subTab === target.subTab
    && item.target.categoryId === target.categoryId);
  return !!path && hasNavigationPathPermissions(path, userPermissions);
}

export function hasNavigationPermission(navTree: NavigationItem[], userPermissions: string[], targetId: string): boolean {
  const path = findNavigationPath(navTree, (item) => item.id === targetId);
  return !!path && hasNavigationPathPermissions(path, userPermissions);
}

function findNavigationPath(
  navTree: NavigationItem[],
  matches: (item: NavigationItem) => boolean,
  ancestors: NavigationItem[] = [],
): NavigationItem[] | null {
  for (const item of navTree) {
    const path = [...ancestors, item];
    if (matches(item)) return path;
    const childPath = findNavigationPath(item.children || [], matches, path);
    if (childPath) return childPath;
  }
  return null;
}

function hasNavigationPathPermissions(path: NavigationItem[], userPermissions: string[]): boolean {
  return path.every((item, index) => hasPermission(item.id, userPermissions, path.slice(0, index).map(({ id }) => id)));
}
