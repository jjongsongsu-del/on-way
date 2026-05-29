package com.anonymous.badanuri

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class VWorldMapViewManager : SimpleViewManager<VWorldMapView>() {
  override fun getName(): String = "VWorldMapView"

  override fun createViewInstance(reactContext: ThemedReactContext): VWorldMapView =
    VWorldMapView(reactContext)

  @ReactProp(name = "latitude", defaultDouble = 37.5665)
  fun setLatitude(view: VWorldMapView, latitude: Double) {
    view.setCenter(latitude, view.longitude)
  }

  @ReactProp(name = "longitude", defaultDouble = 126.978)
  fun setLongitude(view: VWorldMapView, longitude: Double) {
    view.setCenter(view.latitude, longitude)
  }

  @ReactProp(name = "zoom", defaultInt = 7)
  fun setZoom(view: VWorldMapView, zoom: Int) {
    view.setZoomLevel(zoom)
  }
}
