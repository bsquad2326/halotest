const NETWORKS = [
  {
    id: "mesh-cedarburg",
    name: "Cedarburg Test Network",
    location: "Cedarburg, WI",
    nodes: [
      {
        id: "ced-gw-01",
        name: "Cedarburg-Gateway",
        status: "online",
        signal: "-57 dBm",
        clients: 6,
        lat: 43.2962,
        lon: -87.9873,
      },
      {
        id: "ced-relay-02",
        name: "Cedarburg-Relay",
        status: "degraded",
        signal: "-81 dBm",
        clients: 3,
        lat: 43.3001,
        lon: -87.9805,
      },
      {
        id: "ced-edge-03",
        name: "Cedarburg-Edge",
        status: "online",
        signal: "-66 dBm",
        clients: 2,
        lat: 43.2924,
        lon: -87.9938,
      },
    ],
    links: [
      ["ced-gw-01", "ced-relay-02"],
      ["ced-relay-02", "ced-edge-03"],
      ["ced-gw-01", "ced-edge-03"],
    ],
  },
  {
    id: "mesh-venice",
    name: "Venice Field Network",
    location: "Venice, FL",
    nodes: [
      {
        id: "ven-gw-01",
        name: "Venice-Gateway",
        status: "online",
        signal: "-60 dBm",
        clients: 4,
        lat: 27.0788,
        lon: -82.4096,
      },
      {
        id: "ven-tigers-eye-02",
        name: "Tigers Eye Drive Node",
        status: "online",
        signal: "-64 dBm",
        clients: 1,
        lat: 27.0699,
        lon: -82.3852,
      },
    ],
    links: [["ven-gw-01", "ven-tigers-eye-02"]],
  },
  {
    id: "mesh-lexington",
    name: "Lexington Test Network",
    location: "Lexington, VA",
    nodes: [
      {
        id: "lex-vmi-barracks-01",
        name: "VMI Barracks Node",
        status: "online",
        signal: "-62 dBm",
        clients: 5,
        lat: 37.7866,
        lon: -79.4455,
      },
      {
        id: "lex-wl-pool-02",
        name: "WL Pool Node",
        status: "degraded",
        signal: "-78 dBm",
        clients: 2,
        lat: 37.7887,
        lon: -79.4424,
      },
      {
        id: "lex-vmi-aquatic-03",
        name: "VMI Aquatic Center Node",
        status: "online",
        signal: "-67 dBm",
        clients: 3,
        lat: 37.7839,
        lon: -79.4441,
      },
    ],
    links: [
      ["lex-vmi-barracks-01", "lex-wl-pool-02"],
      ["lex-wl-pool-02", "lex-vmi-aquatic-03"],
      ["lex-vmi-barracks-01", "lex-vmi-aquatic-03"],
    ],
  },
];

const nodes = NETWORKS.flatMap((network) =>
  network.nodes.map((node) => ({
    ...node,
    meshId: network.id,
    meshName: network.name,
    meshLocation: network.location,
  }))
);
const networkLinks = NETWORKS.flatMap((network) => network.links);

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

