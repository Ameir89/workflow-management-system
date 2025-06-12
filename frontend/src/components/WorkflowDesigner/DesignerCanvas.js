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
      zoom,
      panOffset,
      onSelectNode,
      onUpdateNode,
      onDeleteNode,
      onAddTransition,
      onDeleteTransition,
      onPan,
      onAddNode, // Added this prop
    },
    ref
  ) => {
    const { t } = useTranslation();
    const canvasRef = useRef(null);
    const [isPanning, setIsPanning] = useState(false);
    const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
    const [connectionMode, setConnectionMode] = useState(false);
    const [connectionStart, setConnectionStart] = useState(null);

    // Drop target for new nodes
    const [{ isOver }, drop] = useDrop({
      accept: "workflow-node",
      drop: (item, monitor) => {
        const offset = monitor.getClientOffset();
        const canvasRect = canvasRef.current.getBoundingClientRect();

        const position = {
          x: (offset.x - canvasRect.left - panOffset.x) / zoom,
          y: (offset.y - canvasRect.top - panOffset.y) / zoom,
        };

        // This should now work correctly
        onAddNode(item.nodeType, position);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
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
        if (e.target === canvasRef.current) {
          setIsPanning(true);
          setLastPanPoint({ x: e.clientX, y: e.clientY });
          onSelectNode(null); // Deselect any node when starting a pan
        }
      },
      [onSelectNode]
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
        } else if (e.key === "Delete" && selectedNode) {
          onDeleteNode(selectedNode.id);
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [selectedNode, onDeleteNode, onSelectNode, handleCancelConnection]);

    // Render connection lines between nodes
    const renderConnections = () => {
      const transitions = workflow.definition.transitions || [];
      const steps = workflow.definition.steps || [];

      return transitions.map((transition) => {
        const fromStep = steps.find((s) => s.id === transition.from);
        const toStep = steps.find((s) => s.id === transition.to);

        if (!fromStep || !toStep) return null;

        return (
          <ConnectionLine
            key={transition.id}
            id={transition.id}
            from={fromStep.position}
            to={toStep.position}
            condition={transition.condition}
            selected={false} // You might want to enhance this to select connections
            onDelete={() => onDeleteTransition(transition.id)}
            zoom={zoom}
          />
        );
      });
    };

    const canvasStyle = {
      transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${
        panOffset.y / zoom
      }px)`,
      transformOrigin: "0 0",
      cursor: isPanning ? "grabbing" : connectionMode ? "crosshair" : "grab",
    };

    return (
      <div
        ref={combinedRef}
        className={`designer-canvas ${isOver ? "drop-target" : ""}`}
        onMouseDown={handleMouseDown}
      >
        <div className="canvas-content" style={canvasStyle}>
          {/* Grid background */}
          <div className="canvas-grid" />

          {/* Connection lines rendered as SVG */}
          <svg className="connections-layer">{renderConnections()}</svg>

          {/* Workflow nodes */}
          {workflow.definition.steps?.map((step) => (
            <WorkflowNode
              key={step.id}
              step={step}
              selected={selectedNode?.id === step.id}
              connectionMode={connectionMode}
              connectionStart={connectionStart}
              onSelect={() => onSelectNode(step)}
              onUpdate={(updates) => onUpdateNode(step.id, updates)}
              onDelete={() => onDeleteNode(step.id)}
              onStartConnection={handleStartConnection}
              onEndConnection={handleEndConnection}
              zoom={zoom}
            />
          ))}

          {/* UI Indicator for when connection mode is active */}
          {connectionMode && (
            <div className="connection-indicator">
              <p>
                {t("designer.connectingFrom")}{" "}
                <strong>{connectionStart}</strong>
              </p>
              <p>{t("designer.clickTargetNode")}</p>
              <button
                onClick={handleCancelConnection}
                className="btn btn-secondary btn-sm"
              >
                {t("common.cancel")}
              </button>
            </div>
          )}
        </div>

        {/* UI Indicator for when dragging a new node over the canvas */}
        {isOver && (
          <div className="drop-indicator">
            <p>{t("designer.dropNodeHere")}</p>
          </div>
        )}
      </div>
    );
  }
);

DesignerCanvas.displayName = "DesignerCanvas";

export default DesignerCanvas;
