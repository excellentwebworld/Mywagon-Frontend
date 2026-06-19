import React from 'react';
import { DIR_ICONS, ICON_NAMES } from '../../pages/AddressBook/constants';
import type { AddressBookState } from '../../pages/AddressBook/hooks/useAddressBook';
import { getDirectoryWarnings, getNodeCountFromSummary } from '../../pages/AddressBook/utils/locationUtils';

type Props = Pick<
  AddressBookState,
  | 'lang'
  | 'locations'
  | 'summary'
  | 'directories'
  | 'activeNode'
  | 'selectNode'
  | 'deleteDirectory'
  | 'addingDir'
  | 'setAddingDir'
  | 'newDirName'
  | 'setNewDirName'
  | 'newDirIcon'
  | 'setNewDirIcon'
  | 'iconPickerOpen'
  | 'setIconPickerOpen'
  | 'saveNewDir'
>;

export const DirectoryPane: React.FC<Props> = ({
  lang,
  locations,
  summary,
  directories,
  activeNode,
  selectNode,
  deleteDirectory,
  addingDir,
  setAddingDir,
  newDirName,
  setNewDirName,
  newDirIcon,
  setNewDirIcon,
  iconPickerOpen,
  setIconPickerOpen,
  saveNewDir,
}) => (
  <div className="dir-pane">
    <div className="dir-pane-head">{lang === 'el' ? 'Κατάλογος' : 'Directory'}</div>

    {directories.map((d) => {
      const count = getNodeCountFromSummary(d, summary, locations);
      const isAct = activeNode === d.id;
      const isArch = d.id === 'archived';
      const warnings = getDirectoryWarnings(d, locations);

      return (
        <React.Fragment key={d.id}>
          {isArch && <div className="dir-sep" />}
          <div
            className={`dir-node ${isAct ? 'active' : ''} ${isArch ? 'opacity-60' : ''}`}
            onClick={() => selectNode(d.id)}
            onKeyDown={(e) => e.key === 'Enter' && selectNode(d.id)}
            role="button"
            tabIndex={0}
          >
            {DIR_ICONS[d.icon] || DIR_ICONS.folder}
            <span className="dir-node-label">{d.name}</span>
            <div className="dir-trailing">
              {warnings > 0 && <span className="dir-warn" title={`${warnings} locations need data`} />}
              <span className="dir-count">{count}</span>
              {!d.system && (
                <button
                  type="button"
                  className="dir-del"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteDirectory(d.id, d.name);
                  }}
                  title="Delete"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          {d.id === 'all' && <div className="dir-sep" />}
        </React.Fragment>
      );
    })}

    {addingDir ? (
      <div className="dir-edit-row">
        <div className="icon-picker-wrap">
          <button
            type="button"
            className="icon-picker-btn"
            onClick={() => setIconPickerOpen(!iconPickerOpen)}
          >
            {DIR_ICONS[newDirIcon]}
          </button>
          {iconPickerOpen && (
            <div className="icon-picker-dd open">
              {ICON_NAMES.map((ic) => (
                <div
                  key={ic}
                  className={`ip-opt ${newDirIcon === ic ? 'selected' : ''}`}
                  onClick={() => {
                    setNewDirIcon(ic);
                    setIconPickerOpen(false);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && setNewDirIcon(ic)}
                  role="button"
                  tabIndex={0}
                >
                  {DIR_ICONS[ic]}
                </div>
              ))}
            </div>
          )}
        </div>
        <input
          type="text"
          placeholder="Directory name…"
          value={newDirName}
          onChange={(e) => setNewDirName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveNewDir();
            if (e.key === 'Escape') setAddingDir(false);
          }}
          autoFocus
        />
        <button type="button" className="save-btn" onClick={saveNewDir}>
          Save
        </button>
        <button type="button" className="cancel-btn" onClick={() => setAddingDir(false)}>
          Cancel
        </button>
      </div>
    ) : (
      <button type="button" className="dir-add-btn" onClick={() => setAddingDir(true)}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {lang === 'el' ? 'Προσθήκη καταλόγου' : 'Add directory'}
      </button>
    )}
  </div>
);
