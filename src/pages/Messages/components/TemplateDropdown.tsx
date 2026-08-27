import React from 'react';
import {
  Clock,
  AlertTriangle,
  FileText,
  Calendar,
  Camera,
  Truck,
} from 'lucide-react';
import type { QuickTemplate } from '../types';

interface TemplateDropdownProps {
  templates: QuickTemplate[];
  isOpen: boolean;
  onSelectTemplate: (tpl: QuickTemplate) => void;
  onClose: () => void;
  t: (key: string) => string;
}

export const TemplateDropdown: React.FC<TemplateDropdownProps> = ({
  templates,
  isOpen,
  onSelectTemplate,
  t,
}) => {
  if (!isOpen) return null;

  const renderIcon = (type: QuickTemplate['iconType']) => {
    switch (type) {
      case 'clock':
        return <Clock size={16} />;
      case 'alert':
        return <AlertTriangle size={16} />;
      case 'file':
        return <FileText size={16} />;
      case 'calendar':
        return <Calendar size={16} />;
      case 'camera':
        return <Camera size={16} />;
      case 'truck':
        return <Truck size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  return (
    <div className="tpl-dropdown" style={{ display: 'block' }}>
      <div className="tpl-head">{t('chatModule.tplTitle')}</div>
      {templates.map((tpl) => (
        <div
          key={tpl.id}
          className="tpl-item"
          onClick={() => onSelectTemplate(tpl)}
        >
          {renderIcon(tpl.iconType)}
          <div>
            <div className="tpl-name">{t(`chatModule.${tpl.nameKey}`)}</div>
            <div className="tpl-desc">{t(`chatModule.${tpl.descKey}`)}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
