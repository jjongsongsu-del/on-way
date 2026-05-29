import { requireNativeComponent, type ViewProps } from 'react-native';

type VWorldNativeMapProps = ViewProps & {
  latitude: number;
  longitude: number;
  zoom: number;
};

export const VWorldNativeMap = requireNativeComponent<VWorldNativeMapProps>('VWorldMapView');
