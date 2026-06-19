import React from 'react';
import { DIR_ICONS, getSystemDirectories } from '../../pages/AddressBook/constants';
import type { ApiAddressBookSummary } from '../../api/types/addressBook';

type Props = {
  lang: 'en' | 'el';
  summary: ApiAddressBookSummary | null;
  activeNode: string;
  selectNode: (id: string) => void;
};

export const DirectoryPane: React.FC<Props> = ({ lang, summary, activeNode, selectNode }) => {
  const nodes = getSystemDirectories(lang);

  const countFor = (id: string) => {
    if (!summary) return 0;
    if (id === 'all') return summary.all;
    if (id === 'my') return summary.my_locations;
    if (id === 'customer') return summary.customers;
    if (id === 'archived') return summary.archived;
    return 0;
  };

  return (
    <div className="dir-pane">
      <div className="dir-pane-head">{lang === 'el' ? 'Κατάλογος' : 'Directory'}</div>
      {nodes.map((d, index) => (
        <React.Fragment key={d.id}>
          {d.id === 'archived' && <div className="dir-sep" />}
          <div
            className={`dir-node ${activeNode === d.id ? 'active' : ''} ${d.id === 'archived' ? 'opacity-60' : ''}`}
            onClick={() => selectNode(d.id)}
            onKeyDown={(e) => e.key === 'Enter' && selectNode(d.id)}
            role="button"
            tabIndex={0}
          >
            {DIR_ICONS[d.icon] || DIR_ICONS.folder}
            <span className="dir-node-label">{d.name}</span>
            <span className="dir-count">{countFor(d.id)}</span>
          </div>
          {index === 0 && <div className="dir-sep" />}
        </React.Fragment>
      ))}
    </div>
  );
};
