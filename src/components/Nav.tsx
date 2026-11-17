import { Icon } from './Icon';

export type Tab = 'home' | 'jenesis' | 'tasks' | 'agenda' | 'notes' | 'settings';

const items: Array<{ tab: Tab; label: string; icon: Parameters<typeof Icon>[0]['name'] }> = [
  { tab: 'home', label: 'Home', icon: 'home' },
  { tab: 'jenesis', label: 'Jenesis', icon: 'mic' },
  { tab: 'tasks', label: 'Tasks', icon: 'tasks' },
  { tab: 'agenda', label: 'Agenda', icon: 'calendar' },
  { tab: 'notes', label: 'Notes', icon: 'notes' },
];

interface NavProps {
  tab: Tab;
  onChange: (tab: Tab) => void;
}

export function Sidebar({ tab, onChange }: NavProps) {
  return (
    <aside className="sidebar" aria-label="Primary">
      <div className="sidebar-brand">
        <span className="mark" aria-hidden="true">J</span>
        <div>
          <p className="brand-name">Jenesis</p>
          <p className="brand-sub">Personal intelligence</p>
        </div>
      </div>
      <nav className="sidebar-nav">
        {items.map((item) => (
          <button
            key={item.tab}
            type="button"
            className={`nav-item${tab === item.tab ? ' is-active' : ''}`}
            aria-current={tab === item.tab ? 'page' : undefined}
            onClick={() => onChange(item.tab)}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <button
        type="button"
        className={`nav-item nav-item--soft${tab === 'settings' ? ' is-active' : ''}`}
        onClick={() => onChange('settings')}
      >
        <Icon name="settings" />
        <span>Settings</span>
      </button>
      <p className="sidebar-foot">Everything is stored on this device.</p>
    </aside>
  );
}

export function BottomNav({ tab, onChange }: NavProps) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map((item) => (
        <button
          key={item.tab}
          type="button"
          className={`tab${tab === item.tab ? ' is-active' : ''}`}
          aria-current={tab === item.tab ? 'page' : undefined}
          onClick={() => onChange(item.tab)}
        >
          <Icon name={item.icon} size={22} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
