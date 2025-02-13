import Map from "https://cdn.skypack.dev/ol/Map.js";
import View from "https://cdn.skypack.dev/ol/View.js";
import TileLayer from "https://cdn.skypack.dev/ol/layer/Tile.js";
import OSM from "https://cdn.skypack.dev/ol/source/OSM.js";
import Overlay from "https://cdn.skypack.dev/ol/Overlay.js";
import { toLonLat, fromLonLat } from "https://cdn.skypack.dev/ol/proj.js";
import Feature from "https://cdn.skypack.dev/ol/Feature.js";
import Point from "https://cdn.skypack.dev/ol/geom/Point.js";
import VectorSource from "https://cdn.skypack.dev/ol/source/Vector.js";
import VectorLayer from "https://cdn.skypack.dev/ol/layer/Vector.js";
import { Style, Icon } from "https://cdn.skypack.dev/ol/style.js";
import Swal from "https://cdn.skypack.dev/sweetalert2";

document
  .getElementById("hamburger-menu")
  .addEventListener("click", function () {
    document.getElementById("nav-list").classList.toggle("active");
  });

const tileLayer = new TileLayer({
  source: new OSM(),
  visible: true,
});

const map = new Map({
  target: "map",
  layers: [tileLayer],
  view: new View({
    center: fromLonLat([107.57634352477324, -6.87436891415509]),
    zoom: 16,
  }),
});

const popup = document.createElement("div");
popup.className = "popup";
document.body.appendChild(popup);

const overlay = new Overlay({
  element: popup,
  autoPan: true,
});
map.addOverlay(overlay);

const markerSource = new VectorSource();
const markerLayer = new VectorLayer({
  source: markerSource,
  visible: true,
});
map.addLayer(markerLayer);

let userCoordinates = null;
let gpsUsed = false;
let userLocationText = "";
let userLongitude = 0;
let userLatitude = 0;
let draggableMarker = null;

// **Ambil Lokasi GPS Pengguna**
navigator.geolocation.getCurrentPosition(
  (pos) => {
    userLatitude = pos.coords.latitude;
    userLongitude = pos.coords.longitude;
    userCoordinates = fromLonLat([userLongitude, userLatitude]);
    gpsUsed = true;

    map.getView().setCenter(userCoordinates);
    map.getView().setZoom(16);

    const userMarker = new Feature({
      geometry: new Point(userCoordinates),
    });

    userMarker.setStyle(
      new Style({
        image: new Icon({
          src: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
          scale: 0.05,
        }),
      })
    );
    userMarker.set("isUserLocation", true); // Tandai sebagai lokasi pengguna
    markerSource.addFeature(userMarker);

    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lon=${userLongitude}&lat=${userLatitude}`
    )
      .then((response) => response.json())
      .then((data) => {
        userLocationText = data.display_name || "Tidak ada data lokasi";
      })
      .catch(() => {
        Swal.fire("Error", "Gagal mendapatkan informasi lokasi.", "error");
      });
  },
  () => {
    Swal.fire(
      "Error",
      "Gagal mengambil lokasi. Pastikan Anda memberikan izin akses lokasi.",
      "error"
    );
  }
);

// **EVENT: Hover untuk Menampilkan Popup Lokasi Pengguna & Marker Biru**
map.on("pointermove", function (event) {
  let isFeatureHovered = false;

  map.forEachFeatureAtPixel(event.pixel, function (feature) {
    if (feature.get("isUserLocation")) {
      // **Tampilkan popup untuk lokasi pengguna**
      overlay.setPosition(userCoordinates);
      popup.innerHTML = `
                <div>
                    <h3>Lokasi Anda</h3>
                    <p><strong>Alamat:</strong> ${userLocationText}</p>
                    <p><strong>Koordinat:</strong> ${userLongitude.toFixed(
                      6
                    )}, ${userLatitude.toFixed(6)}</p>
                </div>
            `;
      isFeatureHovered = true;
    } else if (feature.get("isBlueMarker")) {
      // **Tampilkan popup untuk marker biru**
      const coords = feature.getGeometry().getCoordinates();
      const lonLat = toLonLat(coords);
      overlay.setPosition(coords);
      popup.innerHTML = `
                <div>
                    <h3>Marker yang Dipilih</h3>
                    <p><strong>Alamat:</strong> ${userLocationText}</p>
                    <p><strong>Koordinat:</strong> ${lonLat[0].toFixed(
                      6
                    )}, ${lonLat[1].toFixed(6)}</p>
                </div>
            `;
      isFeatureHovered = true;
    }
  });

  if (!isFeatureHovered) {
    overlay.setPosition(undefined);
  }
});

// **EVENT: Klik untuk Menambahkan Marker Biru yang Bisa Dipindahkan**
map.on("click", async function (event) {
  const clickedCoordinates = toLonLat(event.coordinate);
  const [longitude, latitude] = clickedCoordinates;

  try {
    // **Ambil Alamat dari OpenStreetMap API**
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lon=${longitude}&lat=${latitude}`
    );
    const data = await response.json();
    const locationName = data.display_name || "Alamat tidak ditemukan";

    // **Hapus marker sebelumnya jika ada**
    if (draggableMarker) {
      markerSource.removeFeature(draggableMarker);
    }

    // **Tambahkan Marker Biru Baru**
    draggableMarker = new Feature({
      geometry: new Point(fromLonLat([longitude, latitude])),
    });

    draggableMarker.setStyle(
      new Style({
        image: new Icon({
          src: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
          scale: 0.05,
          color: "blue", // Warna biru
        }),
      })
    );

    draggableMarker.set("isBlueMarker", true); // Tandai sebagai marker biru
    markerSource.addFeature(draggableMarker);

    // **Tampilkan Popup di Posisi Klik**
    popup.innerHTML = `
            <div>
                <h3>Informasi Lokasi</h3>
                <p><strong>Alamat:</strong> ${locationName}</p>
                <p><strong>Koordinat:</strong> ${longitude.toFixed(
                  6
                )}, ${latitude.toFixed(6)}</p>
            </div>
        `;
    overlay.setPosition(event.coordinate);

    // **Event untuk Menutup Popup**
    document.querySelector(".close-btn").addEventListener("click", () => {
      overlay.setPosition(undefined);
    });
  } catch (error) {
    console.error("Gagal mengambil alamat:", error);
  }
});

document.getElementById("set-source").onclick = function () {
  tileLayer.setVisible(true);
  Swal.fire("Layer Ditampilkan", "Layer peta telah diaktifkan.", "success");
};

document.getElementById("unset-source").onclick = function () {
  tileLayer.setVisible(false);
  Swal.fire("Layer Disembunyikan", "Layer peta telah disembunyikan.", "info");
};

map.on("pointerdrag", function (event) {
  if (draggableMarker) {
    const newCoordinates = toLonLat(event.coordinate);
    draggableMarker.getGeometry().setCoordinates(fromLonLat(newCoordinates));
    overlay.setPosition(event.coordinate);
  }
});
