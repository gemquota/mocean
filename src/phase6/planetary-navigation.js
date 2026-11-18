/**
 * Planetary navigation primitives.
 *
 * The planet is the persistent geographic reference. Local habitat chunks use
 * tangent-plane coordinates around a geographic anchor; this module converts
 * between those coordinates and the spherical surface without changing local
 * simulation coordinates or creature state.
 */
export const PLANETARY_WORLD_RADIUS = 250;
const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (...values) => values.every(Number.isFinite);

export const PLANET_NAVIGATION_LEVELS = Object.freeze({
  planet: Object.freeze({ id: 'planet', minRelativeZoom: 0, maxRelativeZoom: 0.18 }),
  ocean: Object.freeze({ id: 'ocean', minRelativeZoom: 0.18, maxRelativeZoom: 1.8 }),
  geology: Object.freeze({ id: 'geology', minRelativeZoom: 1.8, maxRelativeZoom: 4 }),
  ecology: Object.freeze({ id: 'ecology', minRelativeZoom: 4, maxRelativeZoom: Infinity })
});

export function wrapLongitude(longitude) {
  if (!Number.isFinite(longitude)) throw new RangeError('longitude must be finite.');
  return ((longitude + Math.PI) % TAU + TAU) % TAU - Math.PI;
}

export function clampLatitude(latitude) {
  if (!Number.isFinite(latitude)) throw new RangeError('latitude must be finite.');
  return clamp(latitude, -Math.PI / 2, Math.PI / 2);
}

/** Unit sphere vector; longitude zero faces +Z, positive longitude turns +X. */
export function geographicToUnitVector(longitude, latitude) {
  if (!finite(longitude, latitude)) throw new RangeError('longitude and latitude must be finite.');
  const lon = wrapLongitude(longitude), lat = clampLatitude(latitude);
  const cosLat = Math.cos(lat);
  return { x: cosLat * Math.sin(lon), y: Math.sin(lat), z: cosLat * Math.cos(lon) };
}

export function unitVectorToGeographic(vector) {
  if (!vector || !finite(vector.x, vector.y, vector.z)) throw new RangeError('vector must be finite.');
  const length = Math.hypot(vector.x, vector.y, vector.z);
  if (length < 1e-12) throw new RangeError('zero vector has no geographic position.');
  const x = vector.x / length, y = vector.y / length, z = vector.z / length;
  return { longitude: Math.atan2(x, z), latitude: Math.asin(clamp(y, -1, 1)) };
}

/** Convert local habitat metres (east, north) to a spherical surface position. */
export function localTangentToGeographic({ longitude, latitude }, east, north, radius) {
  if (!finite(longitude, latitude, east, north, radius) || radius <= 0) {
    throw new RangeError('anchor, offsets and positive radius must be finite.');
  }
  const anchor = geographicToUnitVector(longitude, latitude);
  const lon = wrapLongitude(longitude), lat = clampLatitude(latitude);
  const eastAxis = { x: Math.cos(lon), y: 0, z: -Math.sin(lon) };
  const northAxis = { x: -Math.sin(lat) * Math.sin(lon), y: Math.cos(lat), z: -Math.sin(lat) * Math.cos(lon) };
  const distance = Math.hypot(east, north);
  if (distance < 1e-12) return { longitude: lon, latitude: lat };
  const angle = distance / radius;
  const tangent = {
    x: (eastAxis.x * east + northAxis.x * north) / distance,
    y: (eastAxis.y * east + northAxis.y * north) / distance,
    z: (eastAxis.z * east + northAxis.z * north) / distance
  };
  return unitVectorToGeographic({
    x: anchor.x * Math.cos(angle) + tangent.x * Math.sin(angle),
    y: anchor.y * Math.cos(angle) + tangent.y * Math.sin(angle),
    z: anchor.z * Math.cos(angle) + tangent.z * Math.sin(angle)
  });
}


/** Geographic point that moves to the screen centre after a globe drag. */
export function planetFocusAtScreenCentre(focus,yaw,pitch){
  if(!focus||!finite(focus.longitude,focus.latitude,yaw,pitch))throw new RangeError('A finite focus and orbit angles are required.');
  const lon=wrapLongitude(focus.longitude),lat=clampLatitude(focus.latitude);
  const east={x:Math.cos(lon),y:0,z:-Math.sin(lon)};
  const north={x:-Math.sin(lat)*Math.sin(lon),y:Math.cos(lat),z:-Math.sin(lat)*Math.cos(lon)};
  const up=geographicToUnitVector(lon,lat),cp=Math.cos(pitch),sp=Math.sin(pitch),cy=Math.cos(yaw),sy=Math.sin(yaw);
  const x=-cp*sy,y=sp,z=cp*cy;
  return unitVectorToGeographic({
    x:east.x*x+north.x*y+up.x*z,
    y:east.y*x+north.y*y+up.y*z,
    z:east.z*x+north.z*y+up.z*z
  });
}

/** Great-circle distance in metres between two geographic positions. */
export function greatCircleDistance(a, b, radius) {
  if (!a || !b || !finite(a.longitude, a.latitude, b.longitude, b.latitude, radius) || radius <= 0) {
    throw new RangeError('positions and positive radius must be finite.');
  }
  const va = geographicToUnitVector(a.longitude, a.latitude);
  const vb = geographicToUnitVector(b.longitude, b.latitude);
  const cross = Math.hypot(va.y * vb.z - va.z * vb.y, va.z * vb.x - va.x * vb.z, va.x * vb.y - va.y * vb.x);
  const dot = clamp(va.x * vb.x + va.y * vb.y + va.z * vb.z, -1, 1);
  return Math.atan2(cross, dot) * radius;
}

