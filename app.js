const nodes = [
  {
    id: "node-01",
    meshId: "mesh-west",
    meshName: "West Mesh",
    name: "Gateway-01",
    status: "online",
    signal: "-58 dBm",
    clients: 5,
    lat: 37.7749,
    lon: -122.4194,
  },
  {
    id: "node-02",
    meshId: "mesh-west",
    meshName: "West Mesh",
    name: "Relay-02",
    status: "degraded",
    signal: "-84 dBm",
    clients: 2,
    lat: 37.7791,
    lon: -122.4075,
  },
  {
    id: "node-03",
    meshId: "mesh-east",
    meshName: "East Mesh",
    name: "Edge-03",
    status: "offline",
    signal: "n/a",
    clients: 0,
    lat: 37.7682,
    lon: -122.3958,
  },
  {
    id: "node-04",
    meshId: "mesh-east",
    meshName: "East Mesh",
    name: "Edge-04",
    status: "online",
    signal: "-66 dBm",
    clients: 3,
    lat: 37.7618,
    lon: -122.4175,
  },
];

const CONSOLIDATE_ZOOM_LEVEL = 13;
const THEME_STORAGE_KEY = "halow-mesh-theme";

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function renderNodeCard(node) {
  const card = document.createElement("article");
  card.className = "node-card";
  card.dataset.nodeId = node.id;

  card.innerHTML = `
    <div class="node-head">
      <span class="node-name">${node.name}</span>
      <span class="status-pill status-${node.status}">${titleCase(node.status)}</span>
    </div>
    <div class="node-meta">
      <span>ID: ${node.id}</span>
      <span>Signal: ${node.signal}</span>
      <span>Clients: ${node.clients}</span>
    </div>
  `;

  return card;
}

function renderSidebarStatusList(nodeData) {
  const list = document.getElementById("node-status-list");
  list.innerHTML = "";

  nodeData.forEach((node) => {
    list.appendChild(renderNodeCard(node));
  });
}

function markerHtml(node) {
  return `
    <div class="map-dot-marker dot-${node.status}">
      <span class="map-dot-core"></span>
      <span class="map-dot-halo"></span>
      <span class="map-dot-label">${node.id}</span>
    </div>
  `;
}

function networkMarkerHtml(network) {
  return `
    <article class="network-cluster cluster-${network.status}">
      <div class="network-cluster-name">${network.name}</div>
      <div class="network-cluster-meta">${network.nodeCount} nodes</div>
    </article>
  `;
}

function summarizeNetwork(networkNodes) {
  const nodeCount = networkNodes.length;
  const lat = networkNodes.reduce((sum, node) => sum + node.lat, 0) / nodeCount;
  const lon = networkNodes.reduce((sum, node) => sum + node.lon, 0) / nodeCount;
  const status = networkNodes.some((node) => node.status === "offline")
    ? "offline"
    : networkNodes.some((node) => node.status === "degraded")
      ? "degraded"
      : "online";

  return {
    id: networkNodes[0].meshId,
    name: networkNodes[0].meshName || networkNodes[0].meshId,
    nodeCount,
    lat,
    lon,
    status,
  };
}

