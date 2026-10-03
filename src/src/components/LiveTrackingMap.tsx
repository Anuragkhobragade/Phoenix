import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, RefreshCw } from 'lucide-react';

declare global {
    interface Window {
        L: any;
    }
}

interface Location {
    lat: number;
    lng: number;
    address?: string;
    label?: string;
}

interface LiveTrackingMapProps {
    patientLocation?: Location | null;
    driverLocation?: Location | null;
    showRoute?: boolean;
    height?: string;
    onLocationSelect?: (loc: { lat: number; lng: number; address?: string }) => void;
    allowClickToSelect?: boolean;
}

export default function LiveTrackingMap({
    patientLocation,
    driverLocation,
    showRoute = true,
    height = "380px",
    onLocationSelect,
    allowClickToSelect = false
}: LiveTrackingMapProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const patientMarkerRef = useRef<any>(null);
    const driverMarkerRef = useRef<any>(null);
    const routePolylineRef = useRef<any>(null);
    const [leafletReady, setLeafletReady] = useState(false);
    const [routeInfo, setRouteInfo] = useState<{ distanceKm: string; durationMin: string } | null>(null);

    // Wait for window.L script to load if needed
    useEffect(() => {
        if (window.L) {
            setLeafletReady(true);
            return;
        }

        const checkL = setInterval(() => {
            if (window.L) {
                setLeafletReady(true);
                clearInterval(checkL);
            }
        }, 200);

        return () => clearInterval(checkL);
    }, []);

    // Initialize Map
    useEffect(() => {
        if (!leafletReady || !mapContainerRef.current) return;

        const L = window.L;

        // Initial center
        const defaultLat = patientLocation?.lat || driverLocation?.lat || 19.0760;
        const defaultLng = patientLocation?.lng || driverLocation?.lng || 72.8777;

        if (!mapInstanceRef.current) {
            const map = L.map(mapContainerRef.current, {
                zoomControl: true,
                attributionControl: false
            }).setView([defaultLat, defaultLng], 14);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap'
            }).addTo(map);

            if (allowClickToSelect && onLocationSelect) {
                map.on('click', async (e: any) => {
                    const { lat, lng } = e.latlng;
                    let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                    try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                        const data = await res.json();
                        if (data && data.display_name) {
                            address = data.display_name;
                        }
                    } catch (err) {
                        console.warn("Reverse geocode failed:", err);
                    }
                    onLocationSelect({ lat, lng, address });
                });
            }

            mapInstanceRef.current = map;
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [leafletReady]);

    // Update Patient Marker
    useEffect(() => {
        if (!leafletReady || !mapInstanceRef.current || !patientLocation) return;
        const L = window.L;
        const map = mapInstanceRef.current;

        const patientHtml = `
            <div style="
                background: #ef4444;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 14px;
                animation: pulse 1.5s infinite;
            ">📍</div>
        `;

        const customIcon = L.divIcon({
            html: patientHtml,
            className: 'patient-custom-marker',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });

        if (patientMarkerRef.current) {
            patientMarkerRef.current.setLatLng([patientLocation.lat, patientLocation.lng]);
        } else {
            patientMarkerRef.current = L.marker([patientLocation.lat, patientLocation.lng], { icon: customIcon })
                .addTo(map)
                .bindPopup(`<b>📍 Patient Emergency Location</b><br/>${patientLocation.address || 'GPS Coordinates'}`);
        }
    }, [leafletReady, patientLocation]);

    // Update Driver Marker
    useEffect(() => {
        if (!leafletReady || !mapInstanceRef.current || !driverLocation) return;
        const L = window.L;
        const map = mapInstanceRef.current;

        const driverHtml = `
            <div style="
                background: #0d9488;
                width: 38px;
                height: 38px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 4px 14px rgba(13, 148, 136, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                transition: all 0.5s ease-in-out;
            ">🚑</div>
        `;

        const customIcon = L.divIcon({
            html: driverHtml,
            className: 'driver-custom-marker',
            iconSize: [38, 38],
            iconAnchor: [19, 19]
        });

        if (driverMarkerRef.current) {
            driverMarkerRef.current.setLatLng([driverLocation.lat, driverLocation.lng]);
        } else {
            driverMarkerRef.current = L.marker([driverLocation.lat, driverLocation.lng], { icon: customIcon })
                .addTo(map)
                .bindPopup(`<b>🚑 Live Ambulance GPS</b><br/>${driverLocation.label || 'Driver Location'}`);
        }
    }, [leafletReady, driverLocation]);

    // Draw Driving Route Line & Fit Bounds
    useEffect(() => {
        if (!leafletReady || !mapInstanceRef.current) return;
        const L = window.L;
        const map = mapInstanceRef.current;

        const points: [number, number][] = [];
        if (patientLocation) points.push([patientLocation.lat, patientLocation.lng]);
        if (driverLocation) points.push([driverLocation.lat, driverLocation.lng]);

        if (points.length === 1) {
            map.setView(points[0], 15);
        } else if (points.length === 2 && showRoute) {
            // Fetch OSRM Road Route
            const [pLat, pLng] = [patientLocation!.lat, patientLocation!.lng];
            const [dLat, dLng] = [driverLocation!.lat, driverLocation!.lng];

            fetch(`https://router.project-osrm.org/route/v1/driving/${dLng},${dLat};${pLng},${pLat}?overview=full&geometries=geojson`)
                .then(res => res.json())
                .then(data => {
                    if (data.routes && data.routes.length > 0) {
                        const route = data.routes[0];
                        const distanceKm = (route.distance / 1000).toFixed(1);
                        const durationMin = Math.round(route.duration / 60);
                        setRouteInfo({ distanceKm: `${distanceKm} km`, durationMin: `${durationMin} mins` });

                        const coordinates = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);

                        if (routePolylineRef.current) {
                            routePolylineRef.current.setLatLngs(coordinates);
                        } else {
                            routePolylineRef.current = L.polyline(coordinates, {
                                color: '#0d9488',
                                weight: 5,
                                opacity: 0.85,
                                dashArray: '8, 8'
                            }).addTo(map);
                        }
                    } else {
                        // Straight polyline fallback
                        if (routePolylineRef.current) {
                            routePolylineRef.current.setLatLngs(points);
                        } else {
                            routePolylineRef.current = L.polyline(points, {
                                color: '#0d9488',
                                weight: 4,
                                dashArray: '6, 6'
                            }).addTo(map);
                        }
                    }
                })
                .catch(() => {
                    if (routePolylineRef.current) {
                        routePolylineRef.current.setLatLngs(points);
                    } else {
                        routePolylineRef.current = L.polyline(points, {
                            color: '#0d9488',
                            weight: 4,
                            dashArray: '6, 6'
                        }).addTo(map);
                    }
                });

            const bounds = L.latLngBounds(points);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [leafletReady, patientLocation, driverLocation, showRoute]);

    const handleRecenter = () => {
        if (!mapInstanceRef.current) return;
        const map = mapInstanceRef.current;
        if (patientLocation && driverLocation) {
            const L = window.L;
            const bounds = L.latLngBounds([
                [patientLocation.lat, patientLocation.lng],
                [driverLocation.lat, driverLocation.lng]
            ]);
            map.fitBounds(bounds, { padding: [50, 50] });
        } else if (patientLocation) {
            map.setView([patientLocation.lat, patientLocation.lng], 15);
        } else if (driverLocation) {
            map.setView([driverLocation.lat, driverLocation.lng], 15);
        }
    };

    return (
        <div className="relative w-full rounded-2xl overflow-hidden shadow-md border border-slate-200 bg-slate-100">
            {/* Map Canvas */}
            <div ref={mapContainerRef} style={{ height, width: '100%' }} />

            {/* Loading Spinner overlay */}
            {!leafletReady && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center gap-2 text-xs font-bold text-slate-600">
                    <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                    <span>Loading Live GPS Map...</span>
                </div>
            )}

            {/* Route Stats Badge Overlay */}
            {routeInfo && (
                <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-2 rounded-xl shadow-lg border border-slate-700/60 flex items-center gap-3 text-xs font-extrabold">
                    <div className="flex items-center gap-1 text-teal-400">
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Distance: {routeInfo.distanceKm}</span>
                    </div>
                    <span className="text-slate-500">•</span>
                    <div className="text-amber-400">
                        <span>ETA: {routeInfo.durationMin}</span>
                    </div>
                </div>
            )}

            {/* Recenter Button */}
            <button
                type="button"
                onClick={handleRecenter}
                className="absolute bottom-3 right-3 z-10 p-2.5 bg-white hover:bg-slate-50 text-slate-800 rounded-xl shadow-lg border border-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                title="Recenter Map View"
            >
                <MapPin className="w-4 h-4 text-rose-600" />
                <span>Recenter Map</span>
            </button>
        </div>
    );
}
