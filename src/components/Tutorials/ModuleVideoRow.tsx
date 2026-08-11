import React from 'react';
import { Play } from 'lucide-react';

interface ModuleVideoRowProps {
  title: string;
  onClick: () => void;
}

export const ModuleVideoRow: React.FC<ModuleVideoRowProps> = ({ title, onClick }) => {
  return (
    <button type="button" className="tut-mod-row" onClick={onClick}>
      <span className="tut-mod-row-play" aria-hidden>
        <Play size={12} fill="currentColor" />
      </span>
      <span className="tut-mod-row-title">{title}</span>
    </button>
  );
};
