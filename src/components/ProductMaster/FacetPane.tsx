import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import type { ProductMasterState } from '../../pages/ProductMaster/hooks/useProductMaster';

type Props = Pick<
  ProductMasterState,
  | 'categories'
  | 'productTypes'
  | 'totalSkusCount'
  | 'getCategoryCount'
  | 'getTypeCount'
  | 'viewMode'
  | 'setViewMode'
  | 'activeCat'
  | 'setActiveCat'
  | 'activeType'
  | 'setActiveType'
  | 'unmappedCount'
  | 'activeCount'
  | 'inactiveCount'
  | 'filterActive'
  | 'setFilterActive'
  | 'catName'
  | 'loadTypeDetail'
  | 'clearSelection'
>;

export const FacetPane: React.FC<Props> = ({
  categories,
  productTypes,
  totalSkusCount,
  getCategoryCount,
  getTypeCount,
  viewMode,
  setViewMode,
  activeCat,
  setActiveCat,
  activeType,
  setActiveType,
  unmappedCount,
  activeCount,
  inactiveCount,
  filterActive,
  setFilterActive,
  catName,
  loadTypeDetail,
  clearSelection,
}) => {
  const { t } = useTranslation();

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
    loadTypeDetail(type);
  };

  const toggleStatusFilter = (status: 'active' | 'inactive') => {
    setFilterActive(filterActive === status ? '' : status);
    clearSelection();
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
            {t('typesLabel')}
          </button>
        </div>
      </div>

      <div className={`cat-node${activeCat === 'all' ? ' act' : ''}`} onClick={() => selectCat('all')} role="button" tabIndex={0}>
        <span className="ico">📁</span>
        {viewMode === 'types' ? t('allTypes') : t('allItems')}
        <span className="cnt">{viewMode === 'types' ? productTypes.length : totalSkusCount}</span>
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
        const nodeCount = viewMode === 'types'
          ? productTypes.filter((x) => x.catId === c.id).length
          : getCategoryCount(c.id);
        if (nodeCount === 0 && activeCat !== c.id) return null;

        const isCatActive = activeCat === c.id;
        const catTypes = productTypes.filter((x) => x.catId === c.id && x.active);

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
                {catTypes.map((type) => (
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
                    <span className="cnt">{getTypeCount(c.id, type.id)}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        );
      })}
      <div className="facet-sep" />

      {viewMode === 'skus' && (
        <>
          <div className="facet-sep" />
          <div className="facet-label">{t('status')}</div>
          <div
            className={`cat-node${filterActive === 'active' ? ' act' : ''}`}
            onClick={() => toggleStatusFilter('active')}
            role="button"
            tabIndex={0}
          >
            <span className="ico">✓</span>
            {t('active')}
            <span className="cnt">{activeCount}</span>
          </div>
          <div
            className={`cat-node${filterActive === 'inactive' ? ' act' : ''}`}
            onClick={() => toggleStatusFilter('inactive')}
            role="button"
            tabIndex={0}
          >
            <span className="ico">○</span>
            {t('inactive')}
            <span className="cnt">{inactiveCount}</span>
          </div>
        </>
      )}
    </div>
  );
};