/**
 * Stable orbit pose around a target. Yaw is around world-up; pitch is clamped
 * away from the poles to avoid a singular camera-up vector.
 */
export function orbitCameraPose({ target, yaw, pitch, distance, minDistance = 0.01, maxDistance = Infinity }) {
  if (!target || !finite(target.x, target.y, target.z, yaw, pitch, distance, minDistance) ||
      distance <= 0 || minDistance <= 0 || maxDistance <= 0) {
    throw new RangeError('orbit target and camera parameters must be finite and distance positive.');
  }
  const d = clamp(distance, minDistance, maxDistance);
  const p = clamp(pitch, -Math.PI * 0.495, Math.PI * 0.495);
  const horizontal = Math.cos(p) * d;
  return Object.freeze({
    position: Object.freeze({
      x: target.x + Math.sin(yaw) * horizontal,
      y: target.y + Math.sin(p) * d,
      z: target.z + Math.cos(yaw) * horizontal
    }),
    target: Object.freeze({ x: target.x, y: target.y, z: target.z }),
    distance: d,
    yaw: wrapLongitude(yaw),
    pitch: p
  });
}

/** Spherically interpolate from a radial planetary view to the authored local camera pose. */
export function blendCameraToLocalSurface({target,localPosition,blend}){
  if(!target||!localPosition||!finite(target.x,target.y,target.z,localPosition.x,localPosition.y,localPosition.z,blend))throw new RangeError('Camera pose inputs must be finite.');
  const offset={x:localPosition.x-target.x,y:localPosition.y-target.y,z:localPosition.z-target.z};
  const distance=Math.hypot(offset.x,offset.y,offset.z);
  if(distance<1e-9)throw new RangeError('Camera must remain offset from its target.');
  const end={x:offset.x/distance,y:offset.y/distance,z:offset.z/distance};
  const start={x:0,y:1,z:0},dot=clamp(end.y,-1,1),angle=Math.acos(dot),t=clamp(blend,0,1);
  let direction;
  if(angle<1e-8)direction=start;
  else if(Math.abs(Math.sin(angle))<1e-8)direction={x:end.x*t,y:Math.cos(Math.PI*t),z:end.z*t};
  else{
    const a=Math.sin((1-t)*angle)/Math.sin(angle),b=Math.sin(t*angle)/Math.sin(angle);
    direction={x:start.x*a+end.x*b,y:start.y*a+end.y*b,z:start.z*a+end.z*b};
  }
  return Object.freeze({x:target.x+direction.x*distance,y:target.y+direction.y*distance,z:target.z+direction.z*distance,elevation:direction.y,distance});
}

/** Select planetary/local presentation tier from zoom relative to planet fit. */
export function classifyPlanetaryZoom(relativeZoom) {
  if (!Number.isFinite(relativeZoom) || relativeZoom <= 0) {
    throw new RangeError('relativeZoom must be finite and positive.');
  }
  if (relativeZoom < 0.18) return 'planet';
  if (relativeZoom < 1.8) return 'ocean';
  if (relativeZoom < 4) return 'geology';
  return 'ecology';
}

/** Inverse of localTangentToGeographic: spherical log-map into local metres. */
export function geographicToLocalTangent(anchor, position, radius) {
  if (!anchor || !position || !finite(anchor.longitude,anchor.latitude,position.longitude,position.latitude,radius) || radius<=0) throw new RangeError('anchor, position and positive radius must be finite.');
  const a=geographicToUnitVector(anchor.longitude,anchor.latitude),b=geographicToUnitVector(position.longitude,position.latitude);
  const dot=clamp(a.x*b.x+a.y*b.y+a.z*b.z,-1,1),angle=Math.acos(dot),sine=Math.sin(angle);
  if(angle<1e-12)return {east:0,north:0};
  if(Math.abs(sine)<1e-10)throw new RangeError('antipodal position has no unique local tangent offset.');
  const tangent={x:(b.x-dot*a.x)/sine,y:(b.y-dot*a.y)/sine,z:(b.z-dot*a.z)/sine};
  const lon=wrapLongitude(anchor.longitude),lat=clampLatitude(anchor.latitude);
  const eastAxis={x:Math.cos(lon),y:0,z:-Math.sin(lon)},northAxis={x:-Math.sin(lat)*Math.sin(lon),y:Math.cos(lat),z:-Math.sin(lat)*Math.cos(lon)};
  return {east:radius*angle*(tangent.x*eastAxis.x+tangent.y*eastAxis.y+tangent.z*eastAxis.z),north:radius*angle*(tangent.x*northAxis.x+tangent.y*northAxis.y+tangent.z*northAxis.z)};
}
/** Stable geographic frame for the existing flat local habitat. */
export function createPlanetaryWorldFrame({anchor={longitude:0,latitude:0},radius}) {
  if(!anchor||!finite(anchor.longitude,anchor.latitude,radius)||radius<=0)throw new RangeError('A finite geographic anchor and positive planet radius are required.');
  const fixedAnchor=Object.freeze({longitude:wrapLongitude(anchor.longitude),latitude:clampLatitude(anchor.latitude)});
  return Object.freeze({
    anchor:fixedAnchor,radius,
    localToGeographic(east,north){return localTangentToGeographic(fixedAnchor,east,north,radius);},
    geographicToLocal(position){return geographicToLocalTangent(fixedAnchor,position,radius);},
    localToUnitVector(east,north){const p=localTangentToGeographic(fixedAnchor,east,north,radius);return geographicToUnitVector(p.longitude,p.latitude);}
  });
}