function renderSidebarStatusList(networks, onNodeSelect, onNetworkToggle) {
  const list = document.getElementById("node-status-list");
  list.innerHTML = "";

  function reorderGroups() {
    const groups = Array.from(list.querySelectorAll(".network-group"));
    groups.sort((a, b) => {
      const aHidden = a.classList.contains("network-hidden") ? 1 : 0;
      const bHidden = b.classList.contains("network-hidden") ? 1 : 0;
      if (aHidden !== bHidden) {
        return aHidden - bHidden;
      }
      const aOrder = Number(a.dataset.order || 0);
      const bOrder = Number(b.dataset.order || 0);
      return aOrder - bOrder;
    });
    groups.forEach((group) => list.appendChild(group));
  }

  networks.forEach((network, index) => {
    const group = document.createElement("section");
    group.className = "network-group";
    group.dataset.order = String(index);
    group.innerHTML = `
      <details class="network-group-details" open>
        <summary class="network-group-header">
          <span class="network-group-header-text">
            <h3>${network.name}</h3>
            <p>${network.location}</p>
          </span>
          <span class="network-group-actions">
            <button
              class="network-visibility-toggle"
              type="button"
              aria-label="Hide ${network.name}"
              aria-pressed="false"
              title="Hide network"
              data-network-id="${network.id}"
            >
              <svg class="icon-eye" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <svg class="icon-eye-off" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2 12s3.5-6 10-6c2.1 0 3.8.6 5.2 1.5M22 12s-3.5 6-10 6c-2.1 0-3.8-.6-5.2-1.5"></path>
                <path d="M3 3l18 18"></path>
              </svg>
            </button>
            <span class="network-group-chevron" aria-hidden="true">▾</span>
          </span>
        </summary>
        <div class="network-group-nodes"></div>
      </details>
    `;

    const visibilityToggle = group.querySelector(".network-visibility-toggle");
    const details = group.querySelector(".network-group-details");
    let visible = true;
    visibilityToggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      visible = !visible;
      visibilityToggle.classList.toggle("active", !visible);
      visibilityToggle.setAttribute("aria-pressed", String(!visible));
      visibilityToggle.setAttribute("aria-label", `${visible ? "Hide" : "Show"} ${network.name}`);
      visibilityToggle.setAttribute("title", `${visible ? "Hide" : "Show"} network`);
      group.classList.toggle("network-hidden", !visible);
      if (!visible && details) {
        details.open = false;
      }
      reorderGroups();
      if (typeof onNetworkToggle === "function") {
        onNetworkToggle(network.id, visible);
      }
    });

    const nodesContainer = group.querySelector(".network-group-nodes");
    network.nodes.forEach((node) => {
      const nodeWithNetwork = {
        ...node,
        meshId: network.id,
        meshName: network.name,
      };
      const card = renderNodeCard(nodeWithNetwork);
      card.addEventListener("click", () => {
        if (typeof onNodeSelect === "function") {
          onNodeSelect(node.id);
        }
      });
      nodesContainer.appendChild(card);
    });

    list.appendChild(group);
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
    <div class="network-cluster-wrap cluster-${network.status}">
      <article class="network-cluster">
        <div class="network-cluster-content">
          <div class="network-cluster-name">${network.name}</div>
          <div class="network-cluster-meta">${network.nodeCount} nodes</div>
        </div>
      </article>
      <span class="network-cluster-connector" aria-hidden="true"></span>
    </div>
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

  const nodesById = new Map(nodeData.map((node) => [node.id, node]));
  const bounds = [];
  const nodeLayer = L.layerGroup();
  const linkLayer = L.layerGroup();
  const networkLayer = L.layerGroup();
  const networksById = new Map();
  const nodeMarkersById = new Map();
  const nodeMarkersByNetwork = new Map();
  const linksByNetwork = new Map();
  const networkMarkersById = new Map();
  const hiddenNetworkIds = new Set();

  networkLinks.forEach(([from, to]) => {
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

    const line = L.polyline(
      [
        [source.lat, source.lon],
        [target.lat, target.lon],
      ],
      { color, weight: 3, opacity: 0.8 }
    );
    const meshId = source.meshId;
    if (!linksByNetwork.has(meshId)) {
      linksByNetwork.set(meshId, []);
    }
    linksByNetwork.get(meshId).push(line);
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
    nodeMarkersById.set(node.id, marker);
    if (!nodeMarkersByNetwork.has(node.meshId)) {
      nodeMarkersByNetwork.set(node.meshId, []);
    }
    nodeMarkersByNetwork.get(node.meshId).push(marker);
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
        iconSize: [220, 74],
        iconAnchor: [110, 74],
      });

      const marker = L.marker([network.lat, network.lon], { icon }).addTo(networkLayer);
      networkMarkersById.set(network.id, marker);
      marker.bindPopup(
        `<strong>${network.name}</strong><br>Status: ${titleCase(network.status)}<br>Total Nodes: ${network.nodeCount}<br>Lat: ${network.lat.toFixed(6)}<br>Lon: ${network.lon.toFixed(6)}`
      );
    });

  function isNetworkVisible(networkId) {
    return !hiddenNetworkIds.has(networkId);
  }

  function syncLayersByZoom() {
    nodeLayer.clearLayers();
    linkLayer.clearLayers();
    networkLayer.clearLayers();

    const showNetworks = map.getZoom() <= CONSOLIDATE_ZOOM_LEVEL;
    if (showNetworks) {
      networkMarkersById.forEach((marker, networkId) => {
        if (isNetworkVisible(networkId)) {
          networkLayer.addLayer(marker);
        }
      });
      if (!map.hasLayer(networkLayer)) map.addLayer(networkLayer);
      return;
    }

    nodeMarkersByNetwork.forEach((markers, networkId) => {
      if (!isNetworkVisible(networkId)) {
        return;
      }
      markers.forEach((marker) => nodeLayer.addLayer(marker));
    });
    linksByNetwork.forEach((lines, networkId) => {
      if (!isNetworkVisible(networkId)) {
        return;
      }
      lines.forEach((line) => linkLayer.addLayer(line));
    });

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

  function focusNodeById(nodeId) {
    const marker = nodeMarkersById.get(nodeId);
    const node = nodesById.get(nodeId);
    if (!marker || !node) {
      return;
    }

    hiddenNetworkIds.delete(node.meshId);
    syncLayersByZoom();

    if (map.getZoom() <= CONSOLIDATE_ZOOM_LEVEL) {
      map.setZoom(CONSOLIDATE_ZOOM_LEVEL + 2);
    }
    map.flyTo([node.lat, node.lon], Math.max(map.getZoom(), CONSOLIDATE_ZOOM_LEVEL + 2), {
      animate: true,
      duration: 0.6,
    });
    window.setTimeout(() => marker.openPopup(), 350);
  }

  function setNetworkVisibility(networkId, visible) {
    if (visible) {
      hiddenNetworkIds.delete(networkId);
    } else {
      hiddenNetworkIds.add(networkId);
    }
    syncLayersByZoom();
  }

  return { setMapTheme, setMapLocked, focusNodeById, setNetworkVisibility };
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

const mapApi = renderMeshMap(nodes);
renderSidebarStatusList(NETWORKS, (nodeId) => {
  if (mapApi && typeof mapApi.focusNodeById === "function") {
    mapApi.focusNodeById(nodeId);
  }
}, (networkId, visible) => {
  if (mapApi && typeof mapApi.setNetworkVisibility === "function") {
    mapApi.setNetworkVisibility(networkId, visible);
  }
});
setupHamburgerMenu();
const themeApi = setupThemeToggle(mapApi);
setupMapLockToggle(mapApi, themeApi);
