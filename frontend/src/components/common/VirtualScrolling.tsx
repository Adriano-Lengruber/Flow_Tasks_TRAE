import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FixedSizeList as List, VariableSizeList, ListOnScrollProps } from 'react-window';
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

// Interface para itens de lista virtual
interface VirtualListItem {
  id: string | number;
  [key: string]: any;
}

// Props para VirtualList
interface VirtualListProps {
  items: VirtualListItem[];
  itemHeight: number | ((index: number) => number);
  renderItem: (props: { index: number; style: React.CSSProperties; data: VirtualListItem }) => React.ReactNode;
  className?: string;
  overscanCount?: number;
  onScroll?: (scrollTop: number) => void;
  height?: number;
}

// Props para VirtualGrid
interface VirtualGridProps {
  items: VirtualListItem[];
  columnCount: number;
  rowHeight: number;
  columnWidth: number;
  renderCell: (props: { 
    columnIndex: number; 
    rowIndex: number; 
    style: React.CSSProperties; 
    data: VirtualListItem | undefined;
  }) => React.ReactNode;
  className?: string;
  overscanCount?: number;
  height?: number;
}

// Props para VirtualTable
interface VirtualTableColumn {
  key: string;
  title: string;
  width: number;
  render?: (value: any, item: VirtualListItem, index: number) => React.ReactNode;
}

interface VirtualTableProps {
  items: VirtualListItem[];
  columns: VirtualTableColumn[];
  rowHeight?: number;
  headerHeight?: number;
  className?: string;
  onRowClick?: (item: VirtualListItem, index: number) => void;
  height?: number;
}

// Hook para otimização de scroll
export const useVirtualScrolling = (itemCount: number, itemHeight: number) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  
  const visibleRange = useMemo(() => {
    if (containerHeight === 0) return { start: 0, end: 0 };
    
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(start + visibleCount + 1, itemCount);
    
    return { start: Math.max(0, start - 1), end };
  }, [scrollTop, containerHeight, itemHeight, itemCount]);
  
  return {
    scrollTop,
    setScrollTop,
    containerHeight,
    setContainerHeight,
    visibleRange
  };
};

// Componente VirtualList
export const VirtualList: React.FC<VirtualListProps> = ({
  items,
  itemHeight,
  renderItem,
  className = '',
  overscanCount = 5,
  onScroll,
  height = 400
}) => {
  const listRef = useRef<any>(null);
  
  const itemData = useMemo(() => items, [items]);
  
  const handleScroll = (props: ListOnScrollProps) => {
    onScroll?.(props.scrollOffset);
  };
  
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = itemData[index];
    return (
      <div style={style}>
        {renderItem({ index, style: {}, data: item })}
      </div>
    );
  };
  
  if (typeof itemHeight === 'number') {
    return (
      <div className={`virtual-list ${className}`} style={{ height }}>
        <AutoSizer>
          {({ height: autoHeight, width }: { height: number; width: number }) => (
            <List
              ref={listRef}
              height={autoHeight}
              width={width}
              itemCount={items.length}
              itemSize={itemHeight}
              itemData={itemData}
              overscanCount={overscanCount}
              onScroll={handleScroll}
            >
              {Row}
            </List>
          )}
        </AutoSizer>
      </div>
    );
  }
  
  // Variable height list
  const VariableRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = itemData[index];
    return (
      <div style={style}>
        {renderItem({ index, style: {}, data: item })}
      </div>
    );
  };
  
  return (
    <div className={`virtual-list ${className}`} style={{ height }}>
      <AutoSizer>
        {({ height: autoHeight, width }: { height: number; width: number }) => (
          <VariableSizeList
            ref={listRef}
            height={autoHeight}
            width={width}
            itemCount={items.length}
            itemSize={itemHeight as (index: number) => number}
            itemData={itemData}
            overscanCount={overscanCount}
            onScroll={handleScroll}
          >
            {VariableRow}
          </VariableSizeList>
        )}
      </AutoSizer>
    </div>
  );
};

