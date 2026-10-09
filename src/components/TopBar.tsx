import type { ReactNode } from 'react';

export function TopBar({ name, right }: { name: string; right?: ReactNode }) {
  return (
    <header className="topbar">
      <div className="container topbar-in">
        <a className="brand" href="/">
          <span className="logo">麺</span>
          <span className="name">{name}</span>
        </a>
        <nav className="nav" />
        <div className="topbar-right">{right}</div>
      </div>
    </header>
  );
}
