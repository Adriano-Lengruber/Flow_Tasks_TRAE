declare module 'react-window-infinite-loader' {
  import { ComponentType, ReactElement } from 'react';

  export interface InfiniteLoaderProps {
    isItemLoaded: (index: number) => boolean;
    itemCount: number;
    loadMoreItems: (startIndex: number, stopIndex: number) => Promise<any> | void;
    threshold?: number;
    minimumBatchSize?: number;
    children: (props: {
      onItemsRendered: (props: {
        overscanStartIndex: number;
        overscanStopIndex: number;
        visibleStartIndex: number;
        visibleStopIndex: number;
      }) => void;
      ref: (ref: any) => void;
    }) => ReactElement;
  }

  const InfiniteLoader: ComponentType<InfiniteLoaderProps>;
  export default InfiniteLoader;
}