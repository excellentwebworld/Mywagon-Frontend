import React from 'react';
import type { ProductMasterState } from '../../pages/ProductMaster/hooks/useProductMaster';

type Props = Pick<
  ProductMasterState,
  | 'lang'
  | 't'
  | 'categories'
  | 'productTypes'
  | 'skus'
  | 'viewMode'
  | 'setViewMode'
  | 'activeCat'
  | 'setActiveCat'
  | 'activeType'
  | 'setActiveType'
  | 'unmappedCount'
  | 'catName'
  | 'setSelectedItem'
  | 'setSelectedKind'
  | 'clearSelection'
  | 'setIsCatOpen'
>;

export const FacetPane: React.FC<Props> = ({
  lang,
  t,
  categories,
  productTypes,
  skus,
  viewMode,
  setViewMode,
  activeCat,
  setActiveCat,
  activeType,
  setActiveType,
  unmappedCount,
  catName,
  setSelectedItem,
  setSelectedKind,
  clearSelection,
  setIsCatOpen,
}) => {
  const switchView = (mode: 'skus' | 'types') => {
    setViewMode(mode);
    clearSelection();
  };

  const selectCat = (catId: string) => {
    setActiveCat(catId);
    setActiveType('all');
    clearSelection();
  };

  const selectType = (typeId: string) => {
    setActiveType(typeId);
    clearSelection();
  };

  const selectTypeInfo = (type: (typeof productTypes)[0]) => {
    setSelectedItem(type);
    setSelectedKind('type');
  };

  return (
    <div className="facet-pane">
      <div className="facet-head">
        <span>{t('catalog')}</span>
        <div className="view-tog">
          <button type="button" className={viewMode === 'skus' ? 'act' : ''} onClick={() => switchView('skus')}>
            SKUs
          </button>
          <button type="button" className={viewMode === 'types' ? 'act' : ''} onClick={() => switchView('types')}>
            {lang === 'el' ? 'Τύποι' : 'Types'}
          </button>
        </div>
      </div>

      <div className={`cat-node${activeCat === 'all' ? ' act' : ''}`} onClick={() => selectCat('all')} role="button" tabIndex={0}>
        <span className="ico">📁</span>
        {lang === 'el' ? 'Όλα' : 'All'} {viewMode === 'types' ? (lang === 'el' ? 'Τύποι' : 'Types') : 'Items'}
        <span className="cnt">{viewMode === 'types' ? productTypes.filter((x) => x.active).length : skus.length}</span>
      </div>

      {viewMode === 'skus' && unmappedCount > 0 && (
        <div
          className={`cat-node${activeCat === 'unmapped' ? ' act' : ''}`}
          onClick={() => selectCat('unmapped')}
          style={{ color: 'var(--wr)' }}
          role="button"
          tabIndex={0}
        >
          <span className="ico">⚠️</span>
          {t('unmappedSkus')}
          <span className="cnt">{unmappedCount}</span>
        </div>
      )}

      <div className="facet-sep" />

      {categories.map((c) => {
        const hasSkus = skus.filter((s) => s.catId === c.id);
        const hasTypes = productTypes.filter((x) => x.catId === c.id && x.active);
        const nodeCount = viewMode === 'types' ? hasTypes.length : hasSkus.length;
        if (nodeCount === 0 && activeCat !== c.id) return null;

        const isCatActive = activeCat === c.id;
        const unmappedInCat = hasSkus.filter((s) => !s.typeId && s.active).length;

        return (
          <div key={c.id}>
            <div
              className={`cat-node${isCatActive ? ' act' : ''}`}
              onClick={() => selectCat(c.id)}
              role="button"
              tabIndex={0}
            >
              <span className="ico">{c.icon === 'fnb' ? '🍷🥨' : c.icon}</span>
              <span>{catName(c)}</span>
              <span className="cnt">{nodeCount}</span>
            </div>

            {isCatActive && viewMode === 'skus' && (
              <>
                {hasTypes.map((type) => {
                  const typeSkus = hasSkus.filter((s) => s.typeId === type.id).length;
                  return (
                    <div
                      key={type.id}
                      className={`type-node${activeType === type.id ? ' act' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectType(type.id);
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <button
                        type="button"
                        className="type-info-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectTypeInfo(type);
                        }}
                        title="Info"
                      >
                        ℹ
                      </button>
                      {type.name}
                      <span className="cnt">{typeSkus}</span>
                    </div>
                  );
                })}
                {unmappedInCat > 0 && (
                  <div
                    className={`type-node${activeType === 'unmapped-cat' ? ' act' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectType('unmapped-cat');
                    }}
                    style={{ color: 'var(--wr)' }}
                    role="button"
                    tabIndex={0}
                  >
                    ⚠ {t('unmapped')}
                    <span className="cnt">{unmappedInCat}</span>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      <div className="add-cat-btn" onClick={() => setIsCatOpen(true)} role="button" tabIndex={0}>
        + {t('addCatMenu')}
      </div>
    </div>
  );
};
