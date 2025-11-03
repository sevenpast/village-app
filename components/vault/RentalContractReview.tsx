'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface ContractReviewResult {
  review_status: 'standard' | 'issues' | 'red_flags'
  summary: string
  findings: string[]
  extracted_data?: {
    monthly_rent?: number
    deposit?: number
    notice_period?: number
    monthly_costs?: number
    start_date?: string
  }
}

export default function RentalContractReview() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [reviewResult, setReviewResult] = useState<ContractReviewResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
        setError('Please upload a PDF or image file')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10 MB')
        return
      }
      setUploadedFile(file)
      setReviewResult(null)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!uploadedFile) return

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('contract_file', uploadedFile)

      const response = await fetch('/api/housing/contract-review', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to review contract')
      }

      const result = await response.json()
      setReviewResult(result)
    } catch (err) {
      console.error('Contract review error:', err)
      setError(err instanceof Error ? err.message : 'Failed to review contract')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setUploadedFile(null)
    setReviewResult(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getStatusIcon = () => {
    if (!reviewResult) return null
    switch (reviewResult.review_status) {
      case 'standard':
        return <CheckCircle className="w-6 h-6 text-green-500" />
      case 'issues':
        return <AlertCircle className="w-6 h-6 text-yellow-500" />
      case 'red_flags':
        return <AlertCircle className="w-6 h-6 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = () => {
    if (!reviewResult) return ''
    switch (reviewResult.review_status) {
      case 'standard':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'issues':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'red_flags':
        return 'bg-red-50 border-red-200 text-red-800'
      default:
        return ''
    }
  }

  const getStatusText = () => {
    if (!reviewResult) return ''
    switch (reviewResult.review_status) {
      case 'standard':
        return 'Standard Contract'
      case 'issues':
        return 'Review Required'
      case 'red_flags':
        return 'Red Flags Detected'
      default:
        return ''
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2" style={{ color: '#2D5016' }}>
          Review Your Rental Contract
        </h3>
        <p className="text-gray-600">
          Upload a rental contract to get an AI-powered review. Your contract will be analyzed but not saved.
        </p>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-lg border p-6" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8" style={{ borderColor: '#D1D5DB' }}>
          <FileText className="w-12 h-12 text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">
            {uploadedFile ? uploadedFile.name : 'Select a PDF or image file'}
          </p>
          <div className="flex gap-3">
            <label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer hover:opacity-90"
                style={{ backgroundColor: '#2D5016', color: '#FFFFFF' }}
              >
                <Upload className="w-4 h-4" />
                {uploadedFile ? 'Change File' : 'Select File'}
              </span>
            </label>
            {uploadedFile && (
              <>
                <button
                  onClick={handleUpload}
                  disabled={loading}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    loading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                  }`}
                  style={{ backgroundColor: '#F2B75B', color: '#FFFFFF' }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Reviewing...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Review Contract
                    </>
                  )}
                </button>
                <button
                  onClick={handleClear}
                  className="px-4 py-2 rounded-lg font-medium transition-colors border"
                  style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Maximum file size: 10 MB. Supported formats: PDF, JPG, PNG
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Review Results */}
      {reviewResult && (
        <div className={`bg-white rounded-lg border p-6 ${getStatusColor()}`}>
          <div className="flex items-center gap-3 mb-4">
            {getStatusIcon()}
            <h4 className="text-xl font-bold">{getStatusText()}</h4>
          </div>

          {/* Summary */}
          <div className="mb-6">
            <h5 className="font-semibold mb-2" style={{ color: '#2D5016' }}>Summary</h5>
            <p className="text-sm whitespace-pre-wrap">{reviewResult.summary}</p>
          </div>

          {/* Findings */}
          {reviewResult.findings && reviewResult.findings.length > 0 && (
            <div className="mb-6">
              <h5 className="font-semibold mb-2" style={{ color: '#2D5016' }}>Findings</h5>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {reviewResult.findings.map((finding, index) => (
                  <li key={index}>{finding}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Extracted Data */}
          {reviewResult.extracted_data && (
            <div>
              <h5 className="font-semibold mb-2" style={{ color: '#2D5016' }}>Extracted Information</h5>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {reviewResult.extracted_data.monthly_rent !== undefined && (
                  <div>
                    <p className="text-gray-600">Monthly Rent</p>
                    <p className="font-medium">CHF {reviewResult.extracted_data.monthly_rent.toLocaleString()}</p>
                  </div>
                )}
                {reviewResult.extracted_data.monthly_costs !== undefined && (
                  <div>
                    <p className="text-gray-600">Monthly Costs</p>
                    <p className="font-medium">CHF {reviewResult.extracted_data.monthly_costs.toLocaleString()}</p>
                  </div>
                )}
                {reviewResult.extracted_data.deposit !== undefined && (
                  <div>
                    <p className="text-gray-600">Deposit</p>
                    <p className="font-medium">CHF {reviewResult.extracted_data.deposit.toLocaleString()}</p>
                  </div>
                )}
                {reviewResult.extracted_data.notice_period !== undefined && (
                  <div>
                    <p className="text-gray-600">Notice Period</p>
                    <p className="font-medium">{reviewResult.extracted_data.notice_period} months</p>
                  </div>
                )}
                {reviewResult.extracted_data.start_date && (
                  <div>
                    <p className="text-gray-600">Start Date</p>
                    <p className="font-medium">{new Date(reviewResult.extracted_data.start_date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This review is for informational purposes only. Your contract has not been saved.
              Please consult with a legal professional for any contractual decisions.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

