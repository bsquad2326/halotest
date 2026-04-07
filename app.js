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
  let zoomLockCenter = null;
  const gridPaneName = "mgrs-grid-pane";
  map.createPane(gridPaneName);
  map.getPane(gridPaneName).style.zIndex = "650";
  map.getPane(gridPaneName).style.pointerEvents = "none";

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
  const gzdGridLayer = L.layerGroup();

  function enforceActiveLayerZoomLimit() {
    const max = Number.isFinite(activeTileLayer?.options?.maxZoom) ? activeTileLayer.options.maxZoom : 19;
    map.setMaxZoom(max);
    if (map.getZoom() > max) {
      map.setZoom(max);
    }
  }

  L.control.layers(baseLayerControl, { "MGRS": gzdGridLayer }, { position: "bottomright", collapsed: true }).addTo(map);
  map.on("baselayerchange", (event) => {
    activeTileLayer = event.layer;
    enforceActiveLayerZoomLimit();
    scheduleGzdGridDraw(true);
  });
  enforceActiveLayerZoomLimit();

  function gridZoneBandFromLat(lat) {
    const bands = "CDEFGHJKLMNPQRSTUVWX";
    if (lat < -80 || lat > 84) return null;
    if (lat >= 72) return "X";
    const index = Math.floor((lat + 80) / 8);
    return bands[Math.max(0, Math.min(index, bands.length - 1))];
  }

  function gridZoneFromLon(lon) {
    const normalized = ((((lon + 180) % 360) + 360) % 360) - 180;
    const zone = Math.floor((normalized + 180) / 6) + 1;
    return Math.max(1, Math.min(60, zone));
  }

  function parseMgrsSquareId(mgrsValue) {
    const value = String(mgrsValue || "").toUpperCase();
    const match = value.match(/^\d{1,2}[C-HJ-NP-X]([A-HJ-NP-Z]{2})/);
    return match ? match[1] : null;
  }

  function utmCrsForZone(zone, isSouth) {
    return `+proj=utm +zone=${zone} ${isSouth ? "+south " : ""}+datum=WGS84 +units=m +no_defs`;
  }

  function drawGzdGrid() {
    if (!map.hasLayer(gzdGridLayer)) {
      return;
    }
    gzdGridLayer.clearLayers();

    const bounds = map.getBounds();
    const south = Math.max(-80, bounds.getSouth());
    const north = Math.min(84, bounds.getNorth());
    const west = bounds.getWest();
    const east = bounds.getEast();

    const startZone = gridZoneFromLon(west);
    const endZone = gridZoneFromLon(east);
    let zoneCount = endZone - startZone + 1;
    if (zoneCount <= 0) zoneCount += 60;

    const startBandLat = Math.floor((south + 80) / 8) * 8 - 80;
    const endBandLat = Math.ceil((north + 80) / 8) * 8 - 80;

    const zoom = map.getZoom();
    const showGzdGridLines = zoom < 10;
    const showGzdLabels = zoom >= 5 && zoom < 8;
    const showSquareIds = zoom >= 7 && zoom < 16;
    const show10kmGrid = zoom >= 9;
    const show10kmLabels = zoom >= 10 && zoom < 16;
    const show1kmGrid = zoom >= 13;
    const show1kmLabels = zoom >= 13;

    if (showGzdGridLines) {
      for (let i = 0; i <= zoneCount; i += 1) {
        const zone = ((startZone - 1 + i) % 60) + 1;
        const lon = -180 + (zone - 1) * 6;
        L.polyline(
          [
            [south, lon],
            [north, lon],
          ],
          { color: "#fbbf24", weight: 1.8, opacity: 0.85, interactive: false, pane: gridPaneName }
        ).addTo(gzdGridLayer);
      }

      for (let lat = startBandLat; lat <= endBandLat; lat += 8) {
        if (lat < -80 || lat > 84) continue;
        L.polyline(
          [
            [lat, west],
            [lat, east],
          ],
          { color: "#fbbf24", weight: 1.8, opacity: 0.85, interactive: false, pane: gridPaneName }
        ).addTo(gzdGridLayer);
      }
    }

    if (zoom < 5) {
      return;
    }

    let tenKmLineBudget = 2400;
    let tenKmLabelBudget = 1200;
    let oneKmLineBudget = 4500;
    let oneKmLabelBudget = 1800;

    if (showGzdLabels) {
      for (let i = 0; i < zoneCount; i += 1) {
        const zone = ((startZone - 1 + i) % 60) + 1;
        const lonMin = -180 + (zone - 1) * 6;
        const lonMax = lonMin + 6;
        const cellWest = Math.max(west, lonMin);
        const cellEast = Math.min(east, lonMax);
        if (cellEast <= cellWest) continue;

        for (let lat = startBandLat; lat < endBandLat; lat += 8) {
          const band = gridZoneBandFromLat(lat + 4);
          if (!band) continue;
          const cellSouth = Math.max(south, lat);
          const cellNorth = Math.min(north, lat + 8);
          if (cellNorth <= cellSouth) continue;
          const icon = L.divIcon({
            className: "map-grid-label gzd-grid-label",
            html: `<span>${zone}${band}</span>`,
            iconSize: [44, 16],
            iconAnchor: [22, 8],
          });
          L.marker([(cellSouth + cellNorth) / 2, (cellWest + cellEast) / 2], { icon, interactive: false, pane: gridPaneName }).addTo(gzdGridLayer);
        }
      }
    }

    if (!showSquareIds && !show10kmGrid) {
      return;
    }

    for (let i = 0; i < zoneCount; i += 1) {
      const zone = ((startZone - 1 + i) % 60) + 1;
      const lonMin = -180 + (zone - 1) * 6;
      const lonMax = lonMin + 6;
      const cellWest = Math.max(west, lonMin);
      const cellEast = Math.min(east, lonMax);
      if (cellEast <= cellWest) continue;

      for (let lat = startBandLat; lat < endBandLat; lat += 8) {
        const band = gridZoneBandFromLat(lat + 4);
        if (!band) continue;
        const cellSouth = Math.max(south, lat);
        const cellNorth = Math.min(north, lat + 8);
        if (cellNorth <= cellSouth) continue;
        const icon = L.divIcon({
          className: "map-grid-label gzd-grid-label",
          html: `<span>${zone}${band}</span>`,
          iconSize: [44, 16],
          iconAnchor: [22, 8],
        });
        L.marker([(cellSouth + cellNorth) / 2, (cellWest + cellEast) / 2], { icon, interactive: false }).addTo(gzdGridLayer);
      }
    }

    // Square IDs (100km x 100km) rendered from true projected meter cells.
    if (
      map.getZoom() < 7 ||
      !window.mgrs ||
      typeof window.mgrs.forward !== "function" ||
      typeof window.proj4 !== "function"
    ) {
      return;
    }

    for (let i = 0; i < zoneCount; i += 1) {
      const zone = ((startZone - 1 + i) % 60) + 1;
      const lonMin = -180 + (zone - 1) * 6;
      const lonMax = lonMin + 6;
      const cellWest = Math.max(west, lonMin);
      const cellEast = Math.min(east, lonMax);
      if (cellEast <= cellWest) continue;

      for (let lat = startBandLat; lat < endBandLat; lat += 8) {
        const band = gridZoneBandFromLat(lat + 4);
        if (!band) continue;
        const cellSouth = Math.max(south, lat);
        const cellNorth = Math.min(north, lat + 8);
        if (cellNorth <= cellSouth) continue;
        const zoneCenterLat = (cellSouth + cellNorth) / 2;
        const isSouth = zoneCenterLat < 0;
        const utm = utmCrsForZone(zone, isSouth);
        const wgs84 = "EPSG:4326";

        let pSW;
        let pSE;
        let pNW;
        let pNE;
        try {
          pSW = window.proj4(wgs84, utm, [cellWest, cellSouth]);
          pSE = window.proj4(wgs84, utm, [cellEast, cellSouth]);
          pNW = window.proj4(wgs84, utm, [cellWest, cellNorth]);
          pNE = window.proj4(wgs84, utm, [cellEast, cellNorth]);
        } catch (_error) {
          continue;
        }

        const minE = Math.min(pSW[0], pSE[0], pNW[0], pNE[0]);
        const maxE = Math.max(pSW[0], pSE[0], pNW[0], pNE[0]);
        const minN = Math.min(pSW[1], pSE[1], pNW[1], pNE[1]);
        const maxN = Math.max(pSW[1], pSE[1], pNW[1], pNE[1]);

        const startE100 = Math.floor(minE / 100000) * 100000;
        const endE100 = Math.ceil(maxE / 100000) * 100000;
        const startN100 = Math.floor(minN / 100000) * 100000;
        const endN100 = Math.ceil(maxN / 100000) * 100000;

        for (let e = startE100; e < endE100; e += 100000) {
          for (let n = startN100; n < endN100; n += 100000) {
            let corners;
            let centerPoint;
            try {
              corners = [
                window.proj4(utm, wgs84, [e, n]),
                window.proj4(utm, wgs84, [e + 100000, n]),
                window.proj4(utm, wgs84, [e + 100000, n + 100000]),
                window.proj4(utm, wgs84, [e, n + 100000]),
              ];
              centerPoint = window.proj4(utm, wgs84, [e + 50000, n + 50000]);
            } catch (_error) {
              continue;
            }

            const centerLon = centerPoint[0];
            const centerLat = centerPoint[1];
            if (centerLon < cellWest || centerLon > cellEast || centerLat < cellSouth || centerLat > cellNorth) {
              continue;
            }

            let squareId = null;
            try {
              squareId = parseMgrsSquareId(window.mgrs.forward([centerLon, centerLat], 0));
            } catch (_error) {
              squareId = null;
            }

            L.polyline(
              [
                [corners[0][1], corners[0][0]],
                [corners[1][1], corners[1][0]],
                [corners[2][1], corners[2][0]],
                [corners[3][1], corners[3][0]],
                [corners[0][1], corners[0][0]],
              ],
              { color: "#f59e0b", weight: 1.2, opacity: 0.68, interactive: false, pane: gridPaneName }
            ).addTo(gzdGridLayer);

            if (showSquareIds && squareId) {
              const labelIcon = L.divIcon({
                className: "map-grid-label square-id-grid-label",
                html: `<span>${squareId}</span>`,
                iconSize: [32, 14],
                iconAnchor: [16, 7],
              });
              L.marker([centerLat, centerLon], { icon: labelIcon, interactive: false, pane: gridPaneName }).addTo(gzdGridLayer);
            }

            // 10,000 meter (10 km) gridlines inside each 100 km square.
            if (show10kmGrid && tenKmLineBudget > 0) {
              for (let offset = 10000; offset < 100000; offset += 10000) {
                if (tenKmLineBudget <= 0) break;

                let verticalStart;
                let verticalEnd;
                let horizontalStart;
                let horizontalEnd;
                try {
                  verticalStart = window.proj4(utm, wgs84, [e + offset, n]);
                  verticalEnd = window.proj4(utm, wgs84, [e + offset, n + 100000]);
                  horizontalStart = window.proj4(utm, wgs84, [e, n + offset]);
                  horizontalEnd = window.proj4(utm, wgs84, [e + 100000, n + offset]);
                } catch (_error) {
                  continue;
                }

                L.polyline(
                  [
                    [verticalStart[1], verticalStart[0]],
                    [verticalEnd[1], verticalEnd[0]],
                  ],
                  { color: "#fcd34d", weight: 0.9, opacity: 0.45, interactive: false, pane: gridPaneName }
                ).addTo(gzdGridLayer);
                tenKmLineBudget -= 1;

                if (show10kmLabels && tenKmLabelBudget > 0) {
                  const verticalMidLat = verticalStart[1] + (verticalEnd[1] - verticalStart[1]) * 0.42;
                  const verticalMidLon = (verticalStart[0] + verticalEnd[0]) / 2;
                  const verticalLabel = String(offset / 10000);
                  const verticalLabelIcon = L.divIcon({
                    className: "map-grid-label tenkm-grid-label tenkm-grid-label-easting",
                    html: `<span>${verticalLabel}</span>`,
                    iconSize: [26, 14],
                    iconAnchor: [13, 7],
                  });
                  L.marker([verticalMidLat, verticalMidLon], { icon: verticalLabelIcon, interactive: false, pane: gridPaneName }).addTo(gzdGridLayer);
                  tenKmLabelBudget -= 1;
                }

                if (tenKmLineBudget <= 0) break;

                L.polyline(
                  [
                    [horizontalStart[1], horizontalStart[0]],
                    [horizontalEnd[1], horizontalEnd[0]],
                  ],
                  { color: "#fcd34d", weight: 0.9, opacity: 0.45, interactive: false, pane: gridPaneName }
                ).addTo(gzdGridLayer);
                tenKmLineBudget -= 1;

                if (show10kmLabels && tenKmLabelBudget > 0) {
                  const horizontalMidLat = (horizontalStart[1] + horizontalEnd[1]) / 2;
                  const horizontalMidLon = horizontalStart[0] + (horizontalEnd[0] - horizontalStart[0]) * 0.58;
                  const horizontalLabel = String(offset / 10000);
                  const horizontalLabelIcon = L.divIcon({
                    className: "map-grid-label tenkm-grid-label tenkm-grid-label-northing",
                    html: `<span>${horizontalLabel}</span>`,
                    iconSize: [26, 14],
                    iconAnchor: [13, 7],
                  });
                  L.marker([horizontalMidLat, horizontalMidLon], { icon: horizontalLabelIcon, interactive: false, pane: gridPaneName }).addTo(gzdGridLayer);
                  tenKmLabelBudget -= 1;
                }
              }
            }

            // 1,000 meter (1 km) gridlines inside each 10 km cell.
            if (show1kmGrid && oneKmLineBudget > 0) {
              for (let e10 = e; e10 < e + 100000; e10 += 10000) {
                for (let n10 = n; n10 < n + 100000; n10 += 10000) {
                  for (let step = 1000; step < 10000; step += 1000) {
                    if (oneKmLineBudget <= 0) break;
                    let vStart;
                    let vEnd;
                    let hStart;
                    let hEnd;
                    try {
                      vStart = window.proj4(utm, wgs84, [e10 + step, n10]);
                      vEnd = window.proj4(utm, wgs84, [e10 + step, n10 + 10000]);
                      hStart = window.proj4(utm, wgs84, [e10, n10 + step]);
                      hEnd = window.proj4(utm, wgs84, [e10 + 10000, n10 + step]);
                    } catch (_error) {
                      continue;
                    }

                    const oneKmOpacity = zoom >= 14 ? 0.48 : 0.4;
                    const oneKmWeight = zoom >= 14 ? 0.9 : 0.75;
                    L.polyline(
                      [
                        [vStart[1], vStart[0]],
                        [vEnd[1], vEnd[0]],
                      ],
                      { color: "#fef3c7", weight: oneKmWeight, opacity: oneKmOpacity, interactive: false, pane: gridPaneName }
                    ).addTo(gzdGridLayer);
                    oneKmLineBudget -= 1;

                    const oneKmLabelStep = zoom >= 14 ? 1000 : 2000;
                    if (show1kmLabels && oneKmLabelBudget > 0 && step % oneKmLabelStep === 0) {
                      const eastingKm = Math.floor((((e10 + step) % 100000) + 100000) % 100000 / 1000);
                      const verticalLabel = String(eastingKm).padStart(2, "0");
                      const verticalMidLat = vStart[1] + (vEnd[1] - vStart[1]) * 0.36;
                      const verticalMidLon = (vStart[0] + vEnd[0]) / 2;
                      const vLabelIcon = L.divIcon({
                        className: "map-grid-label onekm-grid-label onekm-grid-label-easting",
                        html: `<span>${verticalLabel}</span>`,
                        iconSize: [28, 14],
                        iconAnchor: [14, 7],
                      });
                      L.marker([verticalMidLat, verticalMidLon], { icon: vLabelIcon, interactive: false, pane: gridPaneName }).addTo(gzdGridLayer);
                      oneKmLabelBudget -= 1;
                    }

                    if (oneKmLineBudget <= 0) break;

                    L.polyline(
                      [
                        [hStart[1], hStart[0]],
                        [hEnd[1], hEnd[0]],
                      ],
                      { color: "#fef3c7", weight: oneKmWeight, opacity: oneKmOpacity, interactive: false, pane: gridPaneName }
                    ).addTo(gzdGridLayer);
                    oneKmLineBudget -= 1;

                    if (show1kmLabels && oneKmLabelBudget > 0 && step % oneKmLabelStep === 0) {
                      const northingKm = Math.floor((((n10 + step) % 100000) + 100000) % 100000 / 1000);
                      const horizontalLabel = String(northingKm).padStart(2, "0");
                      const horizontalMidLat = (hStart[1] + hEnd[1]) / 2;
                      const horizontalMidLon = hStart[0] + (hEnd[0] - hStart[0]) * 0.64;
                      const hLabelIcon = L.divIcon({
                        className: "map-grid-label onekm-grid-label onekm-grid-label-northing",
                        html: `<span>${horizontalLabel}</span>`,
                        iconSize: [28, 14],
                        iconAnchor: [14, 7],
                      });
                      L.marker([horizontalMidLat, horizontalMidLon], { icon: hLabelIcon, interactive: false, pane: gridPaneName }).addTo(gzdGridLayer);
                      oneKmLabelBudget -= 1;
                    }
                  }
                  if (oneKmLineBudget <= 0) break;
                }
                if (oneKmLineBudget <= 0) break;
              }
            }
          }
        }
      }
    }
  }

  function syncCoordReadoutVisibility() {
    if (!centerCoords) {
      return;
    }
    centerCoords.style.display = "";
  }

  function formatMgrsForReadout(rawMgrs) {
    const value = String(rawMgrs || "").toUpperCase().trim();
    const match = value.match(/^(\d{1,2})([C-HJ-NP-X])([A-HJ-NP-Z]{2})(\d*)$/);
    if (!match) {
      return value;
    }
    const digits = match[4] || "";
    const half = Math.floor(digits.length / 2);
    const east = digits.slice(0, half);
    const north = digits.slice(half);
    if (!east && !north) {
      return `${match[1]}${match[2]} ${match[3]}`;
    }
    return `${match[1]}${match[2]} ${match[3]} ${east} ${north}`;
  }

  function mgrsAccuracyForZoom(_zoom) {
    return 5; // Always 10-digit MGRS (1m precision).
  }

  let gzdDrawScheduled = false;
  let gzdDrawTimer = null;
  function scheduleGzdGridDraw(immediate = false) {
    if (!map.hasLayer(gzdGridLayer)) {
      return;
    }
    if (gzdDrawTimer) {
      window.clearTimeout(gzdDrawTimer);
      gzdDrawTimer = null;
    }
    if (immediate) {
      if (gzdDrawScheduled) {
        return;
      }
      gzdDrawScheduled = true;
      window.requestAnimationFrame(() => {
        gzdDrawScheduled = false;
        drawGzdGrid();
      });
      return;
    }
    gzdDrawTimer = window.setTimeout(() => {
      gzdDrawTimer = null;
      if (gzdDrawScheduled) {
        return;
      }
      gzdDrawScheduled = true;
      window.requestAnimationFrame(() => {
        gzdDrawScheduled = false;
        drawGzdGrid();
      });
    }, 90);
  }

  map.on("overlayadd", (event) => {
    if (event.layer === gzdGridLayer) {
      scheduleGzdGridDraw(true);
      syncCoordReadoutVisibility();
      updateCenterReadout();
    }
  });
  map.on("overlayremove", (event) => {
    if (event.layer === gzdGridLayer) {
      gzdGridLayer.clearLayers();
      syncCoordReadoutVisibility();
      updateCenterReadout();
    }
  });
  map.on("moveend", () => scheduleGzdGridDraw(true));
  map.on("zoomend", () => scheduleGzdGridDraw(true));
  map.on("load", () => scheduleGzdGridDraw(true));

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
    if (map.hasLayer(gzdGridLayer) && window.mgrs && typeof window.mgrs.forward === "function") {
      try {
        const rawMgrs = window.mgrs.forward([center.lng, center.lat], mgrsAccuracyForZoom(map.getZoom()));
        centerCoords.textContent = formatMgrsForReadout(rawMgrs);
        return;
      } catch (_error) {
        // Fallback to lat/lon if MGRS conversion fails.
      }
    }
    centerCoords.textContent = `${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`;
  }

  updateCenterReadout();
  map.on("move", updateCenterReadout);
  map.on("zoom", updateCenterReadout);
  syncCoordReadoutVisibility();

  // Keep pinch/wheel zoom anchored to the current crosshair center.
  map.on("zoomstart", () => {
    zoomLockCenter = map.getCenter();
  });
  map.on("zoom", () => {
    if (!zoomLockCenter) {
      return;
    }
    map.panTo(zoomLockCenter, { animate: false });
  });
  map.on("zoomend", () => {
    zoomLockCenter = null;
  });

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
