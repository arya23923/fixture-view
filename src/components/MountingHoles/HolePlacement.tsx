/**
 * HolePlacement Component
 *
 * Handles the interactive placement of mounting holes on the baseplate.
 * Uses raycasting to determine placement position on XZ plane.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import type { PlacedHole, HoleConfig } from './types';
import HoleMesh from './HoleMesh';

// =============================================================================
// Types
// =============================================================================

interface HolePlacementProps {
  /** Whether placement mode is active */
  active: boolean;
  /** The hole configuration to place */
  holeConfig: HoleConfig | null;
  /** Depth of the hole (baseplate height for through holes) */
  depth: number;
  /** Y position of baseplate top */
  baseTopY: number;
  /** Callback when hole is placed */
  onPlace: (hole: PlacedHole) => void;
  /** Callback to cancel placement */
  onCancel: () => void;
  /** Optional raycast target (baseplate mesh) */
  baseTarget?: THREE.Object3D | null;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generates a unique hole ID using timestamp and random string.
 */
function generateHoleId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `hole-${timestamp}-${random}`;
}

/**
 * Converts mouse event to normalized device coordinates (NDC).
 */
function getNormalizedMouseCoords(
  event: PointerEvent,
  canvas: HTMLCanvasElement
): THREE.Vector2 {
  const rect = canvas.getBoundingClientRect();
  return new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
}

/**
 * Checks if an event target is a UI element that should block placement.
 */
function isUIElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.closest('.ui-panel') !== null;
}

// =============================================================================
// Custom Hook - Raycasting
// =============================================================================

/**
 * Hook that handles raycasting for hole placement.
 * Returns the current preview position based on mouse location.
 */
function useHoleRaycasting(
  active: boolean,
  baseTopY: number,
  baseTarget: THREE.Object3D | null | undefined,
  camera: THREE.Camera,
  canvas: HTMLCanvasElement
): [THREE.Vector2 | null, (event: PointerEvent) => void] {
  const [previewPosition, setPreviewPosition] = useState<THREE.Vector2 | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), -baseTopY));
  const hitPointRef = useRef(new THREE.Vector3());

  // Update plane when baseTopY changes
  useEffect(() => {
    planeRef.current.constant = -baseTopY;
  }, [baseTopY]);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!active) return;

    const mouse = getNormalizedMouseCoords(event, canvas);
    raycasterRef.current.setFromCamera(mouse, camera);

    // Try to hit baseplate first for accurate placement
    if (baseTarget) {
      const intersects = raycasterRef.current.intersectObject(baseTarget, true);
      if (intersects.length > 0) {
        const { point } = intersects[0];
        setPreviewPosition(new THREE.Vector2(point.x, point.z));
        return;
      }
    }

    // Fallback to plane intersection when not hitting baseplate
    if (raycasterRef.current.ray.intersectPlane(planeRef.current, hitPointRef.current)) {
      setPreviewPosition(new THREE.Vector2(hitPointRef.current.x, hitPointRef.current.z));
    }
  }, [active, camera, canvas, baseTarget]);

  // Clear preview when deactivated
  useEffect(() => {
    if (!active) {
      setPreviewPosition(null);
    }
  }, [active]);

  return [previewPosition, handlePointerMove];
}

// =============================================================================
// Main Component
// =============================================================================

const HolePlacement: React.FC<HolePlacementProps> = ({
  active,
  holeConfig,
  depth,
  baseTopY,
  onPlace,
  onCancel,
  baseTarget,
}) => {
  const { gl, camera } = useThree();

  // Use custom raycasting hook
  const [previewPosition, handlePointerMove] = useHoleRaycasting(
    active && holeConfig !== null,
    baseTopY,
    baseTarget,
    camera,
    gl.domElement
  );

  // Handle click to place hole
  const handleClick = useCallback((event: MouseEvent) => {
    if (!active || !holeConfig || !previewPosition) return;
    if (isUIElement(event.target)) return;

    const placedHole: PlacedHole = {
      ...holeConfig,
      id: generateHoleId(),
      position: previewPosition.clone(),
      depth,
    };

    onPlace(placedHole);
  }, [active, holeConfig, previewPosition, depth, onPlace]);

  // Handle escape key to cancel placement
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && active) {
      onCancel();
    }
  }, [active, onCancel]);

  // Set up event listeners
  useEffect(() => {
    if (!active) return undefined;

    const canvas = gl.domElement;
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    canvas.style.cursor = 'crosshair';

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
      canvas.style.cursor = 'auto';
    };
  }, [active, gl, handlePointerMove, handleClick, handleKeyDown]);

  // Don't render if not active, no config, or no preview position
  if (!active || !holeConfig || !previewPosition) {
    return null;
  }

  // Create preview hole for rendering
  const previewHole: PlacedHole = {
    ...holeConfig,
    id: 'preview',
    position: previewPosition,
    depth,
  };

  return (
    <HoleMesh
      hole={previewHole}
      baseTopY={baseTopY}
      isPreview
    />
  );
};

export default HolePlacement;