// Componente VirtualGrid
export const VirtualGrid: React.FC<VirtualGridProps> = ({
  items,
  columnCount,
  rowHeight,
  columnWidth,
  renderCell,
  className = '',
  overscanCount = 5,
  height = 400
}) => {
  const gridRef = useRef<any>(null);
  const rowCount = Math.ceil(items.length / columnCount);
  
  const Cell = ({ 
    columnIndex, 
    rowIndex, 
    style 
  }: { 
    columnIndex: number; 
    rowIndex: number; 
    style: React.CSSProperties;
  }) => {
    const itemIndex = rowIndex * columnCount + columnIndex;
    const item = items[itemIndex];
    
    return (
      <div style={style}>
        {renderCell({ columnIndex, rowIndex, style: {}, data: item })}
      </div>
    );
  };
  
  return (
    <div className={`virtual-grid ${className}`} style={{ height }}>
      <AutoSizer>
        {({ height: autoHeight, width }: { height: number; width: number }) => (
          <Grid
            ref={gridRef}
            height={autoHeight}
            width={width}
            columnCount={columnCount}
            columnWidth={columnWidth}
            rowCount={rowCount}
            rowHeight={rowHeight}
            overscanCount={overscanCount}
          >
            {Cell}
          </Grid>
        )}
      </AutoSizer>
    </div>
  );
};

// Componente VirtualTable
export const VirtualTable: React.FC<VirtualTableProps> = ({
  items,
  columns,
  rowHeight = 50,
  headerHeight = 40,
  className = '',
  onRowClick,
  height = 400
}) => {
  const tableRef = useRef<any>(null);
  
  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
  
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = items[index];
    
    return (
      <div 
        style={{
          ...style,
          display: 'flex',
          borderBottom: '1px solid #e0e0e0',
          cursor: onRowClick ? 'pointer' : 'default'
        }}
        onClick={() => onRowClick?.(item, index)}
        className="virtual-table-row"
      >
        {columns.map((column) => (
          <div
            key={column.key}
            style={{
              width: column.width,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              borderRight: '1px solid #e0e0e0'
            }}
            className="virtual-table-cell"
          >
            {column.render 
              ? column.render(item[column.key], item, index)
              : item[column.key]
            }
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className={`virtual-table ${className}`} style={{ height }}>
      {/* Header */}
      <div 
        style={{
          height: headerHeight,
          display: 'flex',
          backgroundColor: '#f5f5f5',
          borderBottom: '2px solid #d0d0d0',
          fontWeight: 'bold'
        }}
        className="virtual-table-header"
      >
        {columns.map((column) => (
          <div
            key={column.key}
            style={{
              width: column.width,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              borderRight: '1px solid #d0d0d0'
            }}
            className="virtual-table-header-cell"
          >
            {column.title}
          </div>
        ))}
      </div>
      
      {/* Body */}
      <div style={{ height: height - headerHeight }}>
        <AutoSizer>
          {({ height: autoHeight, width }: { height: number; width: number }) => (
            <List
              ref={tableRef}
              height={autoHeight}
              width={Math.max(width, totalWidth)}
              itemCount={items.length}
              itemSize={rowHeight}
              itemData={items}
            >
              {Row}
            </List>
          )}
        </AutoSizer>
      </div>
    </div>
  );
};

// Hook para infinite scrolling
export const useInfiniteScroll = ({
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage
}: {
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
}) => {
  const [isFetching, setIsFetching] = useState(false);
  
  useEffect(() => {
    if (!isFetching) return;
    if (!hasNextPage || isFetchingNextPage) {
      setIsFetching(false);
      return;
    }
    
    fetchNextPage();
    setIsFetching(false);
  }, [isFetching, hasNextPage, fetchNextPage, isFetchingNextPage]);
  
  const handleScroll = (scrollTop: number, scrollHeight: number, clientHeight: number) => {
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      setIsFetching(true);
    }
  };
  
  return { handleScroll, isFetching };
};

// Componente VirtualInfiniteList
interface VirtualInfiniteListProps extends Omit<VirtualListProps, 'onScroll'> {
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  loadingComponent?: React.ReactNode;
}

export const VirtualInfiniteList: React.FC<VirtualInfiniteListProps> = ({
  items,
  itemHeight,
  renderItem,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  loadingComponent,
  ...props
}) => {
  const { handleScroll } = useInfiniteScroll({
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  });
  
  const onScroll = ({ scrollTop, scrollHeight, clientHeight }: {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
  }) => {
    handleScroll(scrollTop, scrollHeight, clientHeight);
  };
  
  return (
    <div>
      <VirtualList
        items={items}
        itemHeight={itemHeight}
        renderItem={renderItem}
        onScroll={(scrollTop) => {
          // Note: react-window doesn't provide scrollHeight and clientHeight directly
          // This is a simplified version - in production, you'd need to track these values
        }}
        {...props}
      />
      {isFetchingNextPage && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          {loadingComponent || 'Carregando mais itens...'}
        </div>
      )}
    </div>
  );
};

export default VirtualList;