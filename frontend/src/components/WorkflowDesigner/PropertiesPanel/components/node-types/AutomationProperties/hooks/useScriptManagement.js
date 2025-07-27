import { useState } from "react";
import { useQuery } from "react-query";
import { scriptsService } from "../../../../../../../services/scriptsService";

export const useScriptManagement = () => {
  const [showScriptEditor, setShowScriptEditor] = useState(false);
  const [editingScript, setEditingScript] = useState(null);

  const {
    data: scriptsData,
    isLoading: scriptsLoading,
    refetch: refetchScripts,
  } = useQuery(
    ["scripts-for-workflow"],
    () => scriptsService.getScripts({ is_active: true, limit: 100 }),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000,
    }
  );

  const handleCreateNewScript = () => {
    setEditingScript(null);
    setShowScriptEditor(true);
  };

  const handleEditScript = (scriptId) => {
    setEditingScript(scriptId);
    setShowScriptEditor(true);
  };

  const handleScriptEditorClose = (savedScript) => {
    setShowScriptEditor(false);
    setEditingScript(null);

    if (savedScript) {
      refetchScripts();
      return savedScript;
    }
    return null;
  };

  return {
    scriptsData,
    scriptsLoading,
    showScriptEditor,
    editingScript,
    handleCreateNewScript,
    handleEditScript,
    handleScriptEditorClose,
    refetchScripts,
  };
};
