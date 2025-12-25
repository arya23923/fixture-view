/**
 * MountingHoles Module
 *
 * Components and utilities for mounting hole placement and visualization.
 *
 * @module MountingHoles
 */

// Components
export { default as HoleMesh } from './HoleMesh';
export { default as HolePlacement } from './HolePlacement';
export { default as HoleTransformControls } from './HoleTransformControls';

// Types
export type {
  HoleType,
  HoleConfig,
  PlacedHole,
  HolePlacementState,
  HoleCSGStatus,
  SerializedHoleGeometry,
} from './types';

// Constants
export { COUNTERSINK_STANDARDS, COUNTERBORE_STANDARDS } from './types';

// Geometry utilities
export {
  createThroughHoleGeometry,
  createCountersinkGeometry,
  createCounterboreGeometry,
  createHoleGeometry,
  positionHoleGeometry,
  createMergedHolesGeometry,
  serializeGeometry,
  deserializeGeometry,
} from './holeGeometry';
