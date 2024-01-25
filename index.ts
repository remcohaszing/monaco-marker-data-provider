import { type editor, type IDisposable, type languages, type MonacoEditor } from 'monaco-types'

export interface MarkerDataProvider {
  /**
   * The owner of the model markers.
   *
   * This should be a unique string that identifies the context of who owns the marker data.
   */
  owner: string

  /**
   * Provide marker data for the given model.
   *
   * @param model
   *   The model to provide marker data for.
   * @returns
   *   The new marker data for the model.
   */
  provideMarkerData: (model: editor.ITextModel) => languages.ProviderResult<editor.IMarkerData[]>

  /**
   * Reset the state for a model.
   *
   * @param model
   *   The model to reset the state for.
   */
  doReset?: (model: editor.ITextModel) => void
}

/**
 * Register a marker data provider that can provide marker data for a model.
 *
 * @param monaco
 *   The Monaco editor module.
 * @param languageSelector
 *   The language id to register the provider for.
 * @param provider
 *   The provider that can provide marker data.
 * @returns
 *   A disposable.
 */
export function registerMarkerDataProvider(
  monaco: Pick<MonacoEditor, 'editor'>,
  languageSelector: string[] | string,
  provider: MarkerDataProvider
): IDisposable {
  const listeners = new Map<editor.ITextModel, IDisposable>()

  const matchesLanguage = (model: editor.ITextModel): boolean => {
    if (languageSelector === '*') {
      return true
    }
    const languageId = model.getLanguageId()
    return Array.isArray(languageSelector)
      ? languageSelector.includes(languageId)
      : languageSelector === languageId
  }

  const doValidate = async (model: editor.ITextModel): Promise<void> => {
    const markers = await provider.provideMarkerData(model)
    // The model have have been disposed by the time marker data has been fetched.
    if (!model.isDisposed() && matchesLanguage(model)) {
      monaco.editor.setModelMarkers(model, provider.owner, markers ?? [])
    }
  }

  const onModelAdd = (model: editor.ITextModel): void => {
    if (!matchesLanguage(model)) {
      return
    }

    let handle: ReturnType<typeof setTimeout>
    listeners.set(
      model,
      model.onDidChangeContent(() => {
        clearTimeout(handle)
        handle = setTimeout(() => {
          doValidate(model)
        }, 500)
      })
    )

    doValidate(model)
  }

  const onModelRemoved = (model: editor.ITextModel): void => {
    monaco.editor.setModelMarkers(model, provider.owner, [])
    const listener = listeners.get(model)
    if (listener) {
      listener.dispose()
      listeners.delete(model)
    }
  }

  const disposables = [
    monaco.editor.onDidCreateModel(onModelAdd),
    monaco.editor.onWillDisposeModel((model) => {
      onModelRemoved(model)
      provider.doReset?.(model)
    }),
    monaco.editor.onDidChangeModelLanguage((event) => {
      onModelRemoved(event.model)
      onModelAdd(event.model)
      provider.doReset?.(event.model)
    })
  ]

  for (const model of monaco.editor.getModels()) {
    onModelAdd(model)
  }

  return {
    dispose() {
      for (const model of listeners.keys()) {
        onModelRemoved(model)
      }
      while (disposables.length) {
        disposables.pop()!.dispose()
      }
    }
  }
}
