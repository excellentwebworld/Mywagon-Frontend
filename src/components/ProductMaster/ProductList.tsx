import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import type { ProductMasterState } from '../../pages/ProductMaster/hooks/useProductMaster';
import { syncDotClass } from '../../pages/ProductMaster/utils/productUtils';
import { TableLoadingOverlay } from '../ui/TableLoadingOverlay';
import { Pagination } from '../ui/Pagination';

type Props = Pick<
  ProductMasterState,
  | 'viewMode'
  | 'sortBy'
  | 'setSortBy'
  | 'filteredSkus'
  | 'filteredTypes'
  | 'categories'
  | 'productTypes'
  | 'catName'
  | 'selectedIds'
  | 'selectedItem'
  | 'selectedKind'
  | 'loadSkuDetail'
  | 'loadTypeDetail'
  | 'handleSelectAll'
  | 'handleToggleRowSelection'
  | 'handleBulkArchive'
  | 'loading'
  | 'listLoading'
  | 'currentPage'
  | 'setCurrentPage'
  | 'perPage'
  | 'setPerPage'
  | 'listMeta'
  | 'filterCat'
  | 'setFilterCat'
  | 'filterActive'
  | 'setFilterActive'
  | 'clearSelection'
>;

export const ProductList: React.FC<Props> = ({
  viewMode,
  sortBy,
  setSortBy,
  filteredSkus,
  filteredTypes,
  categories,
  productTypes,
  catName,
  selectedIds,
  selectedItem,
  selectedKind,
  loadSkuDetail,
  loadTypeDetail,
  handleSelectAll,
  handleToggleRowSelection,
  handleBulkArchive,
  loading,
  listLoading,
  currentPage,
  setCurrentPage,
  perPage,
  setPerPage,
  listMeta,
  filterCat,
  setFilterCat,
  filterActive,
  setFilterActive,
  clearSelection,
}) => {
  const { t } = useTranslation();
  const tableBusy = listLoading;
  return (
    <div className="list-pane">
      <div className="list-toolbar">
        <span style={{ fontSize: 12, color: 'var(--t2)', fontWeight: 500 }}>
          {viewMode === 'types' ? t('productTypesHeader') : t('skuRegistry')}
        </span>
        {viewMode === 'skus' && (
          <select className="sort-sel" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
            <option value="name">Name A–Z</option>
            <option value="number">SKU Number</option>
            <option value="type">Product Type</option>
            <option value="status">Status</option>
          </select>
        )}
        <span className="list-info">
          {viewMode === 'types'
            ? `${filteredTypes.length} ${t('types')}`
            : `${filteredSkus.length} SKUs`}
        </span>
      </div>

      {selectedIds.size > 0 && viewMode === 'skus' && (
        <div className="bulk-bar">
          <span className="bulk-ct">{selectedIds.size}</span>
          <span>{t('selected')}</span>
          <button type="button" className="btn btn-sm btn-danger" onClick={handleBulkArchive}>
            {t('archive')}
          </button>
        </div>
      )}

      {viewMode === 'types' ? (
        <div className={`types-grid table-scroll-host${tableBusy ? ' loading-active' : ''}`}>
          <TableLoadingOverlay active={tableBusy} message={t('loadingProducts')} />
          {filteredTypes.length === 0 && !tableBusy ? (
            <div className="empty-state">
              <div className="ico">📦</div>
              <div className="et">{t('noTypes')}</div>
            </div>
          ) : (
            filteredTypes.map((x) => {
              const cat = categories.find((c) => c.id === x.catId);
              const typeSkus = x.skuCount ?? 0;
              const isSel = selectedItem?.id === x.id && selectedKind === 'type';

              return (
                <div
                  key={x.id}
                  className="type-card"
                  onClick={() => loadTypeDetail(x)}
                  style={isSel ? { borderColor: 'var(--ac)', background: 'var(--ap)' } : undefined}
                  role="button"
                  tabIndex={0}
                >
                  <div className="tc-cat">{cat ? `${cat.icon} ${catName(cat)}` : ''}</div>
                  <div className="tc-name">{x.name}</div>
                  <div className="tc-stats">
                    <div className="tc-stat">
                      <strong>{typeSkus}</strong>
                      SKUs
                    </div>
                    <div className="tc-stat">
                      <strong>{x.shipmentTotal ?? 0}</strong>
                      Shipments
                    </div>
                    <div className="tc-stat">
                      <strong>{x.s30}</strong>
                      Last 30d
                    </div>
                    <div className="tc-stat">
                      <strong>{x.s90}</strong>
                      Last 90d
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className={`tbl-scroll table-scroll-host${tableBusy ? ' loading-active' : ''}`}>
          <TableLoadingOverlay active={tableBusy} message={t('loadingProducts')} />
          {filteredSkus.length === 0 && !tableBusy ? (
            <div className="empty-state">
              <div className="ico">📦</div>
              <div className="et">{t('noSkusFound')}</div>
            </div>
          ) : (
            <table className="t">
              <thead>
                <tr>
                  <th style={{ width: 30 }}>
                    <input
                      type="checkbox"
                      checked={filteredSkus.length > 0 && selectedIds.size === filteredSkus.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th>{t('sku')}</th>
                  <th>{t('productType')}</th>
                  <th>{t('category')}</th>
                  <th>{t('source')}</th>
                  <th>{t('syncStatus')}</th>
                  <th>{t('lastSynced')}</th>
                  <th>{t('status')}</th>
                </tr>
                <tr className="col-filters">
                  <th />
                  <th />
                  <th />
                  <th>
                    <select
                      className="col-filter-sel"
                      value={filterCat}
                      onChange={(e) => {
                        setFilterCat(e.target.value);
                        clearSelection();
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="">{t('all')}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {catName(c)}
                        </option>
                      ))}
                    </select>
                  </th>
                  <th />
                  <th />
                  <th />
                  <th>
                    <select
                      className="col-filter-sel"
                      value={filterActive}
                      onChange={(e) => {
                        setFilterActive(e.target.value);
                        clearSelection();
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="">{t('all')}</option>
                      <option value="active">{t('active')}</option>
                      <option value="inactive">{t('inactive')}</option>
                    </select>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSkus.map((s) => {
                  const tp = productTypes.find((x) => x.id === s.typeId);
                  const cat = categories.find((x) => x.id === s.catId);
                  const isSel = selectedItem?.id === s.id && selectedKind === 'sku';

                  return (
                    <tr
                      key={s.id}
                      className={isSel ? 'sel' : ''}
                      onClick={() => loadSkuDetail(s)}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(s.id)}
                          onChange={() => handleToggleRowSelection(s.id)}
                        />
                      </td>
                      <td>
                        <div className="sku-name">{s.name}</div>
                        <div className="sku-num">{s.number}</div>
                      </td>
                      <td>
                        {tp ? (
                          <span className="type-pill">{tp.name}</span>
                        ) : (
                          <span style={{ color: 'var(--wr)', fontWeight: 600, fontSize: 11 }}>
                            ⚠ {t('unmapped')}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="cat-pill">{cat ? catName(cat) : '—'}</span>
                      </td>
                      <td>
                        <span className={`src-badge ${s.source === 'erp' ? 'src-erp' : 'src-manual'}`}>
                          {s.source === 'erp' ? 'ERP' : 'Manual'}
                        </span>
                      </td>
                      <td>
                        {s.source === 'erp' && s.erp.status ? (
                          <>
                            <span className={`sync-dot ${syncDotClass(s.erp.status)}`} />
                            <span className="sync-text">{s.erp.status}</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="ts-cell">{s.source === 'erp' ? s.erp.lastSync : '—'}</td>
                      <td>
                        <span className={s.active ? 'status-active' : 'status-inactive'}>
                          {s.active ? t('active') : t('inactive')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="pag">
        {viewMode === 'skus' && listMeta && (
          <Pagination
            t={t}
            total={listMeta.total ?? 0}
            currentPage={currentPage}
            perPage={perPage}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPerPage}
            showPageSizeSelector={true}
          />
        )}
      </div>
    </div>
  );
};