function renderMeshMap(nodeData) {
  const map = L.map("mesh-map", {
    zoomControl: true,
    attributionControl: true,
    scrollWheelZoom: "center",
    doubleClickZoom: "center",
    touchZoom: "center",
  });
  const centerCoords = document.getElementById("center-coords");

  const layerAttribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
  const tileLayers = {
    streets: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }),
    satellite: L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 20,
        attribution:
          'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      }
    ),
    topo: L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      maxZoom: 17,
      attribution:
        'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    }),
  };
  let activeTileLayer = tileLayers.satellite.addTo(map);

  const baseLayerControl = {
    "Streets": tileLayers.streets,
    "Topo": tileLayers.topo,
    "Satellite": tileLayers.satellite,
  };

  function enforceActiveLayerZoomLimit() {
    const max = Number.isFinite(activeTileLayer?.options?.maxZoom) ? activeTileLayer.options.maxZoom : 19;
    map.setMaxZoom(max);
    if (map.getZoom() > max) {
      map.setZoom(max);
    }
  }

  L.control.layers(baseLayerControl, null, { position: "bottomright", collapsed: true }).addTo(map);
  map.on("baselayerchange", (event) => {
    activeTileLayer = event.layer;
    enforceActiveLayerZoomLimit();
  });
  enforceActiveLayerZoomLimit();

  const links = [
    ["node-01", "node-02"],
    ["node-02", "node-03"],
    ["node-02", "node-04"],
    ["node-01", "node-04"],
  ];

  const nodesById = new Map(nodeData.map((node) => [node.id, node]));
  const bounds = [];
  const nodeLayer = L.layerGroup();
  const linkLayer = L.layerGroup();
  const networkLayer = L.layerGroup();
  const networksById = new Map();

  links.forEach(([from, to]) => {
    const source = nodesById.get(from);
    const target = nodesById.get(to);
    if (!source || !target) {
      return;
    }

    const linkStatus =
      source.status === "offline" || target.status === "offline"
        ? "offline"
        : source.status === "degraded" || target.status === "degraded"
          ? "degraded"
          : "online";

    const color = linkStatus === "offline" ? "#ef4444" : linkStatus === "degraded" ? "#eab308" : "#22c55e";

    L.polyline(
      [
        [source.lat, source.lon],
        [target.lat, target.lon],
      ],
      { color, weight: 3, opacity: 0.8 }
    ).addTo(linkLayer);
  });

  nodeData.forEach((node) => {
    bounds.push([node.lat, node.lon]);
    if (!networksById.has(node.meshId)) {
      networksById.set(node.meshId, []);
    }
    networksById.get(node.meshId).push(node);

    const icon = L.divIcon({
      className: "mesh-node-icon",
      html: markerHtml(node),
      iconSize: [96, 28],
      iconAnchor: [12, 12],
    });

    const marker = L.marker([node.lat, node.lon], { icon }).addTo(nodeLayer);
    marker.bindTooltip(node.name, {
      direction: "top",
      offset: [0, -22],
      opacity: 0.95,
    });
    marker.bindPopup(
      `<strong>${node.name}</strong><br>Network: ${node.meshName || node.meshId}<br>ID: ${node.id}<br>Status: ${titleCase(node.status)}<br>Signal: ${node.signal}<br>Clients: ${node.clients}<br>Lat: ${node.lat.toFixed(6)}<br>Lon: ${node.lon.toFixed(6)}`
    );
  });

  Array.from(networksById.values())
    .map(summarizeNetwork)
    .forEach((network) => {
      const icon = L.divIcon({
        className: "mesh-network-icon",
        html: networkMarkerHtml(network),
        iconSize: [140, 60],
        iconAnchor: [70, 30],
      });

      const marker = L.marker([network.lat, network.lon], { icon }).addTo(networkLayer);
      marker.bindPopup(
        `<strong>${network.name}</strong><br>Status: ${titleCase(network.status)}<br>Total Nodes: ${network.nodeCount}<br>Lat: ${network.lat.toFixed(6)}<br>Lon: ${network.lon.toFixed(6)}`
      );
    });

  function syncLayersByZoom() {
    const showNetworks = map.getZoom() <= CONSOLIDATE_ZOOM_LEVEL;
    if (showNetworks) {
      if (map.hasLayer(nodeLayer)) map.removeLayer(nodeLayer);
      if (map.hasLayer(linkLayer)) map.removeLayer(linkLayer);
      if (!map.hasLayer(networkLayer)) map.addLayer(networkLayer);
      return;
    }

    if (map.hasLayer(networkLayer)) map.removeLayer(networkLayer);
    if (!map.hasLayer(linkLayer)) map.addLayer(linkLayer);
    if (!map.hasLayer(nodeLayer)) map.addLayer(nodeLayer);
  }

  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [60, 60] });
  }

  syncLayersByZoom();
  map.on("zoomend", syncLayersByZoom);

  function updateCenterReadout() {
    if (!centerCoords) {
      return;
    }
    const center = map.getCenter();
    centerCoords.textContent = `${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`;
  }

  updateCenterReadout();
  map.on("move", updateCenterReadout);
  map.on("zoom", updateCenterReadout);

  function setMapTheme(theme) {
    void theme;
    enforceActiveLayerZoomLimit();
  }

  function setMapLocked(locked) {
    const methods = [
      map.dragging,
      map.scrollWheelZoom,
      map.doubleClickZoom,
      map.boxZoom,
      map.keyboard,
      map.touchZoom,
      map.tap,
    ];

    methods.forEach((method) => {
      if (!method) {
        return;
      }
      if (locked && typeof method.disable === "function") {
        method.disable();
      }
      if (!locked && typeof method.enable === "function") {
        method.enable();
      }
    });
  }

  return { setMapTheme, setMapLocked };
}

function setupThemeToggle(mapApi) {
  const toggle = document.getElementById("theme-toggle");
  let locked = false;

  function setTheme(theme) {
    const isLight = theme === "light";
    document.body.classList.toggle("light-mode", isLight);
    toggle.setAttribute("aria-pressed", String(!isLight));
    toggle.setAttribute("title", isLight ? "Switch to dark mode" : "Switch to light mode");
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    if (mapApi && typeof mapApi.setMapTheme === "function") {
      mapApi.setMapTheme(theme);
    }
  }

  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  setTheme(stored === "light" ? "light" : "dark");

  toggle.addEventListener("click", () => {
    if (locked) {
      return;
    }
    const next = document.body.classList.contains("light-mode") ? "dark" : "light";
    setTheme(next);
  });

  function setLocked(isLocked) {
    locked = isLocked;
    toggle.disabled = isLocked;
    toggle.classList.toggle("locked", isLocked);
    toggle.setAttribute("aria-disabled", String(isLocked));
  }

  return { setLocked };
}

function setupMapLockToggle(mapApi, themeApi) {
  const toggle = document.getElementById("map-lock-toggle");
  let isLocked = false;

  function setLocked(locked) {
    isLocked = locked;
    toggle.classList.toggle("active", locked);
    toggle.setAttribute("aria-pressed", String(locked));
    toggle.setAttribute("title", locked ? "Unlock map" : "Lock map");
    if (mapApi && typeof mapApi.setMapLocked === "function") {
      mapApi.setMapLocked(locked);
    }
    if (themeApi && typeof themeApi.setLocked === "function") {
      themeApi.setLocked(locked);
    }
  }

  setLocked(false);

  toggle.addEventListener("click", () => {
    setLocked(!isLocked);
  });
}

function setupHamburgerMenu() {
  const toggle = document.getElementById("menu-toggle");
  const backdrop = document.getElementById("menu-backdrop");

  function openMenu() {
    document.body.classList.add("menu-open");
    toggle.setAttribute("aria-expanded", "true");
  }

  function closeMenu() {
    document.body.classList.remove("menu-open");
    toggle.setAttribute("aria-expanded", "false");
  }

  toggle.addEventListener("click", () => {
    const isOpen = document.body.classList.contains("menu-open");
    if (isOpen) {
      closeMenu();
      return;
    }
    openMenu();
  });

  backdrop.addEventListener("click", closeMenu);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });
}

renderSidebarStatusList(nodes);
const mapApi = renderMeshMap(nodes);
setupHamburgerMenu();
const themeApi = setupThemeToggle(mapApi);
setupMapLockToggle(mapApi, themeApi);
