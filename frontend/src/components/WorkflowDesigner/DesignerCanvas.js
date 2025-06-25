// Fixed DesignerCanvas.js with proper pointer events for transitions
import { forwardRef, useCallback, useRef, useState, useEffect } from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import WorkflowNode from "./WorkflowNode";
import ConnectionLine from "./ConnectionLine";
import "./DesignerCanvas.css";

const DesignerCanvas = forwardRef(
  (
    {
      workflow,
      selectedNode,
      selectedTransition,
      zoom,
      panOffset,
      onSelectNode,
      onSelectTransition,
      onUpdateNode,
      onDeleteNode,
      onAddTransition,
      onUpdateTransition,
      onDeleteTransition,
      onPan,
      onAddNode,
    },
    ref
  ) => {
    const { t } = useTranslation();
    const canvasRef = useRef(null);
    const [isPanning, setIsPanning] = useState(false);
    const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
    const [connectionMode, setConnectionMode] = useState(false);
    const [connectionStart, setConnectionStart] = useState(null);

    // Drop target for new nodes only (moving nodes is handled in WorkflowNode)
    const [{ isOver, dragItem }, drop] = useDrop({
      accept: ["workflow-node"],
      drop: (item, monitor) => {
        const offset = monitor.getClientOffset();
        const canvasRect = canvasRef.current.getBoundingClientRect();

        const position = {
          x:
            Math.round((offset.x - canvasRect.left - panOffset.x) / zoom / 20) *
            20,
          y:
            Math.round((offset.y - canvasRect.top - panOffset.y) / zoom / 20) *
            20,
        };

        // Adding new node from palette
        onAddNode(item.nodeType, position);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        dragItem: monitor.getItem(),
      }),
    });

    // Combine refs
    const combinedRef = useCallback(
      (node) => {
        canvasRef.current = node;
        drop(node);
        if (ref) {
          if (typeof ref === "function") {
            ref(node);
          } else {
            ref.current = node;
          }
        }
      },
      [drop, ref]
    );

    // Handle mouse events for panning
    const handleMouseDown = useCallback(
      (e) => {
        // Only pan when clicking on the canvas background
        if (
          e.target === canvasRef.current ||
          e.target.classList.contains("canvas-grid") ||
          e.target.classList.contains("canvas-content")
        ) {
          setIsPanning(true);
          setLastPanPoint({ x: e.clientX, y: e.clientY });
          onSelectNode(null);
          if (onSelectTransition) {
            onSelectTransition(null);
          }
        }
      },
      [onSelectNode, onSelectTransition]
    );

    const handleMouseMove = useCallback(
      (e) => {
        if (isPanning) {
          const deltaX = e.clientX - lastPanPoint.x;
          const deltaY = e.clientY - lastPanPoint.y;

          onPan(deltaX, deltaY);
          setLastPanPoint({ x: e.clientX, y: e.clientY });
        }
      },
      [isPanning, lastPanPoint, onPan]
    );

    const handleMouseUp = useCallback(() => {
      setIsPanning(false);
    }, []);

    // Add event listeners for panning
    useEffect(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.addEventListener("mousemove", handleMouseMove);
        canvas.addEventListener("mouseup", handleMouseUp);
        canvas.addEventListener("mouseleave", handleMouseUp);

        return () => {
          canvas.removeEventListener("mousemove", handleMouseMove);
          canvas.removeEventListener("mouseup", handleMouseUp);
          canvas.removeEventListener("mouseleave", handleMouseUp);
        };
      }
    }, [handleMouseMove, handleMouseUp]);

    // Handle node connection logic
    const handleStartConnection = useCallback((nodeId) => {
      setConnectionMode(true);
      setConnectionStart(nodeId);
    }, []);

    const handleEndConnection = useCallback(
      (nodeId) => {
        if (connectionMode && connectionStart && connectionStart !== nodeId) {
          onAddTransition(connectionStart, nodeId);
        }
        setConnectionMode(false);
        setConnectionStart(null);
      },
      [connectionMode, connectionStart, onAddTransition]
    );

    const handleCancelConnection = useCallback(() => {
      setConnectionMode(false);
      setConnectionStart(null);
    }, []);

    // Handle keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          handleCancelConnection();
          onSelectNode(null);
          if (onSelectTransition) {
            onSelectTransition(null);
          }
        } else if (e.key === "Delete") {
          if (selectedNode) {
            onDeleteNode(selectedNode.id);
          } else if (selectedTransition) {
            onDeleteTransition(selectedTransition.id);
          }
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [
      selectedNode,
      selectedTransition,
      onDeleteNode,
      onDeleteTransition,
      onSelectNode,
      onSelectTransition,
      handleCancelConnection,
    ]);

    // Handle transition selection
    const handleTransitionSelect = useCallback(
      (transition) => {
        onSelectNode(null); // Clear node selection
        onSelectTransition(transition); // Set transition selection
      },
      [onSelectNode, onSelectTransition]
    );

    // Render connection lines between nodes
    const renderConnections = () => {
      const transitions = workflow.definition?.transitions || [];
      const steps = workflow.definition?.steps || [];

      return transitions.map((transition) => {
        const fromStep = steps.find((s) => s.id === transition.from);
        const toStep = steps.find((s) => s.id === transition.to);

        if (!fromStep || !toStep) return null;

        return (
          <ConnectionLine
            key={transition.id}
            id={transition.id}
            transition={transition}
            from={fromStep.position}
            to={toStep.position}
            selected={selectedTransition?.id === transition.id}
            onDelete={() => onDeleteTransition(transition.id)}
            onSelect={handleTransitionSelect}
            zoom={zoom}
          />
        );
      });
    };

    // Generate grid pattern
    const generateGridPattern = () => {
      const gridSize = 20;
      const scaledGridSize = gridSize * zoom;
      const offsetX = panOffset.x % scaledGridSize;
      const offsetY = panOffset.y % scaledGridSize;

      return {
        backgroundSize: `${scaledGridSize}px ${scaledGridSize}px`,
        backgroundPosition: `${offsetX}px ${offsetY}px`,
      };
    };

    const canvasStyle = {
      transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${
        panOffset.y / zoom
      }px)`,
      transformOrigin: "0 0",
    };

    const isDropping = isOver && dragItem;

    return (
      <div
        ref={combinedRef}
        className={`designer-canvas ${isDropping ? "drop-target" : ""} ${
          connectionMode ? "connection-mode" : ""
        }`}
        style={{
          cursor: isPanning
            ? "grabbing"
            : connectionMode
            ? "crosshair"
            : isDropping
            ? "copy"
            : "grab",
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Grid background */}
        <div className="canvas-grid" style={generateGridPattern()} />

        {/* Content layer */}
        <div className="canvas-content" style={canvasStyle}>
          {/* Connection lines rendered as SVG - THIS IS THE KEY FIX */}
          <svg
            className="connections-layer"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              overflow: "visible",
              pointerEvents: "auto", // Changed from "none" to "auto"
              zIndex: 1, // Ensure it's above the background but below nodes
            }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="10"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#6B7280"
                  stroke="none"
                />
              </marker>
              <marker
                id="arrowhead-selected"
                markerWidth="10"
                markerHeight="7"
                refX="10"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#3B82F6"
                  stroke="none"
                />
              </marker>
            </defs>
            {renderConnections()}
          </svg>

          {/* Workflow nodes */}
          {workflow.definition?.steps?.map((step) => (
            <WorkflowNode
              key={step.id}
              step={step}
              selected={selectedNode?.id === step.id}
              connectionMode={connectionMode}
              connectionStart={connectionStart}
              onSelect={() => onSelectNode(step)}
              onUpdate={onUpdateNode}
              onDelete={() => onDeleteNode(step.id)}
              onStartConnection={handleStartConnection}
              onEndConnection={handleEndConnection}
              zoom={zoom}
            />
          ))}
        </div>

        {/* UI overlays */}
        {connectionMode && (
          <div className="connection-indicator">
            <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
              <p className="text-sm font-medium">
                {t("designer.connectingFrom")}{" "}
                <strong>{connectionStart}</strong>
              </p>
              <p className="text-xs opacity-90">
                {t("designer.clickTargetNode")}
              </p>
              <button
                onClick={handleCancelConnection}
                className="mt-2 px-3 py-1 bg-white text-blue-500 rounded text-xs font-medium hover:bg-gray-100 transition-colors"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        )}

        {isDropping && (
          <div className="drop-indicator">
            <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
              <p className="text-sm font-medium">
                {t("designer.dropNodeHere")}
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {(!workflow.definition?.steps ||
          workflow.definition.steps.length === 0) && (
          <div className="empty-state">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
                <svg
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="w-full h-full"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Start Building Your Workflow
              </h3>
              <p className="text-gray-500 mb-4">
                Drag nodes from the palette to begin designing your workflow
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }
);

DesignerCanvas.displayName = "DesignerCanvas";

export default DesignerCanvas;
