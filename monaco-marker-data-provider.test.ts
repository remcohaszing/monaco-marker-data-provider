import * as monaco from 'monaco-editor-core/esm/vs/editor/editor.api.js'
import { registerMarkerDataProvider } from 'monaco-marker-data-provider'
import { afterEach, expect, test } from 'vitest'

let disposable: monaco.IDisposable | undefined

afterEach(() => {
  disposable?.dispose()
  for (const model of monaco.editor.getModels()) {
    model.dispose()
  }
})

function provideMarkerData(model: monaco.editor.ITextModel): monaco.editor.IMarkerData[] {
  const value = model.getValue()
  const index = value.indexOf('bad')
  if (index === -1) {
    return []
  }
  const start = model.getPositionAt(index)
  const end = model.getPositionAt(index + 3)
  return [
    {
      endColumn: end.column,
      endLineNumber: end.lineNumber,
      message: 'test message',
      severity: monaco.MarkerSeverity.Error,
      startColumn: start.column,
      startLineNumber: start.lineNumber
    }
  ]
}

function waitForMarkers(fn: () => void): Promise<monaco.editor.IMarker[]> {
  const markersPromise = new Promise<monaco.editor.IMarker[]>((resolve) => {
    const markerChangeListener = monaco.editor.onDidChangeMarkers(() => {
      markerChangeListener.dispose()
      resolve(monaco.editor.getModelMarkers({}))
    })
    setTimeout(() => {
      markerChangeListener.dispose()
      resolve([])
    }, 1000)
  })
  fn()
  return markersPromise
}

test('provide marker data when a model is created', async () => {
  disposable = registerMarkerDataProvider(monaco, '*', {
    owner: 'test',
    provideMarkerData
  })

  const uri = monaco.Uri.parse('file:///test.txt')
  const markers = await waitForMarkers(() => {
    monaco.editor.createModel('bad', '', uri)
  })
  expect(markers).toStrictEqual([
    {
      code: undefined,
      endColumn: 4,
      endLineNumber: 1,
      message: 'test message',
      owner: 'test',
      relatedInformation: undefined,
      resource: uri,
      severity: monaco.MarkerSeverity.Error,
      source: undefined,
      startColumn: 1,
      startLineNumber: 1,
      tags: undefined
    }
  ])
})

test('provide marker data for pre-existing models', async () => {
  const uri = monaco.Uri.parse('file:///test.txt')
  monaco.editor.createModel('bad', '', uri)

  const markers = await waitForMarkers(() => {
    disposable = registerMarkerDataProvider(monaco, '*', {
      owner: 'test',
      provideMarkerData
    })
  })

  expect(markers).toStrictEqual([
    {
      code: undefined,
      endColumn: 4,
      endLineNumber: 1,
      message: 'test message',
      owner: 'test',
      relatedInformation: undefined,
      resource: uri,
      severity: monaco.MarkerSeverity.Error,
      source: undefined,
      startColumn: 1,
      startLineNumber: 1,
      tags: undefined
    }
  ])
})

test('provide marker data for updated models', async () => {
  const uri = monaco.Uri.parse('file:///test.txt')
  const model = monaco.editor.createModel('', '', uri)

  await waitForMarkers(() => {
    disposable = registerMarkerDataProvider(monaco, '*', {
      owner: 'test',
      provideMarkerData
    })
  })
  const markers = await waitForMarkers(() => {
    model.setValue('bad')
  })

  expect(markers).toStrictEqual([
    {
      code: undefined,
      endColumn: 4,
      endLineNumber: 1,
      message: 'test message',
      owner: 'test',
      relatedInformation: undefined,
      resource: uri,
      severity: monaco.MarkerSeverity.Error,
      source: undefined,
      startColumn: 1,
      startLineNumber: 1,
      tags: undefined
    }
  ])
})

test('clear marker data for disposed models', async () => {
  const uri = monaco.Uri.parse('file:///test.txt')
  const model = monaco.editor.createModel('bad', '', uri)

  await waitForMarkers(() => {
    disposable = registerMarkerDataProvider(monaco, '*', {
      owner: 'test',
      provideMarkerData
    })
  })
  const markers = await waitForMarkers(() => {
    model.dispose()
  })

  expect(markers).toStrictEqual([])
})

test('provide marker data if the model language changes', async () => {
  const uri = monaco.Uri.parse('file:///test.bla')
  monaco.editor.createModel('bad', undefined, uri)

  await waitForMarkers(() => {
    disposable = registerMarkerDataProvider(monaco, 'bla', {
      owner: 'test',
      provideMarkerData
    })
  })

  const markers = await waitForMarkers(() => {
    monaco.languages.register({ id: 'bla', extensions: ['.bla'] })
  })

  expect(markers).toStrictEqual([
    {
      code: undefined,
      endColumn: 4,
      endLineNumber: 1,
      message: 'test message',
      owner: 'test',
      relatedInformation: undefined,
      resource: uri,
      severity: monaco.MarkerSeverity.Error,
      source: undefined,
      startColumn: 1,
      startLineNumber: 1,
      tags: undefined
    }
  ])
})

test('language filter string match', async () => {
  const uri = monaco.Uri.parse('file:///test.txt')
  monaco.editor.createModel('bad', 'plaintext', uri)

  const markers = await waitForMarkers(() => {
    disposable = registerMarkerDataProvider(monaco, 'plaintext', {
      owner: 'test',
      provideMarkerData
    })
  })

  expect(markers).toStrictEqual([
    {
      code: undefined,
      endColumn: 4,
      endLineNumber: 1,
      message: 'test message',
      owner: 'test',
      relatedInformation: undefined,
      resource: uri,
      severity: monaco.MarkerSeverity.Error,
      source: undefined,
      startColumn: 1,
      startLineNumber: 1,
      tags: undefined
    }
  ])
})

test('language filter string mismatch', async () => {
  const uri = monaco.Uri.parse('file:///test.txt')
  monaco.editor.createModel('bad', 'plaintext', uri)

  const markers = await waitForMarkers(() => {
    disposable = registerMarkerDataProvider(monaco, 'notplaintext', {
      owner: 'test',
      provideMarkerData
    })
  })

  expect(markers).toStrictEqual([])
})

test('language filter array match', async () => {
  const uri = monaco.Uri.parse('file:///test.txt')
  monaco.editor.createModel('bad', 'plaintext', uri)

  const markers = await waitForMarkers(() => {
    disposable = registerMarkerDataProvider(monaco, ['plaintext'], {
      owner: 'test',
      provideMarkerData
    })
  })

  expect(markers).toStrictEqual([
    {
      code: undefined,
      endColumn: 4,
      endLineNumber: 1,
      message: 'test message',
      owner: 'test',
      relatedInformation: undefined,
      resource: uri,
      severity: monaco.MarkerSeverity.Error,
      source: undefined,
      startColumn: 1,
      startLineNumber: 1,
      tags: undefined
    }
  ])
})

test('language filter array mismatch', async () => {
  const uri = monaco.Uri.parse('file:///test.txt')
  monaco.editor.createModel('bad', 'plaintext', uri)

  const markers = await waitForMarkers(() => {
    disposable = registerMarkerDataProvider(monaco, ['notplaintext'], {
      owner: 'test',
      provideMarkerData
    })
  })

  expect(markers).toStrictEqual([])
})
