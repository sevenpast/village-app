'use client'

import { useState } from 'react'

export default function ReprocessDocumentsPage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<any>(null)

  const handleReprocess = async () => {
    setIsProcessing(true)
    setResults(null)

    try {
      const response = await fetch('/api/documents/reprocess-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      setResults(data)
    } catch (error) {
      setResults({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-lg font-medium text-gray-900 mb-4">
            Document Reprocessing Tool
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            This will reprocess all your PDF documents with the fixed OCR system to extract text.
          </p>

          <button
            onClick={handleReprocess}
            disabled={isProcessing}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Reprocess All Documents'}
          </button>

          {results && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Results:</h3>
              <div className="bg-gray-50 rounded-md p-4">
                {results.success ? (
                  <div>
                    <p className="text-sm text-green-600 font-medium">
                      ✅ {results.message}
                    </p>
                    {results.results && (
                      <div className="mt-4 space-y-2">
                        {results.results.map((result: any) => (
                          <div key={result.id} className="text-xs">
                            <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                              {result.success ? '✅' : '❌'}
                            </span>{' '}
                            <span className="font-mono">{result.file_name}</span>
                            {result.success && (
                              <span className="text-gray-500 ml-2">
                                ({result.text_length} chars)
                              </span>
                            )}
                            {!result.success && result.error && (
                              <div className="text-red-500 text-xs ml-4">
                                Error: {result.error}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-red-600">
                    ❌ Error: {results.error}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}