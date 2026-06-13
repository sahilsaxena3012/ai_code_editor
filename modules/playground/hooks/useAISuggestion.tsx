import { editor } from "monaco-editor";
import { useState, useCallback } from "react";

interface AISuggestionState {
  suggestion: string | null;
  isLoading: boolean;
  position: { line: number; column: number } | null;
  decoration: string[];
  isEnabled: boolean;
}

interface useAISuggestionsReturn extends AISuggestionState {
  toggleEnabled: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchSuggestion: (type: string, editor: any) => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  acceptSuggestion: (editor: any, monaco: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rejectSuggestion: (editor: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clearSuggestion: (editor: any) => void;
}

export const useAISuggestions = (): useAISuggestionsReturn => {
  const [state, setState] = useState<AISuggestionState>({
    suggestion: null,
    isLoading: false,
    position: null,
    decoration: [],
    isEnabled: true,
  });

  const toggleEnabled = useCallback(() => {
    setState((prev) => ({ ...prev, isEnabled: !prev.isEnabled }));
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchSuggestion = useCallback(async (type: string, editor: any) => {
    setState((currentState) => {
      if (!currentState.isEnabled) {
        return currentState;
      }

      if (!editor) {
        return currentState;
      }

      const model = editor.getMOdel();
      const cursorPosition = editor.getPosition();

      if (!model || !cursorPosition) {
        return currentState;
      }

      const newState = { ...currentState, isLoading: true };

      (async () => {
        try {
          const payload = {
            fileContent: model.getValue(),
            cursorLine: cursorPosition.lineNumber - 1,
            cursorColumn: cursorPosition.columnNumber - 1,
            suggestionType: type,
          };

          const response = await fetch("/api/code-suggestions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(`API Responded with status ${response.status}`);
          }

          const data = await response.json();

          if (data.suggestion) {
            const suggestionText = data.suggestion.trim();
            setState((prev) => ({
              ...prev,
              suggestion: suggestionText,
              position: {
                line: cursorPosition.lineNumber,
                column: cursorPosition.column,
              },
              isLoading: false,
            }));
          } else {
            console.warn("No suggestion received from API");
            setState((prev) => ({ ...prev, isLoading: false }));
          }
        } catch (error) {
          console.error("Error fetching code suggestion:", error);
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      })();
    });
  }, []);

  const acceptSuggestion = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-expressions
    (editor: any, monaco: any) => {
      setState((currentState) => {
        if (
          !currentState.suggestion ||
          !currentState.position ||
          !editor ||
          !monaco
        ) {
          return currentState;
        }

        const { line, column } = currentState.position;
        const sanitizedSuggestion = currentState.suggestion.replace(
          /^\d+:\s*/gm,
          "",
        );

        editor.executeEdits("", [
          {
            range: new monaco.Range(line, column, line, column),
            text: sanitizedSuggestion,
            forceMoveMarkers: true,
          },
        ]);

        if (editor && currentState.decoration.length > 0) {
          editor.deltaDecorations(currentState.decoration, []);
        }

        return {
          ...currentState,
          suggestion: null,
          position: null,
          decoration: [],
        };
      });
    };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rejectSuggestion = useCallback((editor: any) => {
    setState((currentState) => {
      if (editor && currentState.decoration.length > 0) {
        editor.deltaDecorations(currentState.decoration, []);
      }

      return {
        ...currentState,
        suggestion: null,
        position: null,
        decoration: [],
      };
    });
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clearSuggestion = useCallback((editor: any) => {
    setState((currentState) => {
      if (editor && currentState.decoration.length > 0) {
        editor.deltaDecorations(currentState.decoration, []);
      }

      return {
        ...currentState,
        suggestion: null,
        position: null,
        decoration: [],
      };
    });
  }, []);

  return {
    ...state,
    toggleEnabled,
    fetchSuggestion,
    acceptSuggestion,
    rejectSuggestion,
    clearSuggestion,
  };
};
