package com.anonymous.badanuri

import android.app.Activity
import android.widget.FrameLayout
import com.facebook.react.uimanager.ThemedReactContext
import org.osmdroid.api.IMapController
import org.osmdroid.util.GeoPoint
import vw.BasemapType
import vw.CameraPosition
import vw.Coord
import vw.DensityType
import vw.Map
import vw.MapOptions
import vw.interaction.PinchZoom

class VWorldMapView(private val reactContext: ThemedReactContext) : FrameLayout(reactContext) {
  private var map: Map? = null
  private var mapController: IMapController? = null

  var latitude: Double = 37.5665
    private set
  var longitude: Double = 126.978
    private set
  private var zoom: Int = 7

  init {
    setWillNotDraw(false)
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    if (map == null) {
      post { createMap() }
    }
  }

  override fun onDetachedFromWindow() {
    map?.mapView?.onDetach()
    map = null
    mapController = null
    super.onDetachedFromWindow()
  }

  fun setCenter(nextLatitude: Double, nextLongitude: Double) {
    latitude = nextLatitude
    longitude = nextLongitude
    applyCamera()
  }

  fun setZoomLevel(nextZoom: Int) {
    zoom = nextZoom.coerceIn(4, 13)
    applyCamera()
  }

  private fun createMap() {
    if (map != null || width == 0 || height == 0) {
      return
    }

    val options = MapOptions().apply {
      setBasemapType(BasemapType.GRAPHIC)
      setControlsDensity(DensityType.EMPTY)
      setInteractionsDensity(DensityType.EMPTY)
      setInitPostion(CameraPosition().apply {
        setCenter(Coord(longitude, latitude))
        setZoom(zoom.toFloat())
        setRotation(0f)
      })
    }

    map = Map(this, options).also { vworldMap ->
      (reactContext.currentActivity as? Activity)?.let { vworldMap.setActivity(it) }
      if (BuildConfig.VWORLD_API_KEY.isNotBlank()) {
        vworldMap.setServiceKey(BuildConfig.VWORLD_API_KEY)
      }
      PinchZoom(vworldMap)
      vworldMap.mapView.setMultiTouchControls(true)
      mapController = vworldMap.mapView.controller
      applyCamera()
    }
  }

  private fun applyCamera() {
    val controller = mapController ?: return
    controller.setCenter(GeoPoint(latitude, longitude))
    controller.setZoom(zoom)
    map?.invalidate()
  }
}
